import { io } from 'socket.io-client';

let socket = null;

// Connect to WebSocket
export const connectWebSocket = (userId) => {
  socket = io('http://localhost:5000', {
    query: { userId },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('✅ WebSocket bağlantısı kuruldu:', socket.id);
  });

  socket.on('disconnect', () => {
    console.warn('🔌 WebSocket bağlantısı kesildi.');
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

// Message functions
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

// Typing notification functions
export const sendTyping = (isTyping) => {
  if (socket && socket.connected) {
    socket.emit('typing', isTyping);
  }
};

export const onTypingReceived = (callback) => {
  if (socket) {
    socket.on('userTyping', callback);
  }
};

// Seminar room functions
export const joinSeminarRoom = (seminarId, userId, isHost) => {
  if (socket && socket.connected) {
    socket.emit('joinSeminarRoom', { seminarId, userId, isHost });
  }
};

export const leaveSeminarRoom = (seminarId, userId) => {
  if (socket && socket.connected) {
    socket.emit('leaveSeminarRoom', { seminarId, userId });
  }
};

export const sendSeminarMessage = (seminarId, message) => {
  if (socket && socket.connected) {
    socket.emit('sendSeminarMessage', { seminarId, message });
  }
};

export const onSeminarMessage = (callback) => {
  if (socket) {
    socket.on('seminarMessage', callback);
  }
};

export const onSeminarParticipants = (callback) => {
  if (socket) {
    socket.on('seminarParticipants', callback);
  }
};

// Live streaming functions
export const startStreaming = (seminarId, userId) => {
  if (socket && socket.connected) {
    socket.emit('startStreaming', { seminarId, userId });
  }
};

export const stopStreaming = (seminarId, userId) => {
  if (socket && socket.connected) {
    socket.emit('stopStreaming', { seminarId, userId });
  }
};

export const onStreamData = (callback) => {
  if (socket) {
    socket.on('streamData', callback);
  }
};

export const onStreamStarted = (callback) => {
  if (socket) {
    socket.on('streamStarted', callback);
  }
};

export const onStreamStopped = (callback) => {
  if (socket) {
    socket.on('streamStopped', callback);
  }
};

export const onStreamError = (callback) => {
  if (socket) {
    socket.on('streamError', callback);
  }
};

export const sendStreamData = (seminarId, data) => {
  if (socket && socket.connected) {
    socket.emit('streamData', { seminarId, data });
  }
};

// User events
export const onUserJoinedSeminar = (callback) => {
  if (socket) {
    socket.on('userJoinedSeminar', callback);
  }
};

export const onUserLeftSeminar = (callback) => {
  if (socket) {
    socket.on('userLeftSeminar', callback);
  }
};

export const onSeminarEnded = (callback) => {
  if (socket) {
    socket.on('seminarEnded', callback);
  }
};

// Connection management
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
    socket = null;
  }
}; 