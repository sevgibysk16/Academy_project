import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ChatList.css';

const ChatList = ({
  users,
  selectedUser,
  selectedGroup,
  onSelectUser,
  onSelectGroup,
  searchQuery,
  onSearchChange,
  activeSeminars = [],
  isAcademic = false
}) => {
  const { currentUser } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [canCreateSeminar, setCanCreateSeminar] = useState(isAcademic);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const chatListRef = useRef(null);
  const navigate = useNavigate();

  // Mobil menü için overlay tıklama kontrolü
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatListRef.current && !chatListRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape tuşu ile menüyü kapat
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  // Dokunmatik kaydırma işlemleri
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
        
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      setIsMobileMenuOpen(false);
    } else if (isRightSwipe && !isMobileMenuOpen) {
      setIsMobileMenuOpen(true);
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleCreateSeminarClick = () => {
    navigate('/seminar/create');
    setIsMobileMenuOpen(false); // Mobilde menüyü kapat
  };

  const handleJoinSeminarClick = (seminarId) => {
    navigate(`/seminar/${seminarId}`);
    setIsMobileMenuOpen(false); // Mobilde menüyü kapat
  };

  const toggleCreateSeminarAccess = () => {
    setCanCreateSeminar(!canCreateSeminar);
  };

  return (
    <>
      {/* Mobil menü toggle butonu */}
      <button 
        className="mobile-menu-toggle"
        onClick={toggleMobileMenu}
        aria-label="Menüyü aç/kapat"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Mobil overlay */}
      <div 
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      />

      {/* Ana chat listesi */}
      <div 
        ref={chatListRef}
        className={`chat-list ${isMobileMenuOpen ? 'active' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Chat List Header */}
        <div className="chat-list-header">
          <h3>Sohbetler</h3>
          <button 
            className="toggle-button"
            onClick={closeMobileMenu}
            aria-label="Menüyü kapat"
          >
            ✕
          </button>
        </div>

        {/* Chat List Content */}
        <div className={`chat-list-content ${isCollapsed ? 'hidden' : ''}`}>
          
          {/* Grup Sohbeti */}
          <div className="section-header">
            <h3>Grup Sohbeti</h3>
          </div>
          <ul>
            <li
              className={selectedGroup ? 'selected' : ''}
              onClick={() => {
                onSelectGroup();
                setIsMobileMenuOpen(false);
              }}
            >
              <div className="avatar">G</div>
              <span className="user-name">İntellica Seminer Grubu</span>
              {/* Okunmamış mesaj varsa badge eklenebilir */}
              {/* <div className="unread-badge"></div> */}
            </li>
          </ul>

          {/* Seminer Bölümü */}
          <div className="seminar-section">
            <div className="section-header">
              <h3>Seminerler</h3>
            </div>
            
            {/* Debug toggle butonu */}
            <button 
              onClick={toggleCreateSeminarAccess}
              className="debug-toggle-button"
            >
              {canCreateSeminar ? 'Akademisyen Modu Açık' : 'Akademisyen Modu Kapalı'}
            </button>

            {/* Yeni seminer oluştur butonu */}
            {canCreateSeminar && (
              <button 
                className="seminar-button"
                onClick={handleCreateSeminarClick}
              >
                Yeni Seminer Oluştur
              </button>
            )}

            {/* Aktif seminerler */}
            {activeSeminars.length > 0 && (
              <div className="active-seminars">
                <h4>Aktif Seminerler</h4>
                {activeSeminars.map(seminar => (
                  <div key={seminar.id} className="active-seminar-item">
                    <span className="seminar-title">{seminar.title}</span>
                    <button
                      className="join-seminar-button"
                      onClick={() => handleJoinSeminarClick(seminar.id)}
                    >
                      Katıl
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Topluluk Üyeleri */}
          <div className="section-header">
            <h3>Topluluk Üyeleri</h3>
          </div>
          
          {/* Arama kutusu */}
          <div className="search-container">
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>

          {/* Kullanıcı listesi */}
          <ul className="users-list">
            {users && users.length > 0 ? (
              users.map((user) => (
                <li
                  key={user.uid || Math.random().toString()}
                  className={selectedUser?.uid === user.uid ? 'selected' : ''}
                  onClick={() => {
                    onSelectUser(user);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <div className="avatar">
                    {user.first_name ? user.first_name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <span className="user-name">
                    {user.first_name} {user.last_name}
                  </span>
                  {/* Okunmamış mesaj varsa badge eklenebilir */}
                  {/* <div className="unread-badge"></div> */}
                </li>
              ))
            ) : (
              <li className="empty-list">Kullanıcı bulunamadı</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
};

export default ChatList;
