import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

// Logo dosyanızı import edin veya yorum satırını kaldırın
// import logo from '../../assets/logo.png';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const isAuthenticated = !!currentUser; // currentUser varsa true, yoksa false
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  // Dropdown dışına tıklandığında dropdown'ı kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sayfa değiştiğinde mobil menüyü kapat
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Kullanıcı adını ve baş harfini alma
  const getUserInitial = () => {
    if (currentUser?.firstName) {
      return currentUser.firstName.charAt(0);
    } else if (currentUser?.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    if (currentUser?.firstName) {
      return currentUser.firstName;
    } else if (currentUser?.email) {
      return currentUser.email.split('@')[0];
    }
    return 'Kullanıcı';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          {/* Logo dosyanız yoksa aşağıdaki satırı yorum satırı yapın */}
          {/* <img src={logo} alt="Logo" /> */}
          <span>Intellica </span>
        </Link>
        
        <div className="navbar-toggle" onClick={toggleMobileMenu}>
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </div>
        
        <ul className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
          <li className="navbar-item">
            <Link 
              to="/"
              className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              Ana Sayfa
            </Link>
          </li>
          
          <li className="navbar-item">
            <Link 
              to="/community"
              className={`navbar-link ${location.pathname === '/community' ? 'active' : ''}`}
            >
              Topluluk
            </Link>
          </li>
          
          <li className="navbar-item">
            <Link 
              to="/about"
              className={`navbar-link ${location.pathname === '/about' ? 'active' : ''}`}
            >
              Hakkımızda
            </Link>
          </li>
          
          <li className="navbar-item">
            <Link 
              to="/contact"
              className={`navbar-link ${location.pathname === '/contact' ? 'active' : ''}`}
            >
              İletişim
            </Link>
          </li>
          
          {isAuthenticated ? (
            <>
              <li className="navbar-item user-profile" ref={dropdownRef}>
                <div className="profile-dropdown">
                  <button 
                    className={`profile-button ${dropdownOpen ? 'active' : ''}`}
                    onClick={toggleDropdown}
                  >
                    <div className="avatar">
                      {getUserInitial()}
                    </div>
                    <span className="user-name">
                      {getUserName()}
                    </span>
                    <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'}`}></i>
                  </button>
                  
                  {dropdownOpen && (
                    <div className="dropdown-content">
                      <Link to="/dashboard" onClick={() => setDropdownOpen(false)}>
                        <i className="fas fa-tachometer-alt"></i> Dashboard
                      </Link>
                      <Link to="/profile" onClick={() => setDropdownOpen(false)}>
                        <i className="fas fa-user"></i> Profilim
                      </Link>
                      <Link to="/settings" onClick={() => setDropdownOpen(false)}>
                        <i className="fas fa-cog"></i> Ayarlar
                      </Link>
                      <div className="dropdown-divider"></div>
                      <button onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i> Çıkış Yap
                      </button>
                    </div>
                  )}
                </div>
              </li>
            </>
          ) : (
            <>
              <li className="navbar-item">
                <Link 
                  to="/login"
                  className={`navbar-link login-button ${location.pathname === '/login' ? 'active' : ''}`}
                >
                  Giriş Yap
                </Link>
              </li>
              <li className="navbar-item">
                <Link 
                  to="/register"
                  className={`navbar-link register-button ${location.pathname === '/register' ? 'active' : ''}`}
                >
                  Kayıt Ol
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
