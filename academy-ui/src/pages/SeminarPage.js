import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './SeminarPage.css';

// Güncellenmiş socket import
import {
  connectSocket,
  joinSeminarRoom,
  leaveSeminarRoom,
  sendWebRTCOffer,
  sendWebRTCAnswer,
  sendICECandidate,
  onWebRTCOffer,
  onWebRTCAnswer,
  onICECandidate,
  onUserJoinedWebRTC,
  onUserLeftWebRTC,
  onRoomParticipants,
  sendSeminarMessage,
  onSeminarMessage,
  closeSocket,
  isSocketConnected
} from '../utils/socket';

import {
  initVoiceRecording,
  startRecording,
  stopRecording,
  getRecordingStatus,
  resetRecognizedText,
  cleanupVoiceRecording
} from '../utils/voiceRecording';

const SeminarPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State variables
  const [seminar, setSeminar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [content, setContent] = useState('');
  const [isHost, setIsHost] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Voice recording states
  const [voiceRecordingSupported, setVoiceRecordingSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [currentTranscriptId, setCurrentTranscriptId] = useState(null);
  
  // WebRTC refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  
  // ICE candidate queue
  const iceCandidateQueueRef = useRef([]);
  const autoSaveIntervalRef = useRef(null);
  const hasRemoteStreamAttachedRef = useRef(false);
  const socketRef = useRef(null);

  // Reset remote stream attachment tracking
  useEffect(() => {
    hasRemoteStreamAttachedRef.current = false;
  }, [id]);

  // Initialize voice recording
  useEffect(() => {
    const supported = initVoiceRecording((text, interim) => {
      setRecognizedText(text);
      setInterimText(interim);
    });
    setVoiceRecordingSupported(supported);
    
    return () => {
      cleanupVoiceRecording();
    };
  }, []);

  // WebRTC Peer Connection Setup
  const createPeerConnection = useCallback(() => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // ICE candidate handling
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('[WebRTC] Sending ICE candidate');
        sendICECandidate(id, event.candidate);
      }
    };

    // Connection state monitoring
    peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', peerConnection.connectionState);
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', peerConnection.iceConnectionState);
    };

    // Track handling for viewers
    if (!isHost) {
      peerConnection.ontrack = (event) => {
        console.log('[WebRTC] Remote track received:', event.track.kind);
        const remoteStream = event.streams?.[0];
        
        if (remoteStream && remoteVideoRef.current && !hasRemoteStreamAttachedRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          hasRemoteStreamAttachedRef.current = true;
          
          remoteVideoRef.current.play().then(() => {
            console.log('[WebRTC] Remote video playing');
          }).catch(err => {
            console.error('[WebRTC] Remote video play error:', err);
          });
        }
      };
    }

    return peerConnection;
  }, [isHost, id]);

  // Get user media for host
  const getUserMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('[WebRTC] Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Process queued ICE candidates
  const processQueuedICECandidates = useCallback(async (peerConnection) => {
    if (iceCandidateQueueRef.current.length > 0 && peerConnection.remoteDescription) {
      console.log(`[WebRTC] Processing ${iceCandidateQueueRef.current.length} queued ICE candidates`);
      
      for (const candidateData of iceCandidateQueueRef.current) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
          console.log('[WebRTC] Queued ICE candidate processed');
        } catch (err) {
          console.error('[WebRTC] Error processing queued ICE candidate:', err);
        }
      }
      
      iceCandidateQueueRef.current = [];
    }
  }, []);

  // Initialize WebRTC connection
  const initializeWebRTCConnection = useCallback(async () => {
    if (!currentUser || isHost === null) return;

    // Socket bağlantısını kontrol et ve gerekirse başlat
    if (!isSocketConnected()) {
      console.log('[WebRTC] Socket bağlantısı kuruluyor...');
      connectSocket(currentUser.uid);
      
      // Socket bağlantısının kurulmasını bekle
      await new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (isSocketConnected()) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
        
        // 10 saniye sonra timeout
        setTimeout(() => {
          clearInterval(checkConnection);
          resolve();
        }, 10000);
      });
    }

    if (!isSocketConnected()) {
      console.error('[WebRTC] Socket bağlantısı kurulamadı');
      setError('Bağlantı kurulamadı. Lütfen sayfayı yenileyin.');
      return;
    }

    try {
      console.log('[WebRTC] Initializing connection for', isHost ? 'HOST' : 'VIEWER');

      // Clean up previous connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Clear ICE candidate queue
      iceCandidateQueueRef.current = [];

      // Create new peer connection
      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;

      // Get user media for host
      if (isHost) {
        const stream = await getUserMedia();
        localStreamRef.current = stream;
        
        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
      }

      // Join WebRTC room via socket
      joinSeminarRoom(id, currentUser.uid, isHost);

      console.log('[WebRTC] Connection initialized successfully');
    } catch (error) {
      console.error('[WebRTC] Initialization error:', error);
      setError('WebRTC başlatılamadı. Lütfen sayfayı yenileyin.');
    }
  }, [currentUser, isHost, id, createPeerConnection, getUserMedia]);

  // Socket event handlers setup
  const setupSocketEventHandlers = useCallback(() => {
    if (!socketRef.current) return;

    // WebRTC Offer handling
    onWebRTCOffer(async (data) => {
      if (!isHost && peerConnectionRef.current) {
        try {
          console.log('[WebRTC] Received offer, creating answer');
          
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );
          
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          sendWebRTCAnswer(id, answer, data.from);
          
          // Process queued ICE candidates
          await processQueuedICECandidates(peerConnectionRef.current);
          
        } catch (error) {
          console.error('[WebRTC] Error handling offer:', error);
        }
      }
    });

    // WebRTC Answer handling
    onWebRTCAnswer(async (data) => {
      if (isHost && peerConnectionRef.current) {
        try {
          console.log('[WebRTC] Received answer, setting remote description');
          
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          
          // Process queued ICE candidates
          await processQueuedICECandidates(peerConnectionRef.current);
          
        } catch (error) {
          console.error('[WebRTC] Error handling answer:', error);
        }
      }
    });

    // ICE Candidate handling
    onICECandidate(async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          if (peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
            console.log('[WebRTC] ICE candidate added');
          } else {
            iceCandidateQueueRef.current.push(data.candidate);
            console.log('[WebRTC] ICE candidate queued');
          }
        } catch (error) {
          console.error('[WebRTC] Error handling ICE candidate:', error);
        }
      }
    });

    // User joined/left handlers
    onUserJoinedWebRTC((data) => {
      console.log('[WebRTC] User joined:', data);
      // If host and user joined, create offer
      if (isHost && peerConnectionRef.current) {
        createOffer();
      }
    });

    onUserLeftWebRTC((data) => {
      console.log('[WebRTC] User left:', data);
    });

    // Chat message handling
    onSeminarMessage((data) => {
      console.log('[Chat] Message received:', data);
      // Handle real-time chat messages if needed
    });
  }, [isHost, id, processQueuedICECandidates]);

  // Create and send WebRTC offer
  const createOffer = useCallback(async () => {
    if (!isHost || !peerConnectionRef.current) return;

    try {
      console.log('[WebRTC] Creating offer');
      
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      sendWebRTCOffer(id, offer);
      
      console.log('[WebRTC] Offer sent');
      
    } catch (error) {
      console.error('[WebRTC] Error creating offer:', error);
    }
  }, [isHost, id]);

  // Auto-save transcript
  const setupAutoSaveTranscript = useCallback(() => {
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }
    
    autoSaveIntervalRef.current = setInterval(async () => {
      if (isRecording && recognizedText.trim() && currentTranscriptId) {
        try {
          await updateDoc(doc(db, "seminarRecordings", currentTranscriptId), {
            text: recognizedText,
            lastUpdated: serverTimestamp()
          });
          console.log('[Auto-save] Transcript saved');
        } catch (error) {
          console.error('[Auto-save] Error saving transcript:', error);
        }
      }
    }, 30000);
    
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [isRecording, recognizedText, currentTranscriptId]);

  // Start stream
  const startStream = async () => {
    if (!isHost || userRole !== 'academic') {
      console.log('[Action] Yetki hatası:', { isHost, userRole });
      return;
    }

    try {
      console.log('[Action] Starting stream...');

      // Socket bağlantısını kontrol et
      if (!isSocketConnected()) {
        console.log('[Action] Socket bağlantısı kuruluyor...');
        connectSocket(currentUser.uid);
        
        // Socket bağlantısının kurulmasını bekle
        await new Promise((resolve) => {
          const checkConnection = setInterval(() => {
            if (isSocketConnected()) {
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);
          
          // 10 saniye sonra timeout
          setTimeout(() => {
            clearInterval(checkConnection);
            resolve();
          }, 10000);
        });
      }

      if (!isSocketConnected()) {
        console.error('[Action] Socket bağlantısı kurulamadı');
        alert('Bağlantı kurulamadı. Lütfen sayfayı yenileyin.');
        return;
      }

      // Initialize WebRTC connection
      await initializeWebRTCConnection();

      // Start voice recording
      if (voiceRecordingSupported) {
        resetRecognizedText();
        const recordingStarted = startRecording();
        setIsRecording(recordingStarted);

        if (recordingStarted) {
          // Create transcript document
          const newTranscriptRef = await addDoc(collection(db, "seminarRecordings"), {
            seminarId: id,
            academicId: currentUser.uid,
            academicName: currentUser.displayName || 'Unknown Academic',
            text: '',
            startedAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            status: 'active'
          });

          setCurrentTranscriptId(newTranscriptRef.id);
          setupAutoSaveTranscript();
        }
      }

      // Update Firestore
      await updateDoc(doc(db, "seminars", id), {
        status: 'live',
        startedAt: serverTimestamp(),
        isStreaming: true,
        streamStartedAt: serverTimestamp()
      });

      setIsStreaming(true);

      // Create offer after a short delay to ensure connection is ready
      setTimeout(() => {
        if (peerConnectionRef.current) {
          createOffer();
        }
      }, 1000);

      console.log('[Action] Stream started successfully');
    } catch (error) {
      console.error('[Action] Stream start error:', error);
      alert('Yayın başlatılırken bir hata oluştu: ' + error.message);
    }
  };

  // Stop stream
  const stopStream = async () => {
    if (!isHost || userRole !== 'academic') return;

    try {
      console.log('[Action] Stopping stream...');

      // Stop voice recording
      if (isRecording) {
        stopRecording();
        setIsRecording(false);

        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
          autoSaveIntervalRef.current = null;
        }

        // Save final transcript
        if (recognizedText.trim() && currentTranscriptId) {
                    await updateDoc(doc(db, "seminarRecordings", currentTranscriptId), {
            text: recognizedText,
            endedAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            status: 'completed'
          });

          // Update seminar content with transcript
          const updatedContent = content ? 
            `${content}\n\n--- Sesli Not (${new Date().toLocaleString('tr-TR')}) ---\n${recognizedText}` :
            `--- Sesli Not (${new Date().toLocaleString('tr-TR')}) ---\n${recognizedText}`;

          setContent(updatedContent);
          await updateDoc(doc(db, "seminars", id), {
            content: updatedContent,
            lastUpdated: serverTimestamp()
          });
        }
      }

      // Clean up WebRTC
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Leave seminar room
      leaveSeminarRoom(id);

      // Update Firestore
      await updateDoc(doc(db, "seminars", id), {
        isStreaming: false,
        streamEndedAt: serverTimestamp()
      });

      setCurrentTranscriptId(null);
      iceCandidateQueueRef.current = [];

      console.log('[Action] Stream stopped successfully');
    } catch (error) {
      console.error('[Action] Stream stop error:', error);
      alert('Yayın durdurulurken bir hata oluştu.');
    }
  };

  // Comment submission with socket integration
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    try {
      // Send via socket for real-time updates
      if (isSocketConnected()) {
        sendSeminarMessage(id, currentUser.uid, {
          text: newComment.trim(),
          authorName: currentUser.displayName || 'İsimsiz Kullanıcı',
          userType: userRole || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      // Also save to Firestore
      await addDoc(collection(db, "seminars", id, "comments"), {
        text: newComment.trim(),
        authorName: currentUser.displayName || 'İsimsiz Kullanıcı',
        userType: userRole || 'unknown',
        timestamp: serverTimestamp()
      });

      setNewComment('');
    } catch (err) {
      console.error("[Action] Comment submission error:", err);
      alert("Yorum gönderilemedi. Lütfen tekrar deneyin.");
    }
  };

  // Content update
  const handleContentUpdate = async () => {
    if (!isHost || userRole !== 'academic') return;

    try {
      await updateDoc(doc(db, "seminars", id), {
        content: content,
        lastUpdated: serverTimestamp()
      });
      alert("İçerik başarıyla güncellendi!");
    } catch (err) {
      console.error("[Action] Content update error:", err);
      alert("İçerik güncellenemedi. Lütfen tekrar deneyin.");
    }
  };

  // Start seminar
  const handleStartSeminar = async () => {
    if (!isHost || userRole !== 'academic') return;

    try {
      await updateDoc(doc(db, "seminars", id), {
        status: 'live',
        startedAt: serverTimestamp()
      });
      setIsLive(true);
      alert("Seminer başarıyla başlatıldı! Artık canlı yayını başlatabilirsiniz.");
    } catch (err) {
      console.error("[Action] Seminar start error:", err);
      alert("Seminer başlatılamadı. Lütfen tekrar deneyin.");
    }
  };

  // Stop seminar
  const handleStopSeminar = async () => {
    if (!isHost || userRole !== 'academic') return;

    if (window.confirm("Semineri durdurmak istediğinizden emin misiniz?")) {
      try {
        if (isStreaming) {
          await stopStream();
        }

        await updateDoc(doc(db, "seminars", id), {
          status: 'ended',
          endedAt: serverTimestamp(),
          isStreaming: false
        });

        setIsLive(false);
        alert("Seminer başarıyla durduruldu!");
      } catch (err) {
        console.error("[Action] Seminar stop error:", err);
        alert("Seminer durdurulamadı. Lütfen tekrar deneyin.");
      }
    }
  };

  // Delete seminar
  const handleDeleteSeminar = async () => {
    if (!isHost || userRole !== 'academic') return;

    if (window.confirm("Bu semineri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      try {
        if (isStreaming) {
          await stopStream();
        }

        await deleteDoc(doc(db, "seminars", id));
        alert("Seminer başarıyla silindi!");
        navigate('/seminar');
      } catch (err) {
        console.error("[Action] Seminar delete error:", err);
        alert("Seminer silinemedi. Lütfen tekrar deneyin.");
      }
    }
  };

  // Load seminar data and setup socket connection
  useEffect(() => {
    if (!id || !currentUser) {
      setError("Geçersiz seminer ID'si veya kullanıcı bilgisi");
      setLoading(false);
      return;
    }

    const fetchSeminar = async () => {
      try {
        // Initialize socket connection
        console.log('[Socket] Bağlantı başlatılıyor...');
        const socket = connectSocket(currentUser.uid);
        socketRef.current = socket;

        // Socket bağlantısının kurulmasını bekle
        await new Promise((resolve) => {
          const checkConnection = setInterval(() => {
            if (isSocketConnected()) {
              console.log('[Socket] Bağlantı başarıyla kuruldu');
              clearInterval(checkConnection);
              resolve();
            }
          }, 100);

          // 10 saniye sonra timeout
          setTimeout(() => {
            clearInterval(checkConnection);
            console.log('[Socket] Bağlantı zaman aşımına uğradı');
            resolve();
          }, 10000);
        });

        const seminarRef = doc(db, "seminars", id);
        const seminarSnap = await getDoc(seminarRef);

        if (!seminarSnap.exists()) {
          setError(`Seminer bulunamadı (ID: ${id})`);
          setLoading(false);
          return;
        }

        const seminarData = seminarSnap.data();
        setSeminar(seminarData);

        const isUserHost = seminarData.createdBy === currentUser.uid;
        setIsHost(isUserHost);
        setIsLive(seminarData.status === 'live');
        setIsStreaming(seminarData.isStreaming || false);

        if (seminarData.content) {
          setContent(seminarData.content);
        }

        // Get user role
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserRole(userSnap.data().userType);
        }

        // Setup socket event handlers
        setupSocketEventHandlers();

        // Listen for seminar updates
        const unsubscribeSeminar = onSnapshot(seminarRef, (doc) => {
          if (doc.exists()) {
            const updatedSeminar = doc.data();
            setSeminar(updatedSeminar);
            setIsLive(updatedSeminar.status === 'live');
            setIsStreaming(updatedSeminar.isStreaming || false);
          }
        });

        // Listen for comments
        const commentsRef = collection(db, "seminars", id, "comments");
        const commentsQuery = query(commentsRef, orderBy("timestamp", "asc"));
        const unsubscribeComments = onSnapshot(commentsQuery, (querySnapshot) => {
          const commentsArray = [];
          querySnapshot.forEach((doc) => {
            commentsArray.push({
              id: doc.id,
              ...doc.data()
            });
          });
          setComments(commentsArray);
        });

        setLoading(false);

        return () => {
          unsubscribeSeminar();
          unsubscribeComments();
        };
      } catch (err) {
        console.error("[useEffect] Seminar loading error:", err);
        setError(`Seminer yüklenirken bir hata oluştu: ${err.message}`);
        setLoading(false);
      }
    };

    fetchSeminar();
  }, [id, currentUser, setupSocketEventHandlers]);

  // Initialize WebRTC when conditions are met
  useEffect(() => {
    if (currentUser && isHost !== null && isLive && socketRef.current) {
      initializeWebRTCConnection();
    }

    return () => {
      // Cleanup WebRTC on dependency changes
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      iceCandidateQueueRef.current = [];
    };
  }, [currentUser, isHost, isLive, initializeWebRTCConnection]);

  // Setup auto-save when recording is active
  useEffect(() => {
    if (isRecording && currentTranscriptId) {
      return setupAutoSaveTranscript();
    }
  }, [isRecording, currentTranscriptId, setupAutoSaveTranscript]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup WebRTC
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      // Cleanup voice recording
      cleanupVoiceRecording();

      // Cleanup auto-save interval
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }

      // Leave seminar room and close socket
      if (socketRef.current && id) {
        leaveSeminarRoom(id);
        closeSocket();
      }

      // Reset refs
      iceCandidateQueueRef.current = [];
      socketRef.current = null;
    };
  }, [id]);

  // Loading state
  if (loading) {
    return (
      <div className="seminar-loading">
        <p>Seminer yükleniyor...</p>
        <p className="seminar-loading-id">Seminer ID: {id || "Belirtilmemiş"}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="seminar-error">
        <h2>Hata</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={() => navigate('/')}>Ana Sayfaya Git</button>
          <button onClick={() => navigate('/seminar')}>Seminer Sayfasına Git</button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!seminar) {
    return (
      <div className="seminar-not-found">
        <h2>Seminer Bulunamadı</h2>
        <p>ID: {id}</p>
        <div className="error-actions">
          <button onClick={() => navigate('/')}>Ana Sayfaya Git</button>
          <button onClick={() => navigate('/seminar')}>Seminer Sayfasına Git</button>
        </div>
      </div>
    );
  }

  const isAcademic = userRole === 'academic';
  const canManageSeminar = isHost && isAcademic;

  return (
    <div className="seminar-page">
      <div className="seminar-header">
        <h1>{seminar.title}</h1>
        <div className="seminar-meta">
          <span>Seminer ID: {id}</span>
          {seminar.createdAt?.toDate && (
            <span>Oluşturulma: {seminar.createdAt.toDate().toLocaleString('tr-TR')}</span>
          )}
          <span className={`seminar-status ${seminar.status}`}>
            {seminar.status === 'live' ? '🔴 CANLI' :
             seminar.status === 'ended' ? '⚫ BİTTİ' :
             seminar.status === 'scheduled' ? '🕒 PLANLANDI' :
             '⚪ HAZIRLANIYOR'}
          </span>
          {seminar.isStreaming && (
            <span className="streaming-status">📹 Canlı Yayın Aktif</span>
          )}
          {isSocketConnected() && (
            <span className="socket-status">🟢 Bağlı</span>
          )}
        </div>
        {canManageSeminar && (
          <div className="host-controls">
            {(!isLive || seminar.status === 'scheduled') && (
              <button
                className="start-seminar-btn"
                onClick={handleStartSeminar}
                disabled={seminar.status === 'ended'}
              >
                Semineri Başlat
              </button>
            )}
            {isLive && !isStreaming && (
              <button
                className="start-stream-btn"
                onClick={startStream}
                disabled={!isSocketConnected()}
              >
                {!isSocketConnected() ? 'Bağlantı Bekleniyor...' : 'Canlı Yayını Başlat'}
              </button>
            )}
            {isStreaming && (
              <button
                className="stop-stream-btn"
                onClick={stopStream}
              >
                Canlı Yayını Durdur
              </button>
            )}
            {isLive && (
              <button
                className="stop-seminar-btn"
                onClick={handleStopSeminar}
              >
                Semineri Bitir
              </button>
            )}
          </div>
        )}
      </div>

      <div className="seminar-livestream">
        {isHost && (
          <div className="broadcaster-view">
            <h3>Canlı Yayın Önizleme (Sunucu)</h3>
            <div className="video-container">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                controls={false}
                style={{ width: '100%', maxHeight: '70vh' }}
              />
            </div>
          </div>
        )}

        {!isHost && (
          <div className="viewer-view">
            <h3>Canlı Yayın</h3>
            <div className="video-container">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                controls
                style={{ width: '100%', maxHeight: '70vh' }}
              />
            </div>
          </div>
        )}

        {/* Live Transcript Display */}
        {isStreaming && (
          <div className="live-transcript-container">
            <h3>Canlı Metin Dönüşümü</h3>
            <div className="live-transcript">
                            {isHost ? (
                <div className="host-transcript">
                  <div className="recording-status">
                    {isRecording ? (
                      <div className="recording-active">
                        <span className="recording-indicator"></span>
                        Kayıt devam ediyor...
                      </div>
                    ) : (
                      <div>Kayıt durduruldu</div>
                    )}
                  </div>
                  <div className="transcript-text">
                    {recognizedText || <p className="placeholder">Konuşmanız burada görünecek...</p>}
                    {interimText && <p className="interim">{interimText}</p>}
                  </div>
                </div>
              ) : (
                <div className="viewer-transcript">
                  {recognizedText || <p className="placeholder">Metin dönüşümü burada görünecek...</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="seminar-container">
        <div className="seminar-content">
          <div className="content-area">
            <h2>Seminer İçeriği</h2>
            {!isLive && !seminar.content && (
              <div className="no-content">
                {canManageSeminar ?
                 "Henüz içerik eklenmemiş. Aşağıdan içerik ekleyebilirsiniz." :
                 "Henüz içerik eklenmemiş. İçerik seminer başladığında burada görünecek."
                }
              </div>
            )}
            {canManageSeminar ? (
              <div className="content-editor">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Seminer içeriğini buraya yazın..."
                  rows={10}
                />
                <button onClick={handleContentUpdate}>İçeriği Güncelle</button>
              </div>
            ) : (
              <div className="content-display">
                {seminar.content ? (
                  <div className="markdown-content">
                    {seminar.content}
                  </div>
                ) : (
                  <p>Henüz içerik eklenmemiş.</p>
                )}
              </div>
            )}
          </div>

          <div className="seminar-details">
            <h3>Seminer Detayları</h3>
            
            {/* Sadece değeri olan alanları göster */}
            {seminar.academicName && (
              <div className="details-item">
                <strong>Akademisyen:</strong> {seminar.academicName}
              </div>
            )}
            
            {seminar.category && (
              <div className="details-item">
                <strong>Kategori:</strong> {seminar.category}
              </div>
            )}
            
            {seminar.scheduledDate?.toDate && (
              <div className="details-item">
                <strong>Tarih:</strong> {seminar.scheduledDate.toDate().toLocaleString('tr-TR')}
              </div>
            )}
            
            {seminar.startedAt?.toDate && (
              <div className="details-item">
                <strong>Başlangıç:</strong> {seminar.startedAt.toDate().toLocaleString('tr-TR')}
              </div>
            )}
            
            {seminar.endedAt?.toDate && (
              <div className="details-item">
                <strong>Bitiş:</strong> {seminar.endedAt.toDate().toLocaleString('tr-TR')}
              </div>
            )}
            
            {(seminar.participantCount !== undefined && seminar.participantCount !== null) && (
              <div className="details-item">
                <strong>Katılımcı Sayısı:</strong> {seminar.participantCount}
              </div>
            )}

            {/* Connection Status - Her zaman göster */}
            <div className="details-item">
              <strong>Bağlantı Durumu:</strong> 
              <span className={`connection-status ${isSocketConnected() ? 'connected' : 'disconnected'}`}>
                {isSocketConnected() ? '🟢 Bağlı' : '🔴 Bağlantı Kesildi'}
              </span>
            </div>

            {canManageSeminar && (
              <div className="admin-actions">
                <h4>Yönetim İşlemleri</h4>
                <button
                  className="delete-seminar-btn"
                  onClick={handleDeleteSeminar}
                >
                  Semineri Sil
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="comments-section">
          <h2>Yorumlar</h2>
          <div className="comments-container">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className={`comment ${comment.userType}`}>
                  <div className="comment-header">
                    <span className="comment-author">{comment.authorName}</span>
                    {comment.timestamp?.toDate && (
                      <span className="comment-time">
                        {comment.timestamp.toDate().toLocaleString('tr-TR')}
                      </span>
                    )}
                    <span className="user-type-badge">
                      {comment.userType === 'academic' ? 'Akademisyen' :
                       comment.userType === 'student' ? 'Öğrenci' :
                       'Kullanıcı'}
                    </span>
                  </div>
                  <div className="comment-text">{comment.text}</div>
                </div>
              ))
            ) : (
              <div className="no-comments">
                <p>Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
              </div>
            )}
          </div>

          {currentUser ? (
            <form className="comment-form" onSubmit={handleCommentSubmit}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Yorumunuzu buraya yazın..."
                rows={3}
              />
              <button 
                type="submit"
                disabled={!newComment.trim() || !isSocketConnected()}
              >
                Yorum Gönder
              </button>
              {!isSocketConnected() && (
                <p className="connection-warning">
                  ⚠️ Bağlantı kesildi. Yorum göndermek için sayfayı yenileyin.
                </p>
              )}
            </form>
          ) : (
            <div className="login-to-comment">
              <p>Lütfen yorum yapmak için <Link to="/login">giriş yapın</Link>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeminarPage;


