import React, { useState, useRef, useEffect } from 'react';
import { generateChatbotResponse } from '../utils/geminiAİ';
import './ChatBot.css';

const ChatBot = ({ videoUrl, videoType }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Son 3 mesajı bağlam olarak kullan
      const context = messages.slice(-3).map(m => `${m.sender}: ${m.text}`).join('\n');
      const response = await generateChatbotResponse(input, context);
            
      const botMessage = {
        text: response,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        text: `Hata: ${error.message}`,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChatbot = () => {
    setIsOpen(!isOpen);
    // If opening the chatbot and no messages yet, add a welcome message
    if (!isOpen && messages.length === 0) {
      const welcomeMessage = {
        text: "Merhaba! Ben akademik tez sunumları konusunda size yardımcı olabilecek yapay zeka asistanınızım. Size nasıl yardımcı olabilirim?",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([welcomeMessage]);
    }
  };

  return (
    <div className={`chatbot-wrapper ${isOpen ? 'open' : ''}`}>
      {!isOpen ? (
        <button className="chatbot-toggle" onClick={toggleChatbot}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      ) : (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <h3>Yapay Zeka Asistanı</h3>
            <button className="close-button" onClick={toggleChatbot}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.sender} ${message.isError ? 'error' : ''}`}
              >
                <div className="message-content">
                  <p>{message.text}</p>
                  <span className="timestamp">{message.timestamp}</span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message bot">
                <div className="message-content">
                  <p>Düşünüyorum...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} className="chatbot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mesajınızı yazın..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
