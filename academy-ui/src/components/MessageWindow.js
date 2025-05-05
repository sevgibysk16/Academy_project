import React, { useEffect, useRef, useState } from 'react';
import './MessageWindow.css';

const MessageWindow = ({
  messages,
  selectedUser,
  socket,
  typingUser,
  selectedGroup,
  groupMembers = []
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

  return (
    <div className="message-window">
      <div className="messages">
        {Object.entries(messageGroups).map(([dateStr, msgs]) => (
          <React.Fragment key={dateStr}>
            <div className="message-date-divider">{dateStr}</div>

            {msgs.map((msg, index) => {
              const isIncoming = msg.from === selectedUser?.uid;
              const isOutgoing = !isIncoming;

              return (
                <div
                  key={index}
                  className={`message ${isIncoming ? 'received' : 'sent'}`}
                >
                  <div className={`message-content ${isOutgoing ? 'sent-message' : 'received-message'}`}>
                    {/* Grup sohbeti ise göndericinin adını göster */}
                    {selectedGroup && groupMembers.length > 0 && (
                      <div className="message-sender">
                        {
                          groupMembers.find(member => member.uid === msg.from)?.firstName
                        } {
                          groupMembers.find(member => member.uid === msg.from)?.lastName
                        }
                      </div>
                    )}

                    {/* Bireysel sohbette sadece gelen mesajlarda adı göster */}
                    {isIncoming && selectedUser && !selectedGroup && (
                      <div className="message-sender">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </div>
                    )}

                    {msg.text}
                  </div>
                  <span className="message-time">
                    {formatMessageTime(msg.timestamp)}
                    {isOutgoing && getMessageStatus(msg)}
                  </span>
                </div>
              );
            })}
          </React.Fragment>
        ))}

        {typingUser && (
          <div className="typing-indicator">
            {selectedUser?.displayName || 'Kullanıcı'} yazıyor...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageWindow;
