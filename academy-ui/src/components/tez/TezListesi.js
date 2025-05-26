import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, startAfter, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import '../../styles/tezlistesi.css';
import ChatBot from '../../components/ChatBot';

const TezListesi = () => {
  const [tezler, setTezler] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sonTez, setSonTez] = useState(null);
  const [dahaFazlaVar, setDahaFazlaVar] = useState(true);
  const [filtre, setFiltre] = useState('hepsi');
  const [arama, setArama] = useState('');
  
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const TEZ_SAYISI = 9; // Bir sayfada gösterilecek tez sayısı
  
  useEffect(() => {
    tezleriGetir();
  }, [filtre]);
  
  const tezleriGetir = async (sonrakiSayfa = false) => {
    try {
      setLoading(true);
      
      let tezQuery;
      
      // Filtreleme sorgusu oluştur
      if (filtre === 'hepsi') {
        tezQuery = query(
          collection(db, 'tezler'),
          orderBy('yuklemeTarihi', 'desc'),
          limit(TEZ_SAYISI)
        );
      } else {
        // where koşulunu ayrı bir değişkene alıp, sonra query'ye ekleyelim
        const filtreKosulu = where('sunum', '==', filtre);
        tezQuery = query(
          collection(db, 'tezler'),
          filtreKosulu,
          orderBy('yuklemeTarihi', 'desc'),
          limit(TEZ_SAYISI)
        );
      }
      
      // Sonraki sayfa için sorgu
      if (sonrakiSayfa && sonTez) {
        if (filtre === 'hepsi') {
          tezQuery = query(
            collection(db, 'tezler'),
            orderBy('yuklemeTarihi', 'desc'),
            startAfter(sonTez),
            limit(TEZ_SAYISI)
          );
        } else {
          const filtreKosulu = where('sunum', '==', filtre);
          tezQuery = query(
            collection(db, 'tezler'),
            filtreKosulu,
            orderBy('yuklemeTarihi', 'desc'),
            startAfter(sonTez),
            limit(TEZ_SAYISI)
          );
        }
      }
      
      const tezSnapshot = await getDocs(tezQuery);
      
      // Daha fazla tez var mı kontrol et
      if (tezSnapshot.docs.length < TEZ_SAYISI) {
        setDahaFazlaVar(false);
      } else {
        setDahaFazlaVar(true);
      }
      
      // Son tezi kaydet (sonraki sayfa için)
      const sonDoc = tezSnapshot.docs[tezSnapshot.docs.length - 1];
      setSonTez(sonDoc);
      
      const yeniTezler = tezSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (sonrakiSayfa) {
        setTezler(prevTezler => [...prevTezler, ...yeniTezler]);
      } else {
        setTezler(yeniTezler);
      }
      
    } catch (err) {
      console.error('Tezler alınırken hata oluştu:', err);
      setError('Tezler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };
  
  const dahaFazlaYukle = () => {
    tezleriGetir(true);
  };
  
  const handleFiltreChange = (e) => {
    setFiltre(e.target.value);
    setSonTez(null);
    setDahaFazlaVar(true);
  };
  
  const handleAramaChange = (e) => {
    setArama(e.target.value);
  };
  
  // Arama filtreleme fonksiyonu
  const filtrelenmisVeAranmisTezler = tezler.filter(tez => {
    const aramaMetni = arama.toLowerCase();
    return (
      tez.baslik.toLowerCase().includes(aramaMetni) ||
      tez.aciklama.toLowerCase().includes(aramaMetni) ||
      tez.akademisyenAdi.toLowerCase().includes(aramaMetni)
    );
  });
  
  // Medya tipine göre thumbnail oluşturan yardımcı fonksiyon
  const getThumbnail = (tez) => {
    if (tez.medyaTipi === 'youtube') {
      const videoId = getYouTubeVideoId(tez.medyaURL);
      return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '/video-placeholder.jpg';
    } else if (tez.medyaTipi === 'vimeo') {
      // Vimeo için thumbnail elde etmek daha karmaşık, basit bir placeholder kullanıyoruz
      return '/video-placeholder.jpg';
    } else if (tez.medyaTipi === 'soundcloud') {
      return '/audio-placeholder.jpg';
    }
    return '/default-placeholder.jpg';
  };
  
  // YouTube video ID'sini çıkaran yardımcı fonksiyon
  const getYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };
  
  // Kullanıcı durumunu kontrol et
  const isAcademic = currentUser?.userType === 'academic';
  
  return (
    <div className="tez-listesi-container">
      <div className="tez-listesi-header">
        <h1>Tez Sunumları</h1>
        
        {/* Sadece akademisyenler için "Yeni Tez Yükle" butonu göster */}
        {isAcademic && (
          <Link to="/yeni-tez" className="yeni-tez-btn">
            <i className="fas fa-plus"></i> Yeni Tez Yükle
          </Link>
        )}
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="filtre-arama-container">
        <div className="filtre-container">
          <label htmlFor="filtre">Filtrele:</label>
          <select
            id="filtre"
            value={filtre}
            onChange={handleFiltreChange}
          >
            <option value="hepsi">Tüm Sunumlar</option>
            <option value="tez_savunma">Tez Savunma</option>
            <option value="tez_oneri">Tez Öneri</option>
          </select>
        </div>
        
        <div className="arama-container">
          <input
            type="text"
            placeholder="Tez ara..."
            value={arama}
            onChange={handleAramaChange}
            className="arama-input"
          />
        </div>
      </div>
      
      {loading && tezler.length === 0 ? (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Tezler yükleniyor...</p>
        </div>
      ) : filtrelenmisVeAranmisTezler.length > 0 ? (
        <>
          <div className="tez-cards">
            {filtrelenmisVeAranmisTezler.map(tez => (
              <Link to={`/tez/${tez.id}`} key={tez.id} className="tez-card">
                <div className="tez-card-image">
                  <img 
                    src={getThumbnail(tez)}
                    alt={tez.baslik}
                    style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                  />
                </div>
                <div className="tez-card-content">
                  <h3 className="tez-title">{tez.baslik}</h3>
                  <p className="tez-description">
                    {tez.aciklama.length > 100
                      ? `${tez.aciklama.substring(0, 100)}...`
                      : tez.aciklama}
                  </p>
                  <div className="tez-meta">
                    <span>{tez.akademisyenAdi}</span>
                    <span>{tez.yuklemeTarihi?.toDate().toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div className="tez-type">
                    <span className={`tez-type-badge tez-type-${tez.sunum}`}>
                      {tez.sunum === 'tez_savunma' ? 'Tez Savunma' :
                        tez.sunum === 'tez_oneri' ? 'Tez Öneri' : tez.sunum}
                    </span>
                    <span className={`transkript-status transkript-${tez.transkriptDurumu}`}>
                      {tez.transkriptDurumu === 'tamamlandi' ? 'Transkript Hazır' :
                        tez.transkriptDurumu === 'beklemede' ? 'Transkript Hazırlanıyor' :
                        'Transkript Hatası'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {dahaFazlaVar && !arama && (
            <div className="daha-fazla-container">
              <button 
                onClick={dahaFazlaYukle}
                className="daha-fazla-btn"
                disabled={loading}
              >
                {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="no-tez-message">
          <p>Hiç tez bulunamadı.</p>
          {/* Sadece akademisyenler için "İlk Tezi Sen Yükle" butonu göster */}
          {isAcademic && (
            <div className="no-tez-action">
              <Link to="/yeni-tez" className="yeni-tez-btn-alt">
                <i className="fas fa-plus"></i> İlk Tezi Sen Yükle
              </Link>
            </div>
          )}
        </div>
      )}
       <ChatBot />
    </div>
  );
};

export default TezListesi;
