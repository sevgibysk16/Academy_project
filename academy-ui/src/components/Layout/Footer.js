import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-row">
          <div className="footer-column">
            <h3>Intellica</h3>
            <p className="footer-description">
            Gerçek zamanlı mesajlaşma ve görüntülü seminerlerle akademik dünyada bir adım öne geçin! Uzmanlarla etkileşim kurun, bilgi paylaşın ve öğrenme deneyiminizi güçlendirin.
            </p>
            <div className="social-links">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>
          
          <div className="footer-column">
            <h4>Hızlı Bağlantılar</h4>
            <ul className="footer-links">
              <li><a href="/">Ana Sayfa</a></li>
              <li><a href="/courses">Topluluk</a></li>
              <li><a href="/about">Hakkımızda</a></li>
              <li><a href="/contact">İletişim</a></li>
            </ul>
          </div>
          
          <div className="footer-column">
            <h4>Kategoriler</h4>
            <ul className="footer-links">
              <li><a href="/category/programming">Programlama</a></li>
              <li><a href="/category/design">Tasarım</a></li>
              <li><a href="/category/business">İşletme</a></li>
              <li><a href="/category/marketing">Pazarlama</a></li>
              <li><a href="/category/personal-development">Kişisel Gelişim</a></li>
            </ul>
          </div>
          
          <div className="footer-column">
            <h4>İletişim</h4>
            <ul className="contact-info">
              <li>
                <i className="fas fa-phone"></i>
                <span>+90 (312) 123 4567</span>
              </li>
              <li>
                <i className="fas fa-envelope"></i>
                <span>info@intellica .com</span>
              </li>
            </ul>
            <div className="newsletter">
              <h5>Bültenimize Abone Olun</h5>
              <form className="newsletter-form">
                <input type="email" placeholder="E-posta adresiniz" required />
                <button type="submit">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="copyright">
            <p>&copy; {currentYear} Intellica . Tüm hakları saklıdır.</p>
          </div>
          <div className="footer-bottom-links">
            <a href="/terms">Kullanım Şartları</a>
            <a href="/privacy">Gizlilik Politikası</a>
            <a href="/cookies">Çerez Politikası</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;