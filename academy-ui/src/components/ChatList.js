import React from 'react';
import './ChatList.css';

const ChatList = ({
  users,
  selectedUser,
  selectedGroup,
  onSelectUser,
  onSelectGroup,
  searchQuery,
  onSearchChange
}) => {
  return (
    <div className="chat-list">
      <h3>Grup</h3>
      <ul>
        <li
          className={selectedGroup ? 'selected' : ''}
          onClick={onSelectGroup}
        >
          İntellica Seminer Grubu
        </li>
      </ul>
      
      <h3>Topluluk Üyeleri</h3>
      
      {/* Arama kutusu - Topluluk Üyeleri başlığının altına eklendi */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Kullanıcı ara..."
          value={searchQuery}
          onChange={onSearchChange}
        />
      </div>
      
      <ul>
        {users.map((user) => (
          <li
            key={user.uid}
            className={selectedUser?.uid === user.uid ? 'selected' : ''}
            onClick={() => onSelectUser(user)}
          >
            {user.first_name} {user.last_name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatList;
