import React, { useEffect, useRef, useState } from 'react';
import './MessageWindow.css';

const MessageWindow = ({
  messages,
  selectedUser,
  socket,
  typingUser,
  selectedGroup,
  groupMembers = [],
  currentUser
}) => {
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const dateStr = date.toLocaleDateString();
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(msg);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  const getMessageStatus = (msg) => {
    if (msg.read) return <span className="message-status read">✓✓</span>;
    if (msg.delivered) return <span className="message-status delivered">✓</span>;
    return <span className="message-status pending"></span>;
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (!socket || !selectedUser) return;
    
    const handleTyping = (userId) => {
      if (userId === selectedUser.uid) setIsTyping(true);
    };
    
    const handleStopTyping = (userId) => {
      if (userId === selectedUser.uid) setIsTyping(false);
    };
    
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);
    
    return () => {
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [socket, selectedUser]);

  // Mesajı gönderen kişinin adını ve soyadını bul
  const getSenderFullName = (msg) => {
    if (msg.from === currentUser?.uid) {
      return null; // Kendi mesajlarımızda isim göstermeye gerek yok
    }
    
    // Mesajda senderInfo varsa onu kullan
    if (msg.senderInfo) {
      return `${msg.senderInfo.firstName} ${msg.senderInfo.lastName}`.trim();
    }
    
    // Grup üyelerinden bul
    if (groupMembers.length > 0) {
      const sender = groupMembers.find(member => member.uid === msg.from);
      if (sender) {
        return `${sender.firstName || sender.first_name || ''} ${sender.lastName || sender.last_name || ''}`.trim();
      }
    }
    
    // Seçili kullanıcıysa onun adını kullan
    if (selectedUser && msg.from === selectedUser.uid) {
      return `${selectedUser.firstName || selectedUser.first_name || ''} ${selectedUser.lastName || selectedUser.last_name || ''}`.trim();
    }
    
    // Hiçbir bilgi bulunamazsa
    return "Bilinmeyen Kullanıcı";
  };

  return (
    <div className="message-window">
      <div className="messages">
        {Object.entries(messageGroups).map(([dateStr, msgs]) => (
          <React.Fragment key={dateStr}>
            <div className="message-date-divider">{dateStr}</div>
            {msgs.map((msg, index) => {
              const isIncoming = msg.from !== currentUser?.uid;
              const isOutgoing = !isIncoming;
              const senderFullName = getSenderFullName(msg);
              
              return (
                <div
                  key={index}
                  className={`message ${isIncoming ? 'received' : 'sent'}`}
                >
                  <div className={`message-content ${isOutgoing ? 'sent-message' : 'received-message'}`}>
                    {/* Grup sohbeti ise ve gelen mesajsa göndericinin adını göster */}
                    {selectedGroup && isIncoming && senderFullName && (
                      <div className="message-sender">
                        {senderFullName}
                      </div>
                    )}
                    
                    {/* Mesaj metni */}
                    <div className="message-text">{msg.text}</div>
                    
                    {/* Mesaj zamanı ve durumu */}
                    <span className="message-time">
                      {formatMessageTime(msg.timestamp)}
                      {isOutgoing && getMessageStatus(msg)}
                    </span>
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
        
        {typingUser && (
          <div className="typing-indicator">
            {selectedUser?.displayName || selectedUser?.firstName || 'Kullanıcı'} yazıyor...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageWindow;
