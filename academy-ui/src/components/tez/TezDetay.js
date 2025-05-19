import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, increment, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { generateTranscript, highlightComment, improveTranscript } from '../../utils/geminiAİ';
import '../../styles/tezdetay.css';

const TezDetay = () => {
  const { tezId } = useParams();
  const [tez, setTez] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [yorum, setYorum] = useState('');
  const [yorumGonderiliyor, setYorumGonderiliyor] = useState(false);
  const [transkriptGosteriliyor, setTranskriptGosteriliyor] = useState(false);
  const [transkriptYukleniyor, setTranskriptYukleniyor] = useState(false);
  const [transkriptIyilestiriliyor, setTranskriptIyilestiriliyor] = useState(false);
  const [highlightedComments, setHighlightedComments] = useState({});
  
  const navigate = useNavigate();
  const { currentUser, userDetails } = useAuth();

  useEffect(() => {
    const tezRef = doc(db, 'tezler', tezId);
    // Tez verisini gerçek zamanlı olarak dinle
    const unsubscribe = onSnapshot(tezRef, async (docSnap) => {
      if (docSnap.exists()) {
        const tezData = { id: docSnap.id, ...docSnap.data() };
        setTez(tezData);
        
        // Yorumları işle ve highlight et
        if (tezData.yorumlar && tezData.yorumlar.length > 0) {
          processComments(tezData.yorumlar);
        }
        
        setLoading(false);
      } else {
        setError('Tez bulunamadı.');
        setLoading(false);
      }
    }, (err) => {
      console.error('Tez verisi alınırken hata oluştu:', err);
      setError('Tez yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      setLoading(false);
    });

    // Görüntüleme sayısını artır
    const artirGoruntulemeSayisi = async () => {
      try {
        await updateDoc(tezRef, {
          goruntulemeSayisi: increment(1)
        });
      } catch (err) {
        console.error('Görüntüleme sayısı artırılırken hata oluştu:', err);
      }
    };

    artirGoruntulemeSayisi();
    return () => unsubscribe();
  }, [tezId]);

  // Yorumları işle ve highlight et
  const processComments = async (yorumlar) => {
    const newHighlightedComments = { ...highlightedComments };
    
    for (const yorum of yorumlar) {
      // Eğer bu yorum daha önce işlenmediyse
      if (!newHighlightedComments[yorum.id] && tez?.transkript) {
        try {
          const highlighted = await highlightComment(tez.transkript, yorum.yorum);
          newHighlightedComments[yorum.id] = highlighted;
        } catch (err) {
          console.error('Yorum işlenirken hata oluştu:', err);
          newHighlightedComments[yorum.id] = null; // Hata durumunda null olarak işaretle
        }
      }
    }
    
    setHighlightedComments(newHighlightedComments);
  };

  const handleYorumSubmit = async (e) => {
    e.preventDefault();
    
    if (!yorum.trim()) return;
    if (!currentUser) {
      alert('Yorum yapabilmek için giriş yapmalısınız.');
      navigate('/giris');
      return;
    }
    
    try {
      setYorumGonderiliyor(true);
      
      const yeniYorum = {
        id: Date.now().toString(),
        kullaniciId: currentUser.uid,
        kullaniciAdi: userDetails?.displayName || 'Anonim Kullanıcı',
        yorum: yorum.trim(),
        tarih: new Date()
      };
      
      const tezRef = doc(db, 'tezler', tezId);
      await updateDoc(tezRef, {
        yorumlar: arrayUnion(yeniYorum)
      });
      
      setYorum('');
    } catch (err) {
      console.error('Yorum gönderilirken hata oluştu:', err);
      alert('Yorum gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setYorumGonderiliyor(false);
    }
  };

  const handleTranskriptOlustur = async () => {
    if (!tez || !tez.medyaURL) {
      alert('Transkript oluşturmak için geçerli bir medya URL\'si gereklidir.');
      return;
    }
    
    // Sadece akademisyenler ve tezi yükleyen kişi transkript oluşturabilir
    if (!currentUser || (userDetails?.userType !== 'academic' && currentUser.uid !== tez.yukleyenId)) {
      alert('Transkript oluşturma yetkiniz bulunmamaktadır.');
      return;
    }
    
    try {
      setTranskriptYukleniyor(true);
      
      // Gemini API ile transkript oluştur
      const transkript = await generateTranscript(tez.medyaURL, tez.medyaTipi);
      
      // Firestore'da tez belgesini güncelle
      const tezRef = doc(db, 'tezler', tezId);
      await updateDoc(tezRef, {
        transkript: transkript,
        transkriptDurumu: 'tamamlandi',
        sonGuncelleme: new Date()
      });
      
      alert('Transkript başarıyla oluşturuldu!');
    } catch (err) {
      console.error('Transkript oluşturulurken hata oluştu:', err);
      alert('Transkript oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      
      // Hata durumunda transkript durumunu güncelle
      const tezRef = doc(db, 'tezler', tezId);
      await updateDoc(tezRef, {
        transkriptDurumu: 'hata',
        sonGuncelleme: new Date()
      });
    } finally {
      setTranskriptYukleniyor(false);
    }
  };

  const handleTranskriptIyilestir = async () => {
    if (!tez || !tez.transkript) {
      alert('İyileştirmek için mevcut bir transkript gereklidir.');
      return;
    }
    
    // Sadece akademisyenler ve tezi yükleyen kişi transkripti iyileştirebilir
    if (!currentUser || (userDetails?.userType !== 'academic' && currentUser.uid !== tez.yukleyenId)) {
      alert('Transkript iyileştirme yetkiniz bulunmamaktadır.');
      return;
    }
    
    try {
      setTranskriptIyilestiriliyor(true);
      
      // Gemini API ile transkripti iyileştir
      const iyilestirilmisTranskript = await improveTranscript(tez.transkript);
      
      // Firestore'da tez belgesini güncelle
      const tezRef = doc(db, 'tezler', tezId);
      await updateDoc(tezRef, {
        transkript: iyilestirilmisTranskript,
        sonGuncelleme: new Date()
      });
      
      alert('Transkript başarıyla iyileştirildi!');
    } catch (err) {
      console.error('Transkript iyileştirilirken hata oluştu:', err);
      alert('Transkript iyileştirilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setTranskriptIyilestiriliyor(false);
    }
  };

  const handleTezDuzenle = () => {
    navigate(`/tez-duzenle/${tezId}`);
  };

  // Medya gömme kodunu oluşturan yardımcı fonksiyon
  const getEmbedCode = () => {
    if (!tez) return null;
    
    if (tez.medyaTipi === 'youtube') {
      const videoId = getYouTubeVideoId(tez.medyaURL);
      return videoId ? (
        <iframe
          width="100%"
          height="480"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={tez.baslik}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      ) : <p>Video yüklenirken bir hata oluştu.</p>;
    } else if (tez.medyaTipi === 'vimeo') {
      const vimeoId = getVimeoId(tez.medyaURL);
      return vimeoId ? (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          width="100%"
          height="480"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={tez.baslik}
        ></iframe>
      ) : <p>Video yüklenirken bir hata oluştu.</p>;
    } else if (tez.medyaTipi === 'soundcloud') {
      return (
        <iframe
          width="100%"
          height="166"
          scrolling="no"
          frameBorder="no"
          allow="autoplay"
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(tez.medyaURL)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`}
          title={tez.baslik}
        ></iframe>
      );
    }
    
    return <p>Desteklenmeyen medya türü.</p>;
  };

  // YouTube video ID'sini çıkaran yardımcı fonksiyon
  const getYouTubeVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Vimeo video ID'sini çıkaran yardımcı fonksiyon
  const getVimeoId = (url) => {
    const regExp = /vimeo\.com\/(?:video\/)?(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Tez yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Hata</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/tezler')} className="back-button">
          Tez Listesine Dön
        </button>
      </div>
    );
  }

  if (!tez) {
    return (
      <div className="error-container">
        <h2>Tez Bulunamadı</h2>
        <p>Aradığınız tez bulunamadı veya silinmiş olabilir.</p>
        <button onClick={() => navigate('/tezler')} className="back-button">
          Tez Listesine Dön
        </button>
      </div>
    );
  }

  return (
    <div className="tez-detay-container">
      <div className="tez-detay-header">
        <h1>{tez.baslik}</h1>
        
        {/* Sadece akademisyenler ve tezi yükleyen kişi düzenleme yapabilir */}
        {currentUser && (userDetails?.userType === 'academic' || currentUser.uid === tez.yukleyenId) && (
          <button onClick={handleTezDuzenle} className="duzenle-btn">
            <i className="fas fa-edit"></i> Düzenle
          </button>
        )}
      </div>
      
      <div className="tez-meta-bilgiler">
        <div className="tez-meta-item">
          <i className="fas fa-user"></i>
          <span>{tez.akademisyenAdi}</span>
        </div>
        <div className="tez-meta-item">
          <i className="fas fa-calendar"></i>
          <span>{tez.yuklemeTarihi?.toDate().toLocaleDateString('tr-TR')}</span>
        </div>
        <div className="tez-meta-item">
          <i className="fas fa-eye"></i>
          <span>{tez.goruntulemeSayisi || 0} görüntülenme</span>
        </div>
        <div className="tez-meta-item">
          <i className="fas fa-comment"></i>
          <span>{tez.yorumlar?.length || 0} yorum</span>
        </div>
        <div className="tez-meta-item tez-type">
          <span className={`tez-type-badge tez-type-${tez.sunum}`}>
            {tez.sunum === 'tez_savunma' ? 'Tez Savunma' : 
             tez.sunum === 'tez_oneri' ? 'Tez Öneri' : tez.sunum}
          </span>
        </div>
      </div>
      
      <div className="tez-medya-container">
        {getEmbedCode()}
      </div>

            <div className="tez-aciklama">
        <h2>Tez Açıklaması</h2>
        <p>{tez.aciklama}</p>
      </div>
      
      <div className="tez-transkript-container">
        <div className="transkript-header">
          <h2>Transkript</h2>
          <div className="transkript-actions">
            {/* Transkript durumuna göre butonları göster */}
            {tez.transkriptDurumu !== 'tamamlandi' ? (
              // Sadece akademisyenler ve tezi yükleyen kişi transkript oluşturabilir
              currentUser && (userDetails?.userType === 'academic' || currentUser.uid === tez.yukleyenId) && (
                <button 
                  onClick={handleTranskriptOlustur} 
                  className="transkript-btn"
                  disabled={transkriptYukleniyor}
                >
                  {transkriptYukleniyor ? (
                    <>
                      <div className="spinner-small"></div>
                      <span>Transkript Oluşturuluyor...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-alt"></i>
                      <span>Transkript Oluştur</span>
                    </>
                  )}
                </button>
              )
            ) : (
              <>
                <button 
                  onClick={() => setTranskriptGosteriliyor(!transkriptGosteriliyor)} 
                  className="transkript-toggle-btn"
                >
                  {transkriptGosteriliyor ? (
                    <>
                      <i className="fas fa-eye-slash"></i>
                      <span>Transkripti Gizle</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-eye"></i>
                      <span>Transkripti Göster</span>
                    </>
                  )}
                </button>
                
                {/* Sadece akademisyenler ve tezi yükleyen kişi transkripti iyileştirebilir */}
                {currentUser && (userDetails?.userType === 'academic' || currentUser.uid === tez.yukleyenId) && (
                  <button 
                    onClick={handleTranskriptIyilestir} 
                    className="transkript-iyilestir-btn"
                    disabled={transkriptIyilestiriliyor}
                  >
                    {transkriptIyilestiriliyor ? (
                      <>
                        <div className="spinner-small"></div>
                        <span>İyileştiriliyor...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-magic"></i>
                        <span>Transkripti İyileştir</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Transkript durumunu göster */}
        <div className={`transkript-status transkript-${tez.transkriptDurumu}`}>
          {tez.transkriptDurumu === 'tamamlandi' ? 'Transkript Hazır' : 
           tez.transkriptDurumu === 'beklemede' ? 'Transkript Hazırlanıyor' : 
           'Transkript Oluşturulurken Hata Oluştu'}
        </div>
        
        {/* Transkript içeriği */}
        {transkriptGosteriliyor && tez.transkript && (
          <div className="transkript-content">
            <pre>{tez.transkript}</pre>
          </div>
        )}
      </div>
      
      <div className="tez-yorumlar-container">
        <h2>Yorumlar ({tez.yorumlar?.length || 0})</h2>
        
        {/* Yorum formu */}
        <form onSubmit={handleYorumSubmit} className="yorum-form">
          <textarea
            value={yorum}
            onChange={(e) => setYorum(e.target.value)}
            placeholder="Tez hakkında düşüncelerinizi paylaşın..."
            required
            disabled={!currentUser || yorumGonderiliyor}
          ></textarea>
          <button 
            type="submit" 
            disabled={!currentUser || yorumGonderiliyor}
            className="yorum-gonder-btn"
          >
            {yorumGonderiliyor ? 'Gönderiliyor...' : 'Yorum Gönder'}
          </button>
          
          {!currentUser && (
            <p className="login-reminder">
              Yorum yapabilmek için <a href="/giris">giriş yapmalısınız</a>.
            </p>
          )}
        </form>
        
        {/* Yorumlar listesi */}
        <div className="yorumlar-listesi">
          {tez.yorumlar && tez.yorumlar.length > 0 ? (
            tez.yorumlar.map((yorum) => (
              <div key={yorum.id} className="yorum-item">
                <div className="yorum-header">
                  <span className="yorum-kullanici">{yorum.kullaniciAdi}</span>
                  <span className="yorum-tarih">
                    {yorum.tarih?.toDate().toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <div className="yorum-icerik">{yorum.yorum}</div>
                
                {/* Eğer transkript varsa ve yorum için highlight yapıldıysa göster */}
                {tez.transkript && highlightedComments[yorum.id] && (
                  <div className="yorum-highlight">
                    <h4>Transkriptten İlgili Bölüm:</h4>
                    <blockquote>{highlightedComments[yorum.id]}</blockquote>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="no-yorumlar">Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TezDetay;

