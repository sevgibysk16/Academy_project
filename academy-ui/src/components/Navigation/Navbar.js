import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';
// import logo from '../../assets/logo.png';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const isAuthenticated = !!currentUser;
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const navbarRef = useRef(null);

  // Navbar scroll efekti
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    document.body.style.overflow = !mobileMenuOpen ? 'hidden' : 'auto';
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setDropdownOpen(!dropdownOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      setDropdownOpen(false);
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    document.body.style.overflow = 'auto';
  }, [location.pathname]);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
        document.body.style.overflow = 'auto';
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

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

  const navItems = [
    { path: '/', label: 'Ana Sayfa', icon: 'fa-home' },
    { path: '/community', label: 'Topluluk', icon: 'fa-users' },
    { path: '/projects', label: 'Projeler', icon: 'fa-project-diagram' },
    { path: '/tezler', label: 'Tez Sunumları', icon: 'fa-chalkboard-teacher' },
    { path: '/transcripts', label: 'Seminer Sonuçları', icon: 'fa-info-circle' },
    { path: '/blog', label: 'Blog', icon: 'fa-blog' }
  ];

  return (
    <nav 
      ref={navbarRef}
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      role="navigation"
      aria-label="Main Navigation"
    >
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" aria-label="Home">
          {/* <img src={logo} alt="Intellica Logo" /> */}
          <span>Intellica</span>
        </Link>
        
        <button 
          className="navbar-toggle"
          onClick={toggleMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
        
        <ul className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
          {navItems.map((item) => (
            <li key={item.path} className="navbar-item">
              <Link 
                to={item.path}
                className={`navbar-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <i className={`fas ${item.icon} nav-icon`}></i>
                {item.label}
              </Link>
            </li>
          ))}
          
          {isAuthenticated ? (
            <li className="navbar-item user-profile" ref={dropdownRef}>
              <div className="profile-dropdown">
                <button 
                  className={`profile-button ${dropdownOpen ? 'active' : ''}`}
                  onClick={toggleDropdown}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
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
                  <div className="dropdown-content" role="menu">
                    <Link to="/dashboard" onClick={() => setDropdownOpen(false)} role="menuitem">
                      <i className="fas fa-user"></i> Profilim
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button onClick={handleLogout} role="menuitem">
                      <i className="fas fa-sign-out-alt"></i> Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            </li>
          ) : (
            <>
              <li className="navbar-item">
                <Link 
                  to="/login"
                  className={`navbar-link login-button ${location.pathname === '/login' ? 'active' : ''}`}
                >
                  <i className="fas fa-sign-in-alt nav-icon"></i>
                  Giriş Yap
                </Link>
              </li>
              <li className="navbar-item">
                <Link 
                  to="/register"
                  className={`navbar-link register-button ${location.pathname === '/register' ? 'active' : ''}`}
                >
                  <i className="fas fa-user-plus nav-icon"></i>
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
