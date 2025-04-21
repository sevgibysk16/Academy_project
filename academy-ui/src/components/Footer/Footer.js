import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">Intellica</h3>
          <p className="footer-description">
            Akademik dünyayı birleştiren, bilgi paylaşımını ve işbirliğini kolaylaştıran platform.
          </p>
          <div className="social-links">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fab fa-facebook-f"></i>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <i className="fab fa-linkedin-in"></i>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
          </div>
        </div>
        
        <div className="footer-section">
          <h4 className="footer-heading">Hızlı Bağlantılar</h4>
          <ul className="footer-links">
            <li><Link to="/">Ana Sayfa</Link></li>
            <li><Link to="/community">Topluluk</Link></li>
            <li><Link to="/about">Hakkımızda</Link></li>
            <li><Link to="/contact">İletişim</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4 className="footer-heading">Destek</h4>
          <ul className="footer-links">
            <li><Link to="/faq">Sık Sorulan Sorular</Link></li>
            <li><Link to="/privacy">Gizlilik Politikası</Link></li>
            <li><Link to="/terms">Kullanım Şartları</Link></li>
            <li><Link to="/help">Yardım Merkezi</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4 className="footer-heading">İletişim</h4>
          <address className="footer-contact">
            <p><i className="fas fa-map-marker-alt"></i> İstanbul, Türkiye</p>
            <p><i className="fas fa-envelope"></i> info@intellica.com</p>
            <p><i className="fas fa-phone"></i> +90 212 123 4567</p>
          </address>
          <div className="newsletter">
            <h4 className="footer-heading">Bültenimize Abone Olun</h4>
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
        <p>&copy; {currentYear} Intellica. Tüm hakları saklıdır.</p>
        <div className="footer-bottom-links">
          <Link to="/privacy">Gizlilik</Link>
          <Link to="/terms">Şartlar</Link>
          <Link to="/cookies">Çerezler</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
