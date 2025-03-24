import React from 'react';
import { useNavigate } from 'react-router-dom'; // React Router için
import './HomePage.css';
import heroImage from '../../assets/hero-image.jpg';

const HomePage = () => {
  const navigate = useNavigate(); // Sayfa yönlendirmesi için

  // Yönlendirme fonksiyonları
  const navigateToLogin = () => {
    navigate('/login');
  };

  const navigateToRegister = () => {
    navigate('/register');
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-section-container">
          <div className="hero-content">
            <h1>Intellica </h1>
            <p>Bilgiyi paylaş, topluluğa katıl, geleceğe yön ver!</p>
            <div className="hero-buttons">
              <button className="primary-button" onClick={navigateToRegister}>Kayıt Ol</button>
              <button className="secondary-button" onClick={navigateToLogin}>Giriş Yap</button>
            </div>
          </div>
          <div className="hero-image">
            <img src={heroImage} alt="Hero" className="hero-img" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-section-container">
          <h2>Platform Özellikleri</h2>
          <div className="features-container">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-comments"></i>
              </div>
              <h3>Etkileşim ve İletişim</h3>
              <p>Bireysel veya grup sohbetleri, görüntülü seminerler ve akademik içerik paylaşımı</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-book-open"></i>
              </div>
              <h3>Eğitim İçerikleri</h3>
              <p>Ders materyalleri, makaleler ve duyurular ile zengin akademik içerik</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-microphone-alt"></i>
              </div>
              <h3>Konuşmadan Metne</h3>
              <p>Seminer ve ders kayıtlarını otomatik olarak metne dönüştürme ve analiz</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>Güvenli Erişim</h3>
              <p>JWT tabanlı kimlik doğrulama ve farklı yetkilendirme seviyeleri</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="how-it-works-section-container">
          <h2>Nasıl Çalışır?</h2>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">
                <i className="fas fa-user-plus"></i>
              </div>
              <h3>Kayıt Olun</h3>
              <p>Akademisyen veya öğrenci olarak platforma kayıt olun ve profilinizi oluşturun.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>Topluluklara Katılın</h3>
              <p>İlgi alanlarınıza göre akademik topluluklara katılın veya yeni bir topluluk oluşturun.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">
                <i className="fas fa-share-alt"></i>
              </div>
              <h3>İçerik Paylaşın</h3>
              <p>Akademik içerikler paylaşın, tartışmalara katılın ve seminerler düzenleyin.</p>
            </div>
            
            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h3>Öğrenin ve Geliştirin</h3>
              <p>Paylaşılan içeriklerden faydalanın, metne dönüştürülmüş kayıtları inceleyin ve akademik ağınızı genişletin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-section-container">
          <div className="cta-content">
            <h2>Intellica'ya Bugün Katılın</h2>
            <p>Bilgi paylaşımını ve akademik işbirliğini kolaylaştıran platformumuzda yerinizi alın.</p>
            <button className="cta-button" onClick={navigateToRegister}>Hemen Kaydol</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;