import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import socketManager from './socket';

// STUN ve TURN sunucuları
const servers = {
  iceServers: [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302'
      ]
    },
    {
      urls: 'turn:numb.viagenie.ca',
      credential: 'muazkh',
      username: 'webrtc@live.com'
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

class WebRTCManager {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.isHost = false;
    this.roomId = null;
    this.userId = null;
    this.iceCandidateQueue = [];
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  async initializeMedia(isHost = false) {
    try {
      console.log('🎥 Medya başlatılıyor...');
      
      const constraints = {
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.isHost = isHost;
      
      console.log('✅ Medya başarıyla başlatıldı');
      this.emit('media-ready', { stream: this.localStream });
      
      return this.localStream;
    } catch (error) {
      console.error('❌ Medya başlatma hatası:', error);
      this.emit('error', { message: 'Kamera ve mikrofon erişimi sağlanamadı' });
      throw error;
    }
  }

  createPeerConnection() {
    try {
      console.log('🔌 PeerConnection oluşturuluyor...');
      
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      };

      this.peerConnection = new RTCPeerConnection(configuration);
      
      // ICE candidate olayı
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 ICE candidate oluşturuldu');
          if (socketManager.isConnected()) {
            socketManager.sendIceCandidate(this.roomId, event.candidate);
          } else {
            this.iceCandidateQueue.push(event.candidate);
          }
        }
      };

      // Bağlantı durumu değişikliği
      this.peerConnection.onconnectionstatechange = () => {
        console.log(`🔌 Bağlantı durumu: ${this.peerConnection.connectionState}`);
        this.emit('connection-state-change', this.peerConnection.connectionState);
        
        if (this.peerConnection.connectionState === 'failed') {
          this.handleConnectionFailure();
        }
      };

      // ICE bağlantı durumu
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE bağlantı durumu: ${this.peerConnection.iceConnectionState}`);
        this.emit('ice-connection-state-change', this.peerConnection.iceConnectionState);
      };

      // Medya akışı olayları
      this.peerConnection.ontrack = (event) => {
        console.log('📺 Uzak medya akışı alındı');
        this.remoteStream = event.streams[0];
        this.emit('remote-stream', this.remoteStream);
      };

      // Yerel medya akışını ekle
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      console.log('✅ PeerConnection başarıyla oluşturuldu');
      return this.peerConnection;
    } catch (error) {
      console.error('❌ PeerConnection oluşturma hatası:', error);
      this.emit('error', { message: 'WebRTC bağlantısı kurulamadı' });
      throw error;
    }
  }

  async startStreaming(roomId, userId) {
    try {
      console.log(`🎥 Yayın başlatılıyor - Room: ${roomId}, User: ${userId}`);
      
      this.roomId = roomId;
      this.userId = userId;
      
      if (!this.peerConnection) {
        this.createPeerConnection();
      }

      // Odaya katıl
      socketManager.joinRoom(roomId, userId, true);
      
      // Offer oluştur
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await this.peerConnection.setLocalDescription(offer);
      socketManager.sendOffer(roomId, offer);
      
      console.log('✅ Yayın başarıyla başlatıldı');
      this.emit('streaming-started');
    } catch (error) {
      console.error('❌ Yayın başlatma hatası:', error);
      this.emit('error', { message: 'Yayın başlatılamadı' });
      throw error;
    }
  }

  async joinStream(roomId, userId) {
    try {
      console.log(`👥 Yayına katılınıyor - Room: ${roomId}, User: ${userId}`);
      
      this.roomId = roomId;
      this.userId = userId;
      
      if (!this.peerConnection) {
        this.createPeerConnection();
      }

      // Odaya katıl
      socketManager.joinRoom(roomId, userId, false);
      
      console.log('✅ Yayına katılma başarılı');
      this.emit('joined-stream');
    } catch (error) {
      console.error('❌ Yayına katılma hatası:', error);
      this.emit('error', { message: 'Yayına katılınamadı' });
      throw error;
    }
  }

  async handleOffer(offer, from) {
    try {
      console.log('📥 Offer alındı');
      
      if (!this.peerConnection) {
        this.createPeerConnection();
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      socketManager.sendAnswer(this.roomId, answer, from);
      
      console.log('✅ Offer başarıyla işlendi');
    } catch (error) {
      console.error('❌ Offer işleme hatası:', error);
      this.emit('error', { message: 'Offer işlenemedi' });
      throw error;
    }
  }

  async handleAnswer(answer) {
    try {
      console.log('📥 Answer alındı');
      
      if (!this.peerConnection) {
        throw new Error('PeerConnection bulunamadı');
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      
      console.log('✅ Answer başarıyla işlendi');
    } catch (error) {
      console.error('❌ Answer işleme hatası:', error);
      this.emit('error', { message: 'Answer işlenemedi' });
      throw error;
    }
  }

  async handleIceCandidate(candidate) {
    try {
      console.log('🧊 ICE candidate alındı');
      
      if (!this.peerConnection) {
        throw new Error('PeerConnection bulunamadı');
      }

      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      
      console.log('✅ ICE candidate başarıyla işlendi');
    } catch (error) {
      console.error('❌ ICE candidate işleme hatası:', error);
      this.emit('error', { message: 'ICE candidate işlenemedi' });
      throw error;
    }
  }

  async handleConnectionFailure() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Yeniden bağlanma denemesi ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      try {
        if (this.isHost) {
          await this.startStreaming(this.roomId, this.userId);
        } else {
          await this.joinStream(this.roomId, this.userId);
        }
      } catch (error) {
        console.error('❌ Yeniden bağlanma hatası:', error);
        this.emit('error', { message: 'Yeniden bağlanılamadı' });
      }
    } else {
      console.error('❌ Maksimum yeniden bağlanma denemesi aşıldı');
      this.emit('error', { message: 'Bağlantı kurulamadı' });
    }
  }

  stopStreaming() {
    try {
      console.log('⏹️ Yayın durduruluyor...');
      
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      if (this.roomId) {
        socketManager.leaveRoom(this.roomId);
      }

      this.iceCandidateQueue = [];
      this.reconnectAttempts = 0;
      
      console.log('✅ Yayın başarıyla durduruldu');
      this.emit('streaming-stopped');
    } catch (error) {
      console.error('❌ Yayın durdurma hatası:', error);
      this.emit('error', { message: 'Yayın durdurulamadı' });
    }
  }

  // Event listener yönetimi
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event listener hatası (${event}):`, error);
        }
      });
    }
  }

  // Yardımcı metodlar
  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  isStreaming() {
    return this.peerConnection !== null && this.peerConnection.connectionState === 'connected';
  }
}

// Singleton instance
const webrtcManager = new WebRTCManager();
export default webrtcManager;

// Medya akışını alma
export const getMediaStream = async (withAudio = true) => {
  console.log('[WebRTC] Medya akışı alınıyor...');
  try {
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: withAudio ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1
      } : false
    };

    // Önce izinleri kontrol et
    const permissions = await navigator.permissions.query({ name: 'camera' });
    if (permissions.state === 'denied') {
      throw new Error('Kamera izni reddedildi');
    }

    if (withAudio) {
      const audioPermission = await navigator.permissions.query({ name: 'microphone' });
      if (audioPermission.state === 'denied') {
        throw new Error('Mikrofon izni reddedildi');
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('[WebRTC] Medya akışı başarıyla alındı.');
    return stream;
  } catch (error) {
    console.error('[WebRTC] Medya akışı alınırken hata:', error);
    throw new Error('Medya akışı alınamadı: ' + error.message);
  }
};

// ✅ Düzeltilmiş Sinyal bağlantısı oluşturma
export const createSignalingConnection = (roomId, userId, isHost) => {
  console.log('[WebRTC] Sinyal bağlantısı oluşturuluyor...');
  
  const signalingRef = collection(db, 'seminars', roomId, 'signaling');
  let lastProcessedTimestamp = null;
  let isProcessing = false;
  let unsubscribe = null; // ✅ unsubscribe fonksiyonunu sakla
  
  return {
    on: (event, callback) => {
      if (event === 'offer' || event === 'answer' || event === 'ice-candidate') {
        const q = query(signalingRef, orderBy('timestamp', 'desc'), limit(50));
        
        // ✅ unsubscribe fonksiyonunu sakla
        unsubscribe = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              if (data.type === event && (!lastProcessedTimestamp || data.timestamp > lastProcessedTimestamp)) {
                console.log(`[WebRTC] ${event} alındı:`, data);
                lastProcessedTimestamp = data.timestamp;
                if (!isProcessing) {
                  isProcessing = true;
                  callback(data);
                  isProcessing = false;
                }
              }
            }
          });
        });
      }
    },
    
    emit: (event, data) => {
      console.log(`[WebRTC] ${event} gönderiliyor:`, data);
      addDoc(signalingRef, {
        ...data,
        timestamp: serverTimestamp()
      });
    },
    
    // ✅ cleanup fonksiyonu eklendi
    cleanup: () => {
      if (unsubscribe) {
        console.log('[WebRTC] Sinyal bağlantısı temizleniyor (unsubscribe)');
        unsubscribe(); // Firestore snapshot listener'ı durdur
        unsubscribe = null;
      }
    }
  };
};

// WebRTC başlatma
export const initializeWebRTC = async (seminarId, userId, isHost) => {
  console.log('[WebRTC] initializeWebRTC çağrıldı. isHost:', isHost);
  
  try {
    const peerConnection = await webrtcManager.initializeMedia(isHost);
    let stream = null;

    if (isHost) {
      try {
        stream = await getMediaStream(true);
        
        // Ses kalitesini optimize et
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          const audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
            channelCount: 1
          };
          
          await audioTrack.applyConstraints(audioConstraints);
          console.log('[WebRTC] Ses kalitesi optimize edildi');
        }
        
        // Video kalitesini optimize et
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const videoConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          };
          
          await videoTrack.applyConstraints(videoConstraints);
          console.log('[WebRTC] Video kalitesi optimize edildi');
        }
        
        stream.getTracks().forEach(track => {
          console.log('[WebRTC] Track ekleniyor:', track.kind);
          peerConnection.addTrack(track, stream);
        });
        
        // ICE adaylarını dinle
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('[WebRTC] Yeni ICE adayı:', event.candidate);
            addDoc(collection(db, 'seminars', seminarId, 'signaling'), {
              type: 'ice-candidate',
              candidate: {
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex
              },
              timestamp: serverTimestamp()
            });
          } else {
            console.log('[WebRTC] ICE aday toplama tamamlandı');
          }
        };
      } catch (err) {
        console.error('[WebRTC] Host medya akışı alınırken hata:', err);
        throw new Error('Host medya akışı alınamadı: ' + err.message);
      }
    } else {
      // İzleyici için peer connection ayarları
      peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Yeni medya akışı alındı:', event.track.kind);
        if (event.streams && event.streams[0]) {
          const remoteVideo = document.querySelector('#remoteVideo');
          if (remoteVideo) {
            console.log('[WebRTC] Video elementi bulundu, akış başlatılıyor...');
            
            // Önceki akışı temizle
            if (remoteVideo.srcObject) {
              remoteVideo.srcObject.getTracks().forEach(track => track.stop());
            }
            
            // Yeni akışı ayarla
            remoteVideo.srcObject = event.streams[0];
            
            // Video hazır olduğunda
            remoteVideo.onloadedmetadata = () => {
              console.log('[WebRTC] Video metadata yüklendi, oynatma başlatılıyor...');
              remoteVideo.play()
                .then(() => {
                  console.log('[WebRTC] Video başarıyla oynatılıyor');
                })
                .catch(err => {
                  console.error('[WebRTC] Video oynatma hatası:', err);
                  // Otomatik yeniden deneme
                  setTimeout(() => {
                    remoteVideo.play().catch(e => console.error('[WebRTC] Yeniden oynatma hatası:', e));
                  }, 1000);
                });
            };

            // Video hata durumunda
            remoteVideo.onerror = (error) => {
              console.error('[WebRTC] Video elementi hatası:', error);
            };

            // Video durduğunda
            remoteVideo.onended = () => {
              console.log('[WebRTC] Video akışı sonlandı');
            };

            // Video duraklatıldığında
            remoteVideo.onpause = () => {
              console.log('[WebRTC] Video duraklatıldı');
            };

            // Video devam ettiğinde
            remoteVideo.onplay = () => {
              console.log('[WebRTC] Video devam ediyor');
            };

            // Video yüklendiğinde
            remoteVideo.onloadeddata = () => {
              console.log('[WebRTC] Video verisi yüklendi');
            };

            // Video hazır olduğunda
            remoteVideo.oncanplay = () => {
              console.log('[WebRTC] Video oynatılmaya hazır');
            };

            // Video boyutu değiştiğinde
            remoteVideo.onresize = () => {
              console.log('[WebRTC] Video boyutu değişti');
            };

            // Video akışı durumunu izle
            const checkStream = setInterval(() => {
              if (!remoteVideo.srcObject || !remoteVideo.srcObject.active) {
                console.log('[WebRTC] Video akışı durdu, yeniden bağlanılıyor...');
                clearInterval(checkStream);
                reconnectPeerConnection(seminarId, userId, isHost);
              }
            }, 5000);

          } else {
            console.error('[WebRTC] Video elementi bulunamadı (#remoteVideo)');
          }
        } else {
          console.error('[WebRTC] Medya akışı alındı ancak stream boş');
        }
      };
      
      // ICE adaylarını dinle
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('[WebRTC] Yeni ICE adayı:', event.candidate);
          addDoc(collection(db, 'seminars', seminarId, 'signaling'), {
            type: 'ice-candidate',
            candidate: {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex
            },
            timestamp: serverTimestamp()
          });
        } else {
          console.log('[WebRTC] ICE aday toplama tamamlandı');
        }
      };
    }

    // Bağlantı durumunu izle
    peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Bağlantı durumu değişti:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        console.log('[WebRTC] Bağlantı başarısız, yeniden başlatılıyor...');
        reconnectPeerConnection(seminarId, userId, isHost);
      }
    };

    // ICE bağlantı durumunu izle
    peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE bağlantı durumu:', peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'failed') {
        console.log('[WebRTC] ICE bağlantısı başarısız, yeniden başlatılıyor...');
        peerConnection.restartIce();
      }
    };

    // Sinyal durumunu izle
    peerConnection.onsignalingstatechange = () => {
      console.log('[WebRTC] Sinyal durumu:', peerConnection.signalingState);
    };

    // Negatif ICE adaylarını izle
    peerConnection.onicecandidateerror = (event) => {
      console.error('[WebRTC] ICE aday hatası:', event);
    };

    // Bağlantı istatistiklerini izle
    setInterval(async () => {
      try {
        const stats = await peerConnection.getStats();
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            console.log('[WebRTC] Video istatistikleri:', {
              bytesReceived: report.bytesReceived,
              packetsReceived: report.packetsReceived,
              packetsLost: report.packetsLost,
              jitter: report.jitter,
              framesReceived: report.framesReceived,
              framesDropped: report.framesDropped,
              framesDecoded: report.framesDecoded
            });
          }
        });
      } catch (error) {
        console.error('[WebRTC] İstatistik alma hatası:', error);
      }
    }, 5000);

    return { peerConnection, stream };
  } catch (error) {
    console.error('[WebRTC] Başlatma hatası:', error);
    throw new Error('WebRTC başlatılamadı: ' + error.message);
  }
};

// WebRTC temizleme
export const cleanupWebRTC = (peerConnection, stream) => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
  
  if (peerConnection) {
    peerConnection.close();
  }
};

// ICE adayını işleme
export const handleIceCandidate = async (peerConnection, candidateData) => {
  try {
    console.log('[WebRTC] ICE adayı işleniyor...');
    const candidate = new RTCIceCandidate({
      candidate: candidateData.candidate.candidate,
      sdpMid: candidateData.candidate.sdpMid,
      sdpMLineIndex: candidateData.candidate.sdpMLineIndex
    });
    
    await peerConnection.addIceCandidate(candidate);
    console.log('[WebRTC] ICE adayı başarıyla eklendi');
  } catch (err) {
    console.error('[WebRTC] ICE adayı eklenirken hata:', err);
    throw err;
  }
};

// Offer oluştur ve gönder
export const createAndSendOffer = async (seminarId, peerConnection) => {
  try {
    console.log('[WebRTC] Offer oluşturuluyor...');
    
    // Önceki bağlantıları temizle
    if (peerConnection.signalingState !== 'stable') {
      console.log('[WebRTC] Önceki bağlantı temizleniyor...');
      await peerConnection.setLocalDescription({ type: 'rollback' });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    
    console.log('[WebRTC] Local description ayarlanıyor...');
    await peerConnection.setLocalDescription(offer);
    
    console.log('[WebRTC] Offer Firestore\'a kaydediliyor...');
    await addDoc(collection(db, 'seminars', seminarId, 'signaling'), {
      type: 'offer',
      offer: {
        type: offer.type,
        sdp: offer.sdp
      },
      timestamp: serverTimestamp()
    });
    
    console.log('[WebRTC] Offer başarıyla gönderildi');
    return offer;
  } catch (err) {
    console.error('[WebRTC] Offer oluşturulurken hata:', err);
    throw err;
  }
};

// Answer oluştur ve gönder
export const createAndSendAnswer = async (seminarId, peerConnection, offer) => {
  try {
    console.log('[WebRTC] Answer oluşturuluyor...');
    
    // Bağlantı durumunu kontrol et
    if (peerConnection.signalingState !== 'stable') {
      console.log('[WebRTC] Önceki bağlantı temizleniyor...');
      await peerConnection.setLocalDescription({ type: 'rollback' });
    }
    
    // Önce remote description'ı ayarla
    const remoteDesc = new RTCSessionDescription({
      type: offer.type,
      sdp: offer.sdp
    });
    
    console.log('[WebRTC] Remote description ayarlanıyor...');
    await peerConnection.setRemoteDescription(remoteDesc);
    
    // ICE adaylarının toplanmasını bekle
    if (peerConnection.iceGatheringState !== 'complete') {
      await new Promise(resolve => {
        const checkState = () => {
          if (peerConnection.iceGatheringState === 'complete') {
            resolve();
          } else {
            setTimeout(checkState, 100);
          }
        };
        checkState();
      });
    }
    
    console.log('[WebRTC] Answer oluşturuluyor...');
    const answer = await peerConnection.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    
    console.log('[WebRTC] Local description ayarlanıyor...');
    await peerConnection.setLocalDescription(answer);
    
    console.log('[WebRTC] Answer Firestore\'a kaydediliyor...');
    await addDoc(collection(db, 'seminars', seminarId, 'signaling'), {
      type: 'answer',
      answer: {
        type: answer.type,
        sdp: answer.sdp
      },
      timestamp: serverTimestamp()
    });
    
    console.log('[WebRTC] Answer başarıyla gönderildi');
    return answer;
  } catch (err) {
    console.error('[WebRTC] Answer oluşturulurken hata:', err);
    throw err;
  }
};

// Bağlantı durumunu izleme
export const monitorConnectionState = (peerConnection, callbacks = {}) => {
  const { onConnected, onDisconnected, onFailed, onClosed } = callbacks;
  
  peerConnection.onconnectionstatechange = () => {
    const state = peerConnection.connectionState;
    console.log(`[WebRTC] Bağlantı durumu değişti: ${state}`);
    
    switch (state) {
      case 'connected':
        console.log('[WebRTC] Bağlantı kuruldu!');
        if (onConnected) onConnected();
        break;
      case 'disconnected':
        console.log('[WebRTC] Bağlantı kesildi.');
        if (onDisconnected) onDisconnected();
        break;
      case 'failed':
        console.log('[WebRTC] Bağlantı başarısız oldu.');
        if (onFailed) onFailed();
        break;
      case 'closed':
        console.log('[WebRTC] Bağlantı kapatıldı.');
        if (onClosed) onClosed();
        break;
    }
  };
  
  peerConnection.oniceconnectionstatechange = () => {
    console.log(`[WebRTC] ICE bağlantı durumu: ${peerConnection.iceConnectionState}`);
    
    if (peerConnection.iceConnectionState === 'failed') {
      console.log('[WebRTC] ICE bağlantısı başarısız, yeniden başlatılıyor...');
      peerConnection.restartIce();
    }
  };
};

// ✅ Düzeltilmiş Sinyal kanalını dinleme
export const listenToSignalingChannel = (seminarId, peerConnection, isHost) => {
  console.log('[WebRTC] Sinyal kanalı dinleniyor...');
  
  const signalingRef = collection(db, 'seminars', seminarId, 'signaling');
  const q = query(signalingRef, orderBy('timestamp', 'desc'), limit(50));
  
  let lastProcessedTimestamp = null;
  
  // ✅ unsubscribe fonksiyonunu döndür
  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        
        // Zaman damgasını kontrol et
        if (lastProcessedTimestamp && data.timestamp <= lastProcessedTimestamp) {
          return; // Bu mesajı zaten işledik
        }
        
        lastProcessedTimestamp = data.timestamp;
        
        // Mesaj türüne göre işle
        if (data.type === 'ice-candidate') {
          handleIceCandidate(peerConnection, data)
            .catch(err => console.error('[WebRTC] ICE adayı işlenirken hata:', err));
        } else if (isHost && data.type === 'answer') {
          console.log('[WebRTC] Answer alındı:', data);
          const answer = new RTCSessionDescription({
            type: data.answer.type,
            sdp: data.answer.sdp
          });
          
          peerConnection.setRemoteDescription(answer)
            .catch(err => console.error('[WebRTC] Remote description ayarlanırken hata:', err));
        } else if (!isHost && data.type === 'offer') {
          console.log('[WebRTC] Offer alındı:', data);
          const offer = new RTCSessionDescription({
            type: data.offer.type,
            sdp: data.offer.sdp
          });
          
          peerConnection.setRemoteDescription(offer)
            .then(() => peerConnection.createAnswer())
            .then(answer => peerConnection.setLocalDescription(answer))
            .then(() => {
              addDoc(signalingRef, {
                type: 'answer',
                answer: {
                  type: peerConnection.localDescription.type,
                  sdp: peerConnection.localDescription.sdp
                },
                timestamp: serverTimestamp()
              });
            })
            .catch(err => console.error('[WebRTC] Offer işlenirken hata:', err));
        }
      }
    });
  });
  
  // ✅ unsubscribe fonksiyonunu döndür
  return unsubscribe;
};

// Ekran paylaşımı başlatma
export const startScreenSharing = async (peerConnection) => {
  try {
    console.log('[WebRTC] Ekran paylaşımı başlatılıyor...');
    
    // Mevcut video track'leri durdur
    peerConnection.getSenders().forEach(sender => {
      if (sender.track && sender.track.kind === 'video') {
        sender.track.stop();
      }
    });
    
    // Ekran paylaşımı akışını al
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        displaySurface: 'monitor'
      }
    });
    
    // Ekran paylaşımı track'ini ekle
    const videoTrack = stream.getVideoTracks()[0];
    
    // Mevcut video göndericiyi bul ve track'i değiştir
    const videoSender = peerConnection.getSenders().find(sender => 
      sender.track && sender.track.kind === 'video'
    );
    
    if (videoSender) {
      console.log('[WebRTC] Mevcut video track değiştiriliyor...');
      videoSender.replaceTrack(videoTrack);
    } else {
      console.log('[WebRTC] Yeni video track ekleniyor...');
      peerConnection.addTrack(videoTrack, stream);
    }
    
    // Ekran paylaşımı bittiğinde
    videoTrack.onended = async () => {
      console.log('[WebRTC] Ekran paylaşımı sonlandırıldı.');
      
      // Kamera video akışına geri dön
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const cameraTrack = cameraStream.getVideoTracks()[0];
        
        const videoSender = peerConnection.getSenders().find(sender => 
          sender.track && sender.track.kind === 'video'
        );
        
        if (videoSender) {
          videoSender.replaceTrack(cameraTrack);
        }
      } catch (err) {
        console.error('[WebRTC] Kamera video akışına dönüş hatası:', err);
      }
    };
    
    return stream;
  } catch (err) {
    console.error('[WebRTC] Ekran paylaşımı başlatma hatası:', err);
    throw err;
  }
};

// Ses seviyesi algılama
export const setupAudioLevelDetection = (stream, onAudioLevel) => {
  if (!stream) return null;
  
  const audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 44100,
    latencyHint: 'interactive'
  });
  
  const analyser = audioContext.createAnalyser();
  const microphone = audioContext.createMediaStreamSource(stream);
  const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
  
  analyser.smoothingTimeConstant = 0.8;
  analyser.fftSize = 1024;
  
  microphone.connect(analyser);
  analyser.connect(javascriptNode);
  javascriptNode.connect(audioContext.destination);
  
  javascriptNode.onaudioprocess = () => {
    const array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    let values = 0;
    
    const length = array.length;
    for (let i = 0; i < length; i++) {
      values += (array[i]);
    }
    
    const average = values / length;
    onAudioLevel(average);
  };
  
  return () => {
    javascriptNode.disconnect();
    analyser.disconnect();
    microphone.disconnect();
    if (audioContext.state !== 'closed') {
      audioContext.close();
    }
  };
};

// Bağlantı kalitesi izleme
export const monitorConnectionQuality = (peerConnection, onQualityChange) => {
  if (!peerConnection) return null;
  
  const interval = setInterval(async () => {
    try {
      const stats = await peerConnection.getStats();
      let totalPacketsLost = 0;
      let totalPackets = 0;
      let roundTripTime = 0;
      let hasRTTData = false;
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.packetsLost !== undefined) {
          totalPacketsLost += report.packetsLost;
          totalPackets += report.packetsReceived;
        }
        
        if (report.type === 'remote-inbound-rtp' && report.roundTripTime !== undefined) {
          roundTripTime = report.roundTripTime;
          hasRTTData = true;
        }
      });
      
      // Paket kaybı oranı hesapla
      const packetLossRate = totalPackets > 0 ? (totalPacketsLost / totalPackets) * 100 : 0;
      
      // Bağlantı kalitesini belirle
      let quality = 'excellent'; // Varsayılan
      
      if (packetLossRate > 10 || (hasRTTData && roundTripTime > 0.5)) {
        quality = 'poor';
      } else if (packetLossRate > 3 || (hasRTTData && roundTripTime > 0.2)) {
        quality = 'fair';
      } else if (packetLossRate > 1 || (hasRTTData && roundTripTime > 0.1)) {
        quality = 'good';
      }
      
      onQualityChange({
        quality,
        packetLossRate,
        roundTripTime: hasRTTData ? roundTripTime * 1000 : null // ms cinsinden
      });
    } catch (err) {
      console.error('[WebRTC] Bağlantı kalitesi izleme hatası:', err);
    }
  }, 2000);
  
  return () => clearInterval(interval);
};

// ✅ Düzeltilmiş Bağlantı yeniden kurma
export const reconnectPeerConnection = async (seminarId, userId, isHost) => {
  console.log('[WebRTC] Bağlantı yeniden kuruluyor...');
  
  try {
    // Yeni bir bağlantı başlat
    const { peerConnection, stream } = await initializeWebRTC(seminarId, userId, isHost);
    
    if (isHost) {
      // Yeni bir offer oluştur ve gönder
      await createAndSendOffer(seminarId, peerConnection);
      
      // Sinyal kanalını dinle
      const unsubscribe = listenToSignalingChannel(seminarId, peerConnection, isHost);
      
      return { peerConnection, stream, unsubscribe };
    } else {
      // İzleyici için sinyal kanalını dinle
      const unsubscribe = listenToSignalingChannel(seminarId, peerConnection, isHost);
      
      return { peerConnection, unsubscribe };
    }
  } catch (err) {
    console.error('[WebRTC] Bağlantı yeniden kurma hatası:', err);
    throw err;
  }
};

// Ses ve video ayarlarını değiştirme
export const updateMediaSettings = async (peerConnection, settings = {}) => {
  const { audio = true, video = true } = settings;
  
  try {
    // Mevcut track'leri bul
    const senders = peerConnection.getSenders();
    
    senders.forEach(sender => {
      if (sender.track) {
        if (sender.track.kind === 'audio') {
          sender.track.enabled = audio;
          if (audio) {
            // Ses kalitesini optimize et
            const audioConstraints = {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
              channelCount: 1
            };
            sender.track.applyConstraints(audioConstraints)
              .catch(err => console.error('[WebRTC] Ses kalitesi ayarlanırken hata:', err));
          }
        } else if (sender.track.kind === 'video') {
          sender.track.enabled = video;
        }
      }
    });
    
    console.log(`[WebRTC] Medya ayarları güncellendi: Ses=${audio}, Video=${video}`);
    return true;
  } catch (err) {
    console.error('[WebRTC] Medya ayarları güncellenirken hata:', err);
    return false;
  }
};
