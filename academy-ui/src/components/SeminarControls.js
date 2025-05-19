import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './SeminarControls.css';
import { collection, addDoc, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; // Firebase config dosyanızın yolunu doğru şekilde belirtin
import { useAuth } from '../context/AuthContext'; // Auth context'i import edin

const SeminarControls = ({ onCreateSeminar, onJoinSeminar, isAdmin = false, initialTab = 'join' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [seminarId, setSeminarId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [createdSeminarId, setCreatedSeminarId] = useState('');
  const [showCreatedInfo, setShowCreatedInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { action } = useParams();
  const { currentUser } = useAuth(); // Mevcut kullanıcıyı al
  
  useEffect(() => {
    if (action === 'create' && isAdmin) {
      setActiveTab('create');
    } else if (initialTab && (initialTab === 'join' || (initialTab === 'create' && isAdmin))) {
      setActiveTab(initialTab);
    }
  }, [action, isAdmin, initialTab]);
  
  const generateSeminarId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  };
  
  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!seminarId.trim()) {
      setError('Lütfen bir seminer ID girin');
      setLoading(false);
      return;
    }
    
    try {
      // Seminer ID'sinin veritabanında var olup olmadığını kontrol et
      const seminarRef = doc(db, "seminars", seminarId.trim());
      const seminarDoc = await getDoc(seminarRef);
      
      if (!seminarDoc.exists()) {
        setError('Geçersiz seminer ID. Böyle bir seminer bulunamadı.');
        setLoading(false);
        return;
      }
      
      // Kullanıcıyı katılımcı olarak ekle
      if (currentUser) {
        const seminarData = seminarDoc.data();
        const participants = seminarData.participants || [];
        
        // Kullanıcı zaten katılımcı listesinde var mı kontrol et
        const isAlreadyParticipant = participants.some(p => p.id === currentUser.uid);
        
        if (!isAlreadyParticipant) {
          // Katılımcı listesine ekle
          participants.push({
            id: currentUser.uid,
            name: currentUser.displayName || 'İsimsiz Kullanıcı',
            email: currentUser.email,
            joinedAt: new Date().toISOString()
          });
          
          // Semineri güncelle
          await setDoc(seminarRef, { 
            participants,
            lastUpdated: serverTimestamp()
          }, { merge: true });
        }
      }
      
      // Callback fonksiyonu varsa çağır
      if (onJoinSeminar) {
        onJoinSeminar(seminarId.trim());
      }
      
      // Seminer sayfasına yönlendir
      navigate(`/seminar/${seminarId.trim()}`);
    } catch (err) {
      console.error("Seminere katılırken hata:", err);
      setError('Seminere katılırken bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
      setLoading(false);
    }
  };
  
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (!title.trim()) {
      setError('Lütfen bir seminer başlığı girin');
      setLoading(false);
      return;
    }
    
    try {
      // Benzersiz bir seminer ID'si oluştur
      const newSeminarId = generateSeminarId();
      
      // Seminer veri objesi oluştur
      const seminarData = {
        id: newSeminarId,
        title: title.trim(),
        description: description.trim(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid || 'anonymous',
        hostName: currentUser?.displayName || 'İsimsiz Sunucu',
        hostEmail: currentUser?.email,
        participants: [], // Boş katılımcı dizisi başlat
        status: 'waiting', // Başlangıçta seminer beklemede
        content: '', // Boş içerik başlat
        lastUpdated: serverTimestamp()
      };
      
      // Firebase'e kaydet
      await setDoc(doc(db, "seminars", newSeminarId), seminarData);
      
      // Callback fonksiyonu varsa çağır
      if (onCreateSeminar) {
        onCreateSeminar(seminarData);
      }
      
      // Oluşturulan seminer bilgilerini göster
      setCreatedSeminarId(newSeminarId);
      setShowCreatedInfo(true);
      
      // Formu temizle
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error("Seminer oluştururken hata:", err);
      setError('Seminer oluştururken bir hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartSeminar = () => {
    if (createdSeminarId) {
      // Doğrudan seminer sayfasına yönlendir
      navigate(`/seminar/${createdSeminarId}`);
    }
  };
  
  const handleCancel = () => {
    navigate(-1); // Önceki sayfaya dön
  };
  
  return (
    <div className="seminar-controls">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'join' ? 'active' : ''}`}
          onClick={() => setActiveTab('join')}
        >
          Seminere Katıl
        </button>
        {isAdmin && (
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Seminer Oluştur
          </button>
        )}
      </div>
      
      <div className="tab-content">
        {error && <div className="error-message">{error}</div>}
        
        {activeTab === 'join' && !showCreatedInfo && (
          <form onSubmit={handleJoin} className="join-form">
            <div className="form-group">
              <label htmlFor="seminarId">Seminer ID</label>
              <input
                type="text"
                id="seminarId"
                value={seminarId}
                onChange={(e) => setSeminarId(e.target.value)}
                placeholder="Seminer ID'sini girin"
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Katılınıyor...' : 'Seminere Katıl'}
              </button>
              <button type="button" className="cancel-button" onClick={handleCancel} disabled={loading}>
                İptal
              </button>
            </div>
          </form>
        )}
        
        {activeTab === 'create' && isAdmin && !showCreatedInfo && (
          <form onSubmit={handleCreate} className="create-form">
            <div className="form-group">
              <label htmlFor="title">Seminer Başlığı</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Seminer başlığını girin"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Seminer Açıklaması (İsteğe Bağlı)</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Seminer açıklamasını girin"
                rows="4"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? 'Oluşturuluyor...' : 'Seminer Oluştur'}
              </button>
              <button type="button" className="cancel-button" onClick={handleCancel} disabled={loading}>
                İptal
              </button>
            </div>
          </form>
        )}
        
        {showCreatedInfo && (
          <div className="seminar-created-info">
            <h3>Seminer Başarıyla Oluşturuldu!</h3>
            <div className="seminar-id-display">
              <p>Seminer ID:</p>
              <div className="seminar-id-box">
                <span className="seminar-id">{createdSeminarId}</span>
                <button 
                  className="copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(createdSeminarId);
                    alert('Seminer ID kopyalandı!');
                  }}
                >
                  Kopyala
                </button>
              </div>
              <p className="seminar-id-info">
                Bu ID'yi katılımcılarla paylaşın. Katılımcılar bu ID'yi kullanarak seminere katılabilirler.
              </p>
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                className="submit-button"
                onClick={handleStartSeminar}
              >
                Seminere Başla
              </button>
              <button 
                type="button" 
                className="secondary-button"
                onClick={() => {
                  setShowCreatedInfo(false);
                  setActiveTab('join');
                }}
              >
                Başka Bir Seminere Katıl
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeminarControls;
