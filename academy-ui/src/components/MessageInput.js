import React, { useState, useRef, useEffect } from 'react';
import './MessageInput.css';
import { sendTyping } from '../utils/socket';

const popularEmojis = [
  '😊', '😁', '😂', '🤣', '😍', '🥰', '😘', '👍', '👎', '👌',
  '✌️', '🤞', '🙏', '❤️', '🔥', '✨', '🎉', '🎊', '🎁', '🏆',
  '😉', '🙂', '😎', '🤔', '🤗', '😐', '😒', '😔', '😢', '😭',
  '🤍', '🥺', '🌸', '🍃', '🌊', '🌙', '⭐', '☁️', '🦋', '🕊️',
  '🍦', '🎧', '🎐', '🏳️‍🌈', '🤎', '💫', '🌷', '🧿', '🌈'
];

const MessageInput = ({ onSend, onTyping, isGroup, isMobile }) => {
  const [messageText, setMessageText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const containerRef = useRef(null);

  // Mobil cihazlarda textarea yüksekliğini ayarla
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const maxHeight = isMobile ? 120 : 200;
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
    }
  }, [messageText, isMobile]);

  // Emoji picker dışına tıklama kontrolü
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

  // Mobil cihazlarda klavye açıldığında scroll problemi çözümü
  useEffect(() => {
    if (isMobile && isFocused) {
      const handleResize = () => {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 300);
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isFocused, isMobile]);

  // iOS Safari için özel düzeltmeler
  useEffect(() => {
    if (isMobile) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        // iOS için klavye açıldığında scroll düzeltmesi
        const handleFocus = () => {
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // iOS'ta klavye açıldığında viewport'u düzelt
              document.body.style.position = 'fixed';
              document.body.style.width = '100%';
              document.body.style.height = '100%';
            }
          }, 300);
        };

        const handleBlur = () => {
          // iOS'ta klavye kapandığında viewport'u düzelt
          document.body.style.position = '';
          document.body.style.width = '';
          document.body.style.height = '';
        };

        textareaRef.current?.addEventListener('focus', handleFocus);
        textareaRef.current?.addEventListener('blur', handleBlur);
        
        return () => {
          textareaRef.current?.removeEventListener('focus', handleFocus);
          textareaRef.current?.removeEventListener('blur', handleBlur);
        };
      }
    }
  }, [isMobile]);

  const handleSendClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (messageText.trim()) {
      onSend(messageText);
      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        // Mobilde focus'u koru ve klavyeyi açık tut
        if (isMobile) {
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              // iOS'ta klavye açık kalması için
              const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
              if (isIOS) {
                document.body.style.position = 'fixed';
                document.body.style.width = '100%';
                document.body.style.height = '100%';
              }
            }
          }, 100);
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    // Mobilde Enter tuşu davranışını değiştir
    if (isMobile) {
      // Mobilde sadece Shift+Enter ile yeni satır
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleSendClick(e);
      }
    } else {
      // Desktop'ta Ctrl/Cmd+Enter ile gönder
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleSendClick(e);
      }
    }
  };

  const addEmoji = (emoji) => {
    const cursorPosition = textareaRef.current?.selectionStart || messageText.length;
    const newText = messageText.slice(0, cursorPosition) + emoji + messageText.slice(cursorPosition);
    setMessageText(newText);
    
    // Focus'u geri ver ve cursor pozisyonunu ayarla
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
      }
    }, 0);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker(prev => !prev);
  };

  const quickEmojis = popularEmojis.slice(0, isMobile ? 6 : 10);

  const handleChange = (e) => {
    setMessageText(e.target.value);
    if (onTyping) onTyping();
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Mobilde klavye açıldığında scroll
    if (isMobile) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end' 
          });
        }
      }, 300);
    }
  };

  const handleBlur = () => {
    // Emoji seçimi sırasında blur'u engelle
    setTimeout(() => {
      if (!showEmojiPicker) {
        setIsFocused(false);
      }
    }, 100);
  };

  return (
    <div 
      ref={containerRef}
      className={`message-input ${isFocused ? 'focused' : ''} ${isMobile ? 'mobile' : ''}`}
      style={{
        position: isMobile ? 'fixed' : 'relative',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: '#fff'
      }}
    >
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={messageText}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={isGroup ? "Gruba mesaj yazın..." : "Mesajınızı yazın..."}
          rows="1"
          maxLength="500"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck="true"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            WebkitAppearance: 'none',
            appearance: 'none',
            fontSize: isMobile ? '16px' : '14px'
          }}
        />
        
        <div className="input-actions">
          <button 
            type="button"
            className="emoji-toggle-btn"
            onClick={toggleEmojiPicker}
            title="Emoji"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            😊
          </button>
          
          <button 
            type="button"
            className="send-btn"
            onClick={handleSendClick}
            disabled={!messageText.trim()}
            title="Gönder"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <svg className="send-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </svg>
          </button>
        </div>
      </div>

      {!isMobile && (
        <div className="toolbar">
          {quickEmojis.map(emoji => (
            <button 
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              title="Emoji ekle"
              className="quick-emoji-btn"
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
      )}

      {showEmojiPicker && (
        <div className="emoji-picker" ref={emojiPickerRef}>
          <div className="emoji-list">
            {popularEmojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  addEmoji(emoji);
                  if (isMobile) {
                    setShowEmojiPicker(false);
                  }
                }}
                className="emoji-btn"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="message-info">
        <span className="character-count">
          {messageText.length}/500
        </span>
        {isMobile && (
          <span className="send-hint">
            {messageText.trim() ? 'Göndermek için butona bas' : 'Shift+Enter: yeni satır'}
          </span>
        )}
      </div>
    </div>
  );
};

export default MessageInput;
