import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import '../../styles/videoconference.css';

const VideoConference = ({ seminarId, currentUser }) => {
  const [peers, setPeers] = useState([]);
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [seminarActive, setSeminarActive] = useState(true);
  
  const socketRef = useRef();
  const userVideo = useRef();
  const peersRef = useRef([]);
  const screenTrackRef = useRef();
  const db = getFirestore();

  // Kullanıcının admin olup olmadığını kontrol et
  useEffect(() => {
    const checkIfAdmin = async () => {
      try {
        const seminarRef = doc(db, 'seminars', seminarId);
        const seminarDoc = await getDoc(seminarRef);
        
        if (seminarDoc.exists()) {
          const seminarData = seminarDoc.data();
          // Eğer semineri oluşturan kişi ile giriş yapan kişi aynıysa admin olarak işaretle
          setIsAdmin(seminarData.createdBy === currentUser.uid);
          setSeminarActive(seminarData.active !== false); // Seminar aktif mi kontrol et
        }
      } catch (error) {
        console.error("Admin kontrolü sırasında hata:", error);
      }
    };
    
    checkIfAdmin();
  }, [seminarId, currentUser.uid, db]);

  useEffect(() => {
    if (!seminarActive) {
      return; // Seminar aktif değilse bağlantı kurma
    }
    
    socketRef.current = io.connect('http://localhost:5000');
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setStream(stream);
        userVideo.current.srcObject = stream;
        
        socketRef.current.emit('join-room', seminarId, currentUser.uid, isAdmin);
        
        socketRef.current.on('user-connected', (userId, userIsAdmin) => {
          const peer = createPeer(userId, socketRef.current.id, stream);
          peersRef.current.push({
            peerId: userId,
            peer,
            isAdmin: userIsAdmin
          });
          setPeers(prevPeers => [...prevPeers, { peerId: userId, peer, isAdmin: userIsAdmin }]);
        });
        
        socketRef.current.on('signal', data => {
          const item = peersRef.current.find(p => p.peerId === data.userId);
          if (item) {
            item.peer.signal(data.signal);
          }
        });
        
        socketRef.current.on('user-disconnected', userId => {
          const peerObj = peersRef.current.find(p => p.peerId === userId);
          if (peerObj) {
            peerObj.peer.destroy();
          }
          const peers = peersRef.current.filter(p => p.peerId !== userId);
          peersRef.current = peers;
          setPeers(peers);
        });
        
        socketRef.current.on('receive-message', message => {
          setMessages(prevMessages => [...prevMessages, message]);
        });
        
        socketRef.current.on('seminar-ended', () => {
          setSeminarActive(false);
          alert('Seminer yönetici tarafından sonlandırıldı.');
        });
      })
      .catch(err => {
        console.error("Error accessing media devices:", err);
      });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
      }
    };
  }, [seminarId, currentUser, isAdmin, seminarActive]);

  function createPeer(userToSignal, callerId, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });
    
    peer.on('signal', signal => {
      socketRef.current.emit('signal', { userId: callerId, to: userToSignal, signal });
    });
    
    return peer;
  }

  function addPeer(incomingSignal, callerId, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });
    
    peer.on('signal', signal => {
      socketRef.current.emit('signal', { userId: socketRef.current.id, to: callerId, signal });
    });
    
    peer.signal(incomingSignal);
    return peer;
  }

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now(),
      text: newMessage,
      sender: currentUser.displayName || currentUser.email,
      timestamp: new Date(),
      isAdmin: isAdmin
    };
    
    socketRef.current.emit('send-message', seminarId, message);
    setMessages(prevMessages => [...prevMessages, message]);
    setNewMessage('');
    
    // Firebase'e mesajı kaydet
    try {
      await addDoc(collection(db, 'seminarQuestions'), {
        seminarId,
        text: message.text,
        sender: message.sender,
        isAdmin: isAdmin,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Mesaj veritabanına kaydedilirken hata oluştu:", error);
    }
  };

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const shareScreen = () => {
    if (!screenShare) {
      navigator.mediaDevices.getDisplayMedia({ cursor: true })
        .then(screenStream => {
          const screenTrack = screenStream.getTracks()[0];
          screenTrackRef.current = screenTrack;
          
          peersRef.current.forEach(({ peer }) => {
            peer.replaceTrack(
              stream.getVideoTracks()[0],
              screenTrack,
              stream
            );
          });
          
          screenTrack.onended = () => {
            peersRef.current.forEach(({ peer }) => {
              peer.replaceTrack(
                screenTrack,
                stream.getVideoTracks()[0],
                stream
              );
            });
            userVideo.current.srcObject = stream;
            setScreenShare(false);
          };
          
          userVideo.current.srcObject = screenStream;
          setScreenShare(true);
        })
        .catch(err => {
          console.error("Error sharing screen:", err);
        });
    } else {
      screenTrackRef.current.stop();
      userVideo.current.srcObject = stream;
      setScreenShare(false);
    }
  };

  const endSeminar = async () => {
    if (window.confirm('Semineri sonlandırmak istediğinize emin misiniz?')) {
      try {
        // Firebase'de seminerin durumunu güncelle
        const seminarRef = doc(db, 'seminars', seminarId);
        await updateDoc(seminarRef, {
          active: false,
          endedAt: serverTimestamp()
        });
        
        // Tüm katılımcılara seminerin bittiğini bildir
        socketRef.current.emit('end-seminar', seminarId);
        setSeminarActive(false);
      } catch (error) {
        console.error("Seminer sonlandırılırken hata oluştu:", error);
      }
    }
  };

  if (!seminarActive) {
    return (
      <div className="seminar-ended">
        <h2>Bu seminer sonlandırılmıştır.</h2>
        {isAdmin && <p>Seminer başarıyla sonlandırıldı.</p>}
        {!isAdmin && <p>Seminer yönetici tarafından sonlandırılmıştır.</p>}
      </div>
    );
  }

  return (
    <div className="video-conference-container">
      <div className="main-content">
        <div className="video-grid">
          <div className="video-container main-video">
            <video ref={userVideo} autoPlay muted playsInline />
            <div className="user-name">
              {currentUser.displayName || currentUser.email} {isAdmin ? '(Yönetici)' : '(Siz)'}
            </div>
          </div>
          {peers.map((peer, index) => (
            <Video 
              key={peer.peerId}
              peer={peer.peer}
              index={index}
              isAdmin={peer.isAdmin}
            />
          ))}
        </div>
        
        <div className="conference-controls">
          <button 
            className={`control-button ${audioEnabled ? 'active' : 'inactive'}`}
            onClick={toggleAudio}
          >
            {audioEnabled ? 'Mikrofonu Kapat' : 'Mikrofonu Aç'}
          </button>
          <button 
            className={`control-button ${videoEnabled ? 'active' : 'inactive'}`}
            onClick={toggleVideo}
          >
            {videoEnabled ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
          </button>
          <button 
            className={`control-button ${screenShare ? 'active' : ''}`}
            onClick={shareScreen}
          >
            {screenShare ? 'Ekran Paylaşımını Durdur' : 'Ekranı Paylaş'}
          </button>
          
          {isAdmin && (
            <button 
              className="control-button end-seminar"
              onClick={endSeminar}
            >
              Semineri Sonlandır
            </button>
          )}
        </div>
      </div>
      
      <div className="chat-container">
        <div className="chat-messages">
          {messages.length === 0 ? (
            <p className="no-messages">Henüz mesaj yok.</p>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`message ${message.sender === (currentUser.displayName || currentUser.email) ? 'own-message' : ''} ${message.isAdmin ? 'admin-message' : ''}`}
              >
                <div className="message-header">
                  <span className="message-sender">
                    {message.sender} {message.isAdmin ? '(Yönetici)' : ''}
                  </span>
                  <span className="message-time">
                    {new Intl.DateTimeFormat('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(message.timestamp)}
                  </span>
                </div>
                <div className="message-text">{message.text}</div>
              </div>
            ))
          )}
        </div>
        <form className="chat-input" onSubmit={handleSendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Mesajınızı yazın..."
          />
          <button type="submit">Gönder</button>
        </form>
      </div>
    </div>
  );
};

const Video = ({ peer, index, isAdmin }) => {
  const ref = useRef();
  
  useEffect(() => {
    peer.on('stream', stream => {
      ref.current.srcObject = stream;
    });
  }, [peer]);
  
  return (
    <div className="video-container peer-video">
      <video ref={ref} autoPlay playsInline />
      <div className="user-name">
        Katılımcı {index + 1} {isAdmin ? '(Yönetici)' : ''}
      </div>
    </div>
  );
};

export default VideoConference;
