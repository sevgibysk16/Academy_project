import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './SeminarPage.css';
import Hls from 'hls.js';
import { 
  connectWebSocket, 
  joinSeminarRoom, 
  startStreaming, 
  stopStreaming, 
  onStreamData, 
  sendStreamData 
} from '../utils/socket';

const SeminarPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [seminar, setSeminar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [content, setContent] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const commentsEndRef = useRef(null);
  
  // Canlı yayın için gerekli state'ler
  const [stream, setStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const hlsRef = useRef(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  // Timestamp değerlerini güvenli bir şekilde formatlamak için yardımcı fonksiyon
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Belirtilmemiş";
    
    if (timestamp && typeof timestamp.toDate === 'function') {
      return new Date(timestamp.toDate()).toLocaleString();
    }
    
    if (timestamp instanceof Date || typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleString();
    }
    
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    
    return "Geçersiz tarih formatı";
  };

  // Kullanıcı rolünü ve semineri yükle
  useEffect(() => {
    if (!id || id === 'undefined') {
      setError("Geçersiz seminer ID. Lütfen doğru bir seminer bağlantısı kullanın.");
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserRole(userData.userType);
            console.log("Kullanıcı rolü:", userData.userType);
          }
        } catch (err) {
          console.error("Kullanıcı rolü alınırken hata:", err);
        }
      }
    };

    const fetchSeminar = async () => {
      try {
        console.log("Seminer yükleniyor, ID:", id);
        
        const seminarRef = doc(db, "seminars", id);
        const seminarSnap = await getDoc(seminarRef);
        
        if (!seminarSnap.exists()) {
          setError(`Seminer bulunamadı (ID: ${id})`);
          setLoading(false);
          return;
        }

        const seminarData = seminarSnap.data();
        console.log("Seminer verisi:", seminarData);
        
        setSeminar(seminarData);
        
        const isUserHost = currentUser && seminarData.createdBy === currentUser.uid;
        setIsHost(isUserHost);
        
        setIsLive(seminarData.status === 'live');
        
        if (seminarData.content) {
          setContent(seminarData.content);
        }

        if (seminarData.streamUrl) {
          setStreamUrl(seminarData.streamUrl);
          if (!isUserHost && Hls.isSupported()) {
            initializeHls(seminarData.streamUrl);
          }
        }
        
        const unsubscribeSeminar = onSnapshot(seminarRef, (doc) => {
          if (doc.exists()) {
            const updatedSeminar = doc.data();
            setSeminar(updatedSeminar);
            setIsLive(updatedSeminar.status === 'live');
            
            if (updatedSeminar.content) {
              setContent(updatedSeminar.content);
            }

            if (updatedSeminar.streamUrl) {
              setStreamUrl(updatedSeminar.streamUrl);
              if (!isUserHost && Hls.isSupported()) {
                initializeHls(updatedSeminar.streamUrl);
              }
            }
            
            if (typeof updatedSeminar.viewerCount === 'number') {
              setViewerCount(updatedSeminar.viewerCount);
            }
          }
        });
        
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
          
          if (isHost && isStreaming) {
            stopStream();
          }
          
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }
        };
      } catch (err) {
        console.error("Seminer yüklenirken hata:", err);
        setError(`Seminer yüklenirken bir hata oluştu: ${err.message}`);
        setLoading(false);
      }
    };

    fetchUserRole();
    fetchSeminar();
  }, [id, currentUser]);

  // Socket.IO bağlantısını başlat
  useEffect(() => {
    if (currentUser) {
      const socket = connectWebSocket(currentUser.uid);
      
      // Seminer odasına katıl
      if (id) {
        joinSeminarRoom(id, currentUser.uid, isHost);
      }

      return () => {
        socket.disconnect();
      };
    }
  }, [currentUser, id, isHost]);

  // HLS başlatma fonksiyonu
  const initializeHls = (url) => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    const hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 600,
      enableWorker: true,
      lowLatencyMode: true,
    });

    hlsRef.current = hls;

    hls.loadSource(url);
    hls.attachMedia(remoteVideoRef.current);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      remoteVideoRef.current.play().catch(err => {
        console.error("Video oynatma hatası:", err);
      });
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log("Ağ hatası, yeniden bağlanılıyor...");
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log("Medya hatası, yeniden yükleniyor...");
            hls.recoverMediaError();
            break;
          default:
            console.log("Kurtarılamaz hata, yeniden başlatılıyor...");
            hls.destroy();
            initializeHls(url);
            break;
        }
      }
    });
  };

  // Canlı yayın başlatma
  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          sendStreamData(id, event.data);
        }
      };

      recorder.start(100); // Her 100ms'de bir veri gönder
      setMediaRecorder(recorder);
      setIsStreaming(true);
      startStreaming(id, currentUser.uid);

    } catch (err) {
      console.error("Yayın başlatma hatası:", err);
      alert("Kamera ve mikrofon izinlerini kontrol edin.");
    }
  };

  // Canlı yayını durdurma
  const stopStream = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    setMediaRecorder(null);
    setIsStreaming(false);
    stopStreaming(id, currentUser.uid);
  };

  // Yayın verilerini dinle
  useEffect(() => {
    if (!isHost) {
      onStreamData((data) => {
        if (remoteVideoRef.current) {
          const blob = new Blob([data], { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          remoteVideoRef.current.src = url;
        }
      });
    }
  }, [isHost]);

  // Yorum gönderme
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim() || !currentUser) return;
    try {
      const commentData = {
        text: newComment.trim(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'İsimsiz Kullanıcı',
        userType: userRole || 'unknown',
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, "seminars", id, "comments"), commentData);
      setNewComment('');
    } catch (err) {
      console.error("Yorum gönderilirken hata:", err);
      alert("Yorum gönderilemedi. Lütfen tekrar deneyin.");
    }
  };

  // İçerik güncelleme - Sadece akademisyenler için
  const handleContentUpdate = async () => {
    if (!isHost || userRole !== 'academic') return;
    
    try {
      await updateDoc(doc(db, "seminars", id), {
        content: content,
        lastUpdated: serverTimestamp()
      });
      
      alert("İçerik başarıyla güncellendi!");
    } catch (err) {
      console.error("İçerik güncellenirken hata:", err);
      alert("İçerik güncellenemedi. Lütfen tekrar deneyin.");
    }
  };

  // Semineri başlatma - Sadece akademisyenler için
  const handleStartSeminar = async () => {
    if (!isHost || userRole !== 'academic') return;
    
    try {
      await updateDoc(doc(db, "seminars", id), {
        status: 'live',
        startedAt: serverTimestamp()
      });
      
      setIsLive(true);
      alert("Seminer başarıyla başlatıldı! Şimdi canlı yayını başlatabilirsiniz.");
    } catch (err) {
      console.error("Seminer başlatılırken hata:", err);
      alert("Seminer başlatılamadı. Lütfen tekrar deneyin.");
    }
  };

  // Semineri durdurma - Sadece akademisyenler için
  const handleStopSeminar = async () => {
    if (!isHost || userRole !== 'academic') return;
    
    if (window.confirm("Semineri durdurmak istediğinize emin misiniz?")) {
      try {
        if (isStreaming) {
          stopStream();
        }
        
        await updateDoc(doc(db, "seminars", id), {
          status: 'ended',
          endedAt: serverTimestamp(),
          isStreaming: false
        });
        
        setIsLive(false);
        alert("Seminer başarıyla durduruldu!");
      } catch (err) {
        console.error("Seminer durdurulurken hata:", err);
        alert("Seminer durdurulamadı. Lütfen tekrar deneyin.");
      }
    }
  };

  // Semineri silme - Sadece akademisyenler için
  const handleDeleteSeminar = async () => {
    if (!isHost || userRole !== 'academic') return;
    
    if (window.confirm("Semineri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      try {
        if (isStreaming) {
          stopStream();
        }
        
        await deleteDoc(doc(db, "seminars", id));
        alert("Seminer başarıyla silindi!");
        navigate('/seminar');
      } catch (err) {
        console.error("Seminer silinirken hata:", err);
        alert("Seminer silinemedi. Lütfen tekrar deneyin.");
      }
    }
  };

  if (loading) {
    return (
      <div className="seminar-loading">
        <p>Seminer yükleniyor...</p>
        <p className="seminar-loading-id">Seminer ID: {id || "Belirtilmedi"}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seminar-error">
        <h2>Hata</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={() => navigate('/')}>Ana Sayfaya Dön</button>
          <button onClick={() => navigate('/seminar')}>Seminer Sayfasına Dön</button>
        </div>
      </div>
    );
  }

  if (!seminar) {
    return (
      <div className="seminar-not-found">
        <h2>Seminer Bulunamadı</h2>
        <p>ID: {id}</p>
        <div className="error-actions">
          <button onClick={() => navigate('/')}>Ana Sayfaya Dön</button>
          <button onClick={() => navigate('/seminar')}>Seminer Sayfasına Dön</button>
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
          <span>Oluşturulma: {formatTimestamp(seminar.createdAt)}</span>
          
          <span className={`seminar-status ${seminar.status}`}>
            {seminar.status === 'live' ? '🔴 CANLI' :
              seminar.status === 'ended' ? '⚫ Sonlandırıldı' :
              seminar.status === 'scheduled' ? '🕒 Planlandı' :
              '⚪ Hazırlanıyor'}
          </span>
          
          {seminar.isStreaming && (
            <span className="streaming-status">📹 Canlı Yayın Aktif</span>
          )}
          
          {seminar.viewerCount > 0 && (
            <span className="viewer-count">👁️ {seminar.viewerCount} İzleyici</span>
          )}
        </div>
        
        {canManageSeminar && (
          <div className="host-controls">
            {!isLive && seminar.status !== 'ended' && (
              <button 
                className="start-seminar-btn"
                onClick={handleStartSeminar}
              >
                Seminer Kaydını Başlat
              </button>
            )}
            
            {isLive && !isStreaming && (
              <button 
                className="start-stream-btn"
                onClick={startStream}
              >
                Canlı Yayını Başlat
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
                Semineri Sonlandır
              </button>
            )}
          </div>
        )}
        
        {!canManageSeminar && (
          <div className="seminar-status-info">
            {seminar.status === 'live' ? (
              <div className="live-indicator">🔴 Bu seminer şu anda canlı olarak yayınlanıyor</div>
            ) : seminar.status === 'ended' ? (
              <div className="ended-indicator">⚫ Bu seminer sonlandırılmıştır</div>
            ) : (
              <div className="waiting-indicator">⚪ Bu seminer henüz başlatılmadı</div>
            )}
          </div>
        )}
      </div>
      
      <div className="seminar-livestream">
        {canManageSeminar && (
          <div className="broadcaster-view">
            <h3>Canlı Yayın Önizleme</h3>
            <div className="video-container">
              <video 
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', maxHeight: '70vh' }}
              />
            </div>
            {!isStreaming ? (
              <button onClick={startStream}>Yayını Başlat</button>
            ) : (
              <button onClick={stopStream}>Yayını Durdur</button>
            )}
          </div>
        )}
        
        {!canManageSeminar && (
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
      </div>
      
      <div className="seminar-container">
        <div className="seminar-content">
          <div className="content-area">
            <h2>Seminer İçeriği</h2>
            
            {!isLive && !seminar.content && (
              <div className="no-content">
                {canManageSeminar ? 
                  "Henüz içerik eklenmedi. Aşağıdan içerik ekleyebilirsiniz." : 
                  "Seminer henüz başlatılmadı. Lütfen bekleyin."}
              </div>
            )}
            
            {(isLive || seminar.content) && (
              <div className="content-display">
                <div dangerouslySetInnerHTML={{ __html: seminar.content || '<p>Seminer içeriği yükleniyor...</p>' }} />
              </div>
            )}

            {canManageSeminar && (
              <div className="content-editor">
                <h3>İçerik Düzenle</h3>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Seminer içeriğini buraya girin (HTML formatında yazabilirsiniz)"
                  rows={10}
                />
                <button onClick={handleContentUpdate}>İçeriği Güncelle</button>
                <p className="editor-tip">
                  İpucu: Metin içinde HTML etiketleri kullanabilirsiniz. Örneğin: &lt;h3&gt;Başlık&lt;/h3&gt;, &lt;p&gt;Paragraf&lt;/p&gt;, &lt;ul&gt;&lt;li&gt;Madde&lt;/li&gt;&lt;/ul&gt;
                </p>
              </div>
            )}
          </div>

          <div className="seminar-description">
            <h3>Seminer Açıklaması</h3>
            <p>{seminar.description || "Açıklama bulunmuyor."}</p>
          </div>
        </div>

        <div className="comments-section">
          <h2>Yorumlar</h2>
          <div className="comments-container">
            {comments.length === 0 ? (
              <p className="no-comments">Henüz yorum yapılmamış.</p>
            ) : (
              <div className="comments-list">
                {comments.map((comment) => (
                  <div key={comment.id} className="comment">
                    <div className="comment-header">
                      <div className="comment-avatar-placeholder">{comment.authorName?.charAt(0) || '?'}</div>
                      <span className="comment-author">
                        {comment.authorName || 'Anonim'}
                        {comment.userType === 'academic' && <span className="academic-badge">Akademisyen</span>}
                      </span>
                      <span className="comment-time">
                        {formatTimestamp(comment.timestamp)}
                      </span>
                    </div>
                    <div className="comment-text">{comment.text}</div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}
          </div>
          
          <form className="comment-form" onSubmit={handleCommentSubmit}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Yorum yazın..."
              disabled={seminar.status === 'ended' || !currentUser}
            />
            <button 
              type="submit"
              disabled={!newComment.trim() || seminar.status === 'ended' || !currentUser}
            >
              Gönder
            </button>
            {!currentUser && <p className="login-required">Yorum yapmak için giriş yapmalısınız.</p>}
          </form>
        </div>
      </div>
      
      <div className="seminar-participants">
        <h3>Katılımcılar</h3>
        {seminar.participants && seminar.participants.length > 0 ? (
          <div className="participants-list">
            {seminar.participants.map((participant, index) => (
              <div key={index} className="participant">
                <div className="participant-avatar">{participant.name?.charAt(0) || '?'}</div>
                <span>{participant.name || 'Anonim Katılımcı'}</span>
                {participant.userType === 'academic' && <span className="academic-badge">Akademisyen</span>}
              </div>
            ))}
          </div>
        ) : (
          <p>Henüz katılımcı bulunmuyor.</p>
        )}
      </div>
      
      <div className="seminar-share">
        <h3>Seminere Katılım Bağlantısı</h3>
        <div className="share-link-container">
          <input 
            type="text"
            readOnly
            value={window.location.href}
            className="share-link"
          />
          <button 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Bağlantı panoya kopyalandı!");
            }}
            className="copy-link-btn"
          >
            Kopyala
          </button>
        </div>
        <p className="share-tip">Bu bağlantıyı paylaşarak diğer kullanıcıları seminere davet edebilirsiniz.</p>
      </div>
      
      {canManageSeminar && (
        <div className="seminar-management">
          <h3>Seminer Yönetimi</h3>
          <div className="management-options">
            <button 
              onClick={() => navigate(`/seminar/edit/${id}`)}
              className="edit-seminar-btn"
            >
              Semineri Düzenle
            </button>
            
            <button 
              onClick={handleDeleteSeminar}
              className="delete-seminar-btn"
            >
              Semineri Sil
            </button>
          </div>
          
          <div className="seminar-statistics">
            <h4>İstatistikler</h4>
            <ul>
              <li>Toplam Katılımcı: {seminar.participants?.length || 0}</li>
              <li>Toplam Yorum: {comments.length}</li>
              <li>Oluşturulma Tarihi: {formatTimestamp(seminar.createdAt)}</li>
              {seminar.startedAt && (
                <li>Başlangıç Tarihi: {formatTimestamp(seminar.startedAt)}</li>
              )}
              {seminar.endedAt && (
                <li>Bitiş Tarihi: {formatTimestamp(seminar.endedAt)}</li>
              )}
              {seminar.isStreaming && (
                <li>Canlı Yayın Başlangıç: {formatTimestamp(seminar.streamStartedAt)}</li>
              )}
              {seminar.streamEndedAt && (
                <li>Canlı Yayın Bitiş: {formatTimestamp(seminar.streamEndedAt)}</li>
              )}
              {seminar.viewerCount > 0 && (
                <li>İzleyici Sayısı: {seminar.viewerCount}</li>
              )}
            </ul>
          </div>
        </div>
      )}
      
      <div className="livestream-info">
        <h3>Canlı Yayın Hakkında</h3>
        <div className="info-content">
          <p>Bu seminer platformunda, akademisyenler canlı yayın yaparak bilgi ve deneyimlerini paylaşabilirler.</p>
          
          {canManageSeminar && (
            <div className="host-info">
              <h4>Yayıncı Bilgileri</h4>
              <ul>
                <li>Semineri başlatmak için "Seminer Kaydını Başlat" butonuna tıklayın.</li>
                <li>Canlı yayını başlatmak için "Canlı Yayını Başlat" butonuna tıklayın ve kamera/mikrofon izinlerini onaylayın.</li>
                <li>Yayın sırasında içeriği güncelleyebilir ve yorumları yanıtlayabilirsiniz.</li>
                <li>Yayını durdurmak için "Canlı Yayını Durdur" butonuna tıklayın.</li>
                <li>Semineri tamamen sonlandırmak için "Semineri Sonlandır" butonuna tıklayın.</li>
              </ul>
            </div>
          )}
          
          {!canManageSeminar && (
            <div className="viewer-info">
              <h4>İzleyici Bilgileri</h4>
              <ul>
                <li>Canlı yayın başladığında otomatik olarak görüntülenecektir.</li>
                <li>Yayın sırasında yorumlar yaparak etkileşimde bulunabilirsiniz.</li>
                <li>Ses seviyesini ayarlamak için video kontrol panelini kullanabilirsiniz.</li>
                <li>Yayın kalitesi internet bağlantınıza göre otomatik olarak ayarlanacaktır.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeminarPage; 