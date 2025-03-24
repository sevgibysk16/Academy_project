import React, { useState } from 'react';
import './Navbar.css';
// Logo dosyanızı import edin veya yorum satırını kaldırın
// import logo from '../../assets/logo.png';

const Navbar = ({ isLoggedIn, onLogout, currentUser }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          {/* Logo dosyanız yoksa aşağıdaki satırı yorum satırı yapın */}
          {/* <img src={logo} alt="Logo" /> */}
          <span>Intellica </span>
        </div>

        <div className="navbar-toggle" onClick={toggleMobileMenu}>
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </div>

        <ul className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <li className="navbar-item">
            <a href="/" className="navbar-link">Ana Sayfa</a>
          </li>
          <li className="navbar-item">
            <a href="/courses" className="navbar-link">Topluluk</a>
          </li>
          <li className="navbar-item">
            <a href="/about" className="navbar-link">Hakkımızda</a>
          </li>
          <li className="navbar-item">
            <a href="/contact" className="navbar-link">İletişim</a>
          </li>
          
          {isLoggedIn ? (
            <>
              <li className="navbar-item user-profile">
                <div className="profile-dropdown">
                  <button className="profile-button">
                    <span className="user-name">{currentUser?.firstName || 'Kullanıcı'}</span>
                    <i className="fas fa-chevron-down"></i>
                  </button>
                  <div className="dropdown-content">
                    <a href="/profile">Profilim</a>
                    <button onClick={onLogout}>Çıkış Yap</button>
                  </div>
                </div>
              </li>
            </>
          ) : (
            <>
              <li className="navbar-item">
                <a href="/login" className="navbar-link login-button">Giriş Yap</a>
              </li>
              <li className="navbar-item">
                <a href="/register" className="navbar-link register-button">Kayıt Ol</a>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;