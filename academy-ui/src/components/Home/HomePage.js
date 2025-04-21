import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import heroImage from '../../assets/hero-image.jpg';

const HomePage = () => {
  const navigate = useNavigate();
  
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
            <h1 className="hero-title">Intellica</h1>
            <p className="hero-subtitle">Bilgiyi paylaş, topluluğa katıl, geleceğe yön ver!</p>
            <p className="hero-welcome">Hoş geldin! Akademik dünyaya bir adım daha yaklaş!</p>
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
          <h2 className="section-title">Platform Özellikleri</h2>
          <div className="features-container">
            {[
              {
                icon: 'fas fa-comments',
                title: 'Etkileşim ve İletişim',
                desc: 'Bireysel veya grup sohbetleri, görüntülü seminerler ve akademik içerik paylaşımı',
              },
              {
                icon: 'fas fa-book-open',
                title: 'Eğitim İçerikleri',
                desc: 'Ders materyalleri, makaleler ve duyurular ile zengin akademik içerik',
              },
              {
                icon: 'fas fa-microphone-alt',
                title: 'Konuşmadan Metne',
                desc: 'Seminer ve ders kayıtlarını otomatik olarak metne dönüştürme ve analiz',
              },
              {
                icon: 'fas fa-shield-alt',
                title: 'Güvenli Erişim',
                desc: 'JWT tabanlı kimlik doğrulama ve farklı yetkilendirme seviyeleri',
              },
            ].map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  <i className={feature.icon}></i>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="how-it-works-section-container">
          <h2 className="section-title">Nasıl Çalışır?</h2>
          <div className="steps-container">
            {[
              {
                icon: 'fas fa-user-plus',
                step: 'Kayıt Olun',
                desc: 'Akademisyen veya öğrenci olarak platforma kayıt olun ve profilinizi oluşturun.',
              },
              {
                icon: 'fas fa-users',
                step: 'Topluluklara Katılın',
                desc: 'İlgi alanlarınıza göre akademik topluluklara katılın veya yeni bir topluluk oluşturun.',
              },
              {
                icon: 'fas fa-share-alt',
                step: 'İçerik Paylaşın',
                desc: 'Akademik içerikler paylaşın, tartışmalara katılın ve seminerler düzenleyin.',
              },
              {
                icon: 'fas fa-graduation-cap',
                step: 'Öğrenin ve Geliştirin',
                desc: 'Paylaşılan içeriklerden faydalanın ve akademik ağınızı genişletin.',
              },
            ].map((item, index) => (
              <div key={index} className="step-card">
                <div className="step-number">{index + 1}</div>
                <div className="step-icon">
                  <i className={item.icon}></i>
                </div>
                <h3>{item.step}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
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
