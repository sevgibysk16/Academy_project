// src/utils/socket.js

import { io } from 'socket.io-client';

let socket = null;

// WebSocket'e bağlan
export const connectWebSocket = (userId) => {
  socket = io('http://localhost:5000', {
    query: { userId },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket bağlantısı kuruldu:', socket.id);
  });

  socket.on('disconnect', () => {
    console.warn('🔌 WebSocket bağlantısı kesildi.');
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Bağlantı hatası:', error);
  });

  return socket;
};

export const connectSocket = (userId) => {
  if (!socket) {
    return connectWebSocket(userId);
  }
  console.log('WebSocket zaten bağlı:', socket.id);
  return socket;
};

export const sendMessage = (message) => {
  if (socket && socket.connected) {
    socket.emit('sendMessage', message);
  } else {
    console.error('⚠️ WebSocket bağlı değil.');
  }
};

export const onMessageReceived = (callback) => {
  if (socket) {
    socket.on('receiveMessage', callback);
  }
};

// 🟢 Yazıyor bildirimi gönder
export const sendTyping = (roomId, senderId) => {
  if (socket && socket.connected) {
    socket.emit('typing', { roomId, senderId });
  }
};

// 🟢 Yazıyor bildirimi dinle
export const onTypingReceived = (callback) => {
  if (socket) {
    socket.on('typing', callback);
  }
};

export const userTyping = (roomId, senderId, isTyping) => {
  if (socket && socket.connected) {
    socket.emit('userTyping', { roomId, senderId, isTyping });
  }
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    console.log('✅ WebSocket bağlantısı kesildi');
    socket = null;
  }
};
