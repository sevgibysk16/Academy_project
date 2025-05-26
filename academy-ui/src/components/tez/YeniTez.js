import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { generateTranscript } from '../../utils/geminiAİ';
import '../../styles/yenitez.css';

const YeniTez = () => {
  const [baslik, setBaslik] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [akademisyenAdi, setAkademisyenAdi] = useState('');
  const [sunum, setSunum] = useState('tez_savunma');
  const [medyaTipi, setMedyaTipi] = useState('youtube');
  const [medyaURL, setMedyaURL] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [error, setError] = useState(null);
  const [transkriptDurumu, setTranskriptDurumu] = useState('otomatik'); // 'otomatik' veya 'manuel'
  
  const navigate = useNavigate();
  const { currentUser, userDetails } = useAuth();

  useEffect(() => {
    // Kullanıcı giriş yapmamışsa erişimi engelle
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Kullanıcı adını otomatik doldur
    if (userDetails) {
      setAkademisyenAdi(userDetails.displayName || currentUser.email.split('@')[0]);
    }
  }, [currentUser, userDetails, navigate]);

  const validateYouTubeUrl = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(\&.*)?$/;
    return youtubeRegex.test(url);
  };

  const validateVimeoUrl = (url) => {
    const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com\/)([\d]+)(\&.*)?$/;
    return vimeoRegex.test(url);
  };

  const validateSoundCloudUrl = (url) => {
    return url.includes('soundcloud.com');
  };

  const handleMedyaURLChange = (e) => {
    setMedyaURL(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('Lütfen önce giriş yapın.');
      return;
    }
    
    if (!baslik.trim() || !aciklama.trim() || !akademisyenAdi.trim() || !medyaURL.trim()) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }

    // URL doğrulama
    if (medyaTipi === 'youtube' && !validateYouTubeUrl(medyaURL)) {
      setError('Lütfen geçerli bir YouTube URL\'si girin.');
      return;
    } else if (medyaTipi === 'vimeo' && !validateVimeoUrl(medyaURL)) {
      setError('Lütfen geçerli bir Vimeo URL\'si girin.');
      return;
    } else if (medyaTipi === 'soundcloud' && !validateSoundCloudUrl(medyaURL)) {
      setError('Lütfen geçerli bir SoundCloud URL\'si girin.');
      return;
    }

    try {
      setYukleniyor(true);
      setError(null);
      // Firestore'a tez bilgilerini kaydet
      const tezData = {
        baslik,
        aciklama,
        akademisyenAdi,
        sunum,
        medyaTipi,
        medyaURL,
        transkriptDurumu: transkriptDurumu === 'otomatik' ? 'beklemede' : 'yok',
        transkript: '',
        yukleyenId: currentUser.uid,
        yukleyenEmail: currentUser.email,
        yukleyenAdi: userDetails?.displayName || currentUser.email.split('@')[0],
        yukleyenTipi: userDetails?.userType || 'user',
        yuklemeTarihi: serverTimestamp(),
        goruntulemeSayisi: 0,
        yorumlar: []
      };

      // Firestore'a tez bilgilerini ekle
      const docRef = await addDoc(collection(db, 'tezler'), tezData);
      
      // Otomatik transkript oluşturma seçildiyse
      if (transkriptDurumu === 'otomatik') {
        // Transkript oluşturma işlemini başlat (bu işlem arka planda devam edecek)
        generateTranscriptInBackground(docRef.id, medyaURL, medyaTipi);
      }

      // Başarılı yükleme sonrası tez detay sayfasına yönlendir
      navigate(`/tez/${docRef.id}`);
    } catch (err) {
      console.error('Tez yükleme hatası:', err);
      setError('Tez yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setYukleniyor(false);
    }
  };

  // Arka planda transkript oluşturma işlemi
  const generateTranscriptInBackground = async (tezId, url, type) => {
    try {
      // Gemini AI ile transkript oluştur
      const transcript = await generateTranscript(url, type);
      
      // Firestore'da tez belgesini güncelle
      const tezRef = doc(db, 'tezler', tezId);
      await updateDoc(tezRef, {
        transkript: transcript,
        transkriptDurumu: 'tamamlandi'
      });
      
      console.log('Transkript başarıyla oluşturuldu ve kaydedildi.');
    } catch (error) {
      console.error('Transkript oluşturma hatası:', error);
      
      // Hata durumunda Firestore'u güncelle
      const tezRef = doc(db, 'tezler', tezId);
      await updateDoc(tezRef, {
        transkriptDurumu: 'hata'
      });
    }
  };

  return (
    <div className="yeni-tez-container">
      <h1>Yeni Tez Sunumu Ekle</h1>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="tez-form">
        <div className="form-group">
          <label htmlFor="baslik">Tez Başlığı</label>
          <input
            type="text"
            id="baslik"
            value={baslik}
            onChange={(e) => setBaslik(e.target.value)}
            placeholder="Tez başlığını girin"
            required
            disabled={yukleniyor}
          />
        </div>
        <div className="form-group">
          <label htmlFor="aciklama">Açıklama</label>
          <textarea
            id="aciklama"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder="Tez hakkında kısa bir açıklama yazın"
            required
            disabled={yukleniyor}
          />
        </div>
        <div className="form-group">
          <label htmlFor="akademisyenAdi">Akademisyen Adı</label>
          <input
            type="text"
            id="akademisyenAdi"
            value={akademisyenAdi}
            onChange={(e) => setAkademisyenAdi(e.target.value)}
            placeholder="Tez sahibi akademisyenin adını girin"
            required
            disabled={yukleniyor}
          />
        </div>
        <div className="form-group">
          <label htmlFor="sunum">Sunum Tipi</label>
          <select
            id="sunum"
            value={sunum}
            onChange={(e) => setSunum(e.target.value)}
            disabled={yukleniyor}
          >
            <option value="tez_savunma">Tez Savunma</option>
            <option value="tez_oneri">Tez Öneri</option>
          </select>
        </div>
        <div className="form-group">
          <label>Medya Tipi</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="medyaTipi"
                value="youtube"
                checked={medyaTipi === 'youtube'}
                onChange={(e) => setMedyaTipi(e.target.value)}
                disabled={yukleniyor}
              />
              YouTube
            </label>
            <label>
              <input
                type="radio"
                name="medyaTipi"
                value="vimeo"
                checked={medyaTipi === 'vimeo'}
                onChange={(e) => setMedyaTipi(e.target.value)}
                disabled={yukleniyor}
              />
              Vimeo
            </label>
            <label>
              <input
                type="radio"
                name="medyaTipi"
                value="soundcloud"
                checked={medyaTipi === 'soundcloud'}
                onChange={(e) => setMedyaTipi(e.target.value)}
                disabled={yukleniyor}
              />
              SoundCloud
            </label>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="medyaURL">
            {medyaTipi === 'youtube' ? 'YouTube Video URL' :
              medyaTipi === 'vimeo' ? 'Vimeo Video URL' : 'SoundCloud URL'}
          </label>
          <input
            type="text"
            id="medyaURL"
            value={medyaURL}
            onChange={handleMedyaURLChange}
            placeholder={
              medyaTipi === 'youtube' ? 'Örn: https://www.youtube.com/watch?v=XXXXXXXXXXX' : 
              medyaTipi === 'vimeo' ? 'Örn: https://vimeo.com/XXXXXXXXX' :
              'Örn: https://soundcloud.com/user/track-name'
            }
            required
            disabled={yukleniyor}
          />
          <small>
            {medyaTipi === 'youtube' && 'YouTube video bağlantısını yapıştırın.'}
            {medyaTipi === 'vimeo' && 'Vimeo video bağlantısını yapıştırın.'}
            {medyaTipi === 'soundcloud' && 'SoundCloud ses bağlantısını yapıştırın.'}
          </small>
        </div>
        <div className="form-group">
          <label>Transkript Oluşturma</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="transkriptDurumu"
                value="otomatik"
                checked={transkriptDurumu === 'otomatik'}
                onChange={() => setTranskriptDurumu('otomatik')}
                disabled={yukleniyor}
              />
              Otomatik (Yapay Zeka ile)
            </label>
            <label>
              <input
                type="radio"
                name="transkriptDurumu"
                value="manuel"
                checked={transkriptDurumu === 'manuel'}
                onChange={() => setTranskriptDurumu('manuel')}
                disabled={yukleniyor}
              />
              Manuel (Daha sonra ekle)
            </label>
          </div>
          <small>
            Otomatik seçeneği, yapay zeka kullanarak video içeriğinden transkript oluşturur.
            Bu işlem birkaç dakika sürebilir.
          </small>
        </div>
        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate('/tezler')}
            disabled={yukleniyor}
          >
            İptal
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={yukleniyor}
          >
            {yukleniyor ? 'Ekleniyor...' : 'Tezi Ekle'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default YeniTez;
