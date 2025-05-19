import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  isAcademic = false // Add this prop to control access based on user role
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [canCreateSeminar, setCanCreateSeminar] = useState(isAcademic); // Initialize based on isAcademic prop
  const navigate = useNavigate();
  
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  const handleCreateSeminarClick = () => {
    navigate('/seminar/create');
  };

  const handleJoinSeminarClick = (seminarId) => {
    navigate(`/seminar/${seminarId}`);
  };
  
  // Toggle function for the debug button
  const toggleCreateSeminarAccess = () => {
    setCanCreateSeminar(!canCreateSeminar);
  };
  
  return (
    <div className={`chat-list ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="chat-list-header">
        <h3>Sohbetler</h3>
        <button className="toggle-button" onClick={toggleCollapse}>
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>
      <div className={`chat-list-content ${isCollapsed ? 'hidden' : ''}`}>
        <h3>Grup</h3>
        <ul>
          <li
            className={selectedGroup ? 'selected' : ''}
            onClick={onSelectGroup}
          >
            İntellica Seminer Grubu
          </li>
        </ul>
        
        <div className="seminar-section">
          {/* Debug toggle button - you can remove this in production */}
          <button 
            onClick={toggleCreateSeminarAccess} 
            style={{
              padding: '5px', 
              margin: '5px 0', 
              background: '#f0f0f0', 
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            {canCreateSeminar ? 'Akademisyen Modu Açık' : 'Akademisyen Modu Kapalı'}
          </button>
          
          {/* Show create seminar button only when canCreateSeminar is true */}
          {canCreateSeminar && (
            <button 
              className="seminar-button create-seminar" 
              onClick={handleCreateSeminarClick}
              style={{ display: 'block', width: '100%', margin: '10px 0' }}
            >
              Yeni Seminer Oluştur
            </button>
          )}
          
          {activeSeminars.length > 0 && (
            <div className="active-seminars">
              <h4>Aktif Seminerler</h4>
              <ul>
                {activeSeminars.map(seminar => (
                  <li key={seminar.id} className="active-seminar-item">
                    <span className="seminar-title">{seminar.title}</span>
                    <button 
                      className="join-seminar-button"
                      onClick={() => handleJoinSeminarClick(seminar.id)}
                    >
                      Katıl
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <h3>Topluluk Üyeleri</h3>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchQuery}
            onChange={onSearchChange}
          />
        </div>
        
        <ul className="users-list">
          {users && users.length > 0 ? (
            users.map((user) => (
              <li
                key={user.uid || Math.random().toString()}
                className={selectedUser?.uid === user.uid ? 'selected' : ''}
                onClick={() => onSelectUser(user)}
              >
                <div className="avatar">
                  {user.first_name ? user.first_name.charAt(0).toUpperCase() : '?'}
                </div>
                <span className="user-name">
                  {user.first_name} {user.last_name}
                </span>
              </li>
            ))
          ) : (
            <li className="empty-list">Kullanıcı bulunamadı</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ChatList;
