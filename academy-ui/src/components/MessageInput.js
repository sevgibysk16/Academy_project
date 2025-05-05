import React, { useState, useRef, useEffect } from 'react';
import './MessageInput.css';
import { sendTyping } from '../utils/socket'; // Kalsın

const popularEmojis = [
  '😊', '😁', '😂', '🤣', '😍', '🥰', '😘', '👍', '👎', '👌',
  '✌️', '🤞', '🙏', '❤️', '🔥', '✨', '🎉', '🎊', '🎁', '🏆',
  '😉', '🙂', '😎', '🤔', '🤗', '😐', '😒', '😔', '😢', '😭',
  '🤍', '🥺', '🌸', '🍃', '🌊', '🌙', '⭐', '☁️', '🦋', '🕊️',
  '🍦', '🎧', '🎐', '🏳️‍🌈', '🤎', '💫', '🌷', '🧿', '🌈'
];

const MessageInput = ({ onSend, onTyping, isGroup }) => {
  const [messageText, setMessageText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [messageText]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && showEmojiPicker) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleSendClick = () => {
    if (messageText.trim()) {
      onSend(messageText); 
      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendClick();
    }
  };

  const addEmoji = (emoji) => {
    setMessageText(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev);
  };

  const quickEmojis = popularEmojis.slice(0, 10);

  const handleChange = (e) => {
    setMessageText(e.target.value);
    if (onTyping) onTyping();
  };

  return (
    <div className={`message-input ${isFocused ? 'focused' : ''}`}>
      <textarea
        ref={textareaRef}
        value={messageText}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={isGroup ? "Gruba mesaj yazın..." : "Mesajınızı yazın..."}
        rows="1"
      />
      <div className="toolbar">
        {quickEmojis.map(emoji => (
          <button 
            key={emoji} 
            type="button" 
            onClick={() => addEmoji(emoji)}
            title="Emoji ekle"
          >
            {emoji}
          </button>
        ))}
        
        <button 
          type="button" 
          className="more-emojis-btn"
          onClick={toggleEmojiPicker}
          title="Daha fazla emoji"
        >
          ⋯
        </button>
      </div>

      {showEmojiPicker && (
        <div className="emoji-picker" ref={emojiPickerRef}>
          <div className="emoji-list">
            {popularEmojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  addEmoji(emoji);
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="button-group">
        <span className="character-count">
          {messageText.length}/500
        </span>

        <button 
          onClick={handleSendClick} 
          disabled={!messageText.trim()}
        >
          <span>Gönder</span>
          <svg className="send-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
