import { io } from 'socket.io-client';

class SocketManager {
  constructor() {
    this.socket = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.connectionPromise = null;
  }

  connect(userId) {
    // Eğer zaten bağlantı kuruluyorsa, mevcut promise'i döndür
    if (this.connectionPromise) {
      console.log('🔄 Bağlantı zaten kuruluyor...');
      return this.connectionPromise;
    }

    // Eğer socket zaten bağlıysa, mevcut socket'i döndür
    if (this.socket && this.socket.connected) {
      console.log('✅ Zaten bağlı bir socket var');
      return Promise.resolve(this.socket);
    }

    console.log('🔄 Yeni socket bağlantısı başlatılıyor...');
    this.isConnecting = true;
    this.reconnectAttempts = 0;

    // Yeni bağlantı promise'i oluştur
    this.connectionPromise = new Promise((resolve, reject) => {
      // Eğer eski socket varsa kapat
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }

      // Yeni socket oluştur
      this.socket = io('http://localhost:5001', {
        query: { userId },
        transports: ['websocket'],
        upgrade: false,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        autoConnect: true,
        forceNew: true
      });

      // Bağlantı başarılı olduğunda
      this.socket.on('connect', () => {
        console.log('✅ WebSocket bağlantısı kuruldu:', this.socket.id);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        resolve(this.socket);
      });

      // Bağlantı hatası olduğunda
      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket bağlantı hatası:', error);
        this.isConnecting = false;
        this.handleReconnect(userId);
        reject(error);
      });

      // Bağlantı kesildiğinde
      this.socket.on('disconnect', (reason) => {
        console.warn('🔌 WebSocket bağlantısı kesildi:', reason);
        this.isConnecting = false;
        if (reason === 'io server disconnect' || reason === 'transport close') {
          this.handleReconnect(userId);
        }
      });

      // Sunucu onayı geldiğinde
      this.socket.on('connected', (data) => {
        console.log('🎯 Server confirmation:', data);
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      });

      // Genel hata durumunda
      this.socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        this.isConnecting = false;
        reject(error);
      });
    });

    // Promise tamamlandığında veya hata verdiğinde connectionPromise'i sıfırla
    this.connectionPromise.finally(() => {
      this.connectionPromise = null;
    });

    return this.connectionPromise;
  }

  handleReconnect(userId) {
    if (this.reconnectAttempts < this.maxReconnectAttempts && !this.isConnecting) {
      this.reconnectAttempts++;
      console.log(`🔄 Yeniden bağlanma denemesi ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 5000);
      
      setTimeout(() => {
        if (!this.socket || !this.socket.connected) {
          this.connect(userId);
        }
      }, delay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Maksimum yeniden bağlanma denemesi aşıldı');
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      this.connectionPromise = null;
      console.log('🔌 Socket bağlantısı kapatıldı');
    }
  }

  isConnected() {
    return this.socket && this.socket.connected && !this.isConnecting;
  }

  getSocket() {
    return this.socket;
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      return true;
    }
    return false;
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event) {
    if (this.socket) {
      this.socket.off(event);
    }
  }
}

// Singleton instance
const socketManager = new SocketManager();

// Export functions
export const connectSocket = (userId) => socketManager.connect(userId);
export const disconnectSocket = () => socketManager.disconnect();
export const isSocketConnected = () => socketManager.isConnected();
export const getSocket = () => socketManager.getSocket();
export const emit = (event, data) => socketManager.emit(event, data);
export const on = (event, callback) => socketManager.on(event, callback);
export const off = (event) => socketManager.off(event);

// WebRTC specific functions
export const joinWebRTCRoom = (roomId, userId, isHost) => {
  if (socketManager.isConnected()) {
    socketManager.emit('joinWebRTC', { roomId, userId, isHost });
    console.log(`🎥 WebRTC odasına katıldı: ${roomId}, Host: ${isHost}`);
    return true;
  }
  console.error('⚠️ WebSocket bağlı değil.');
  return false;
};

export const leaveWebRTCRoom = (roomId) => {
  if (socketManager.isConnected()) {
    socketManager.emit('leaveWebRTC', { roomId });
    console.log(`🚪 WebRTC odasından ayrıldı: ${roomId}`);
  }
};

export const sendWebRTCOffer = (roomId, offer, targetUserId = null) => {
  if (socketManager.isConnected()) {
    socketManager.emit('offer', { roomId, offer, targetUserId });
    console.log('📤 WebRTC Offer gönderildi', { roomId, targetUserId });
    return true;
  }
  console.error('⚠️ WebSocket bağlı değil - Offer gönderilemedi');
  return false;
};

export const sendWebRTCAnswer = (roomId, answer, targetUserId = null) => {
  if (socketManager.isConnected()) {
    socketManager.emit('answer', { roomId, answer, targetUserId });
    console.log('📤 WebRTC Answer gönderildi', { roomId, targetUserId });
    return true;
  }
  console.error('⚠️ WebSocket bağlı değil - Answer gönderilemedi');
  return false;
};

export const sendICECandidate = (roomId, candidate, targetUserId = null) => {
  if (socketManager.isConnected()) {
    socketManager.emit('ice-candidate', { roomId, candidate, targetUserId });
    console.log('📤 ICE Candidate gönderildi', { roomId, targetUserId });
    return true;
  }
  console.error('⚠️ WebSocket bağlı değil - ICE Candidate gönderilemedi');
  return false;
};

// Event listeners
export const onWebRTCOffer = (callback) => {
  socketManager.on('offer', (data) => {
    console.log('📥 WebRTC Offer alındı:', data);
    callback(data);
  });
};

export const onWebRTCAnswer = (callback) => {
  socketManager.on('answer', (data) => {
    console.log('📥 WebRTC Answer alındı:', data);
    callback(data);
  });
};

export const onICECandidate = (callback) => {
  socketManager.on('ice-candidate', (data) => {
    console.log('📥 ICE Candidate alındı:', data);
    callback(data);
  });
};

export const onUserJoinedWebRTC = (callback) => {
  socketManager.on('userJoined', (data) => {
    console.log('👤 Kullanıcı WebRTC odasına katıldı:', data);
    callback(data);
  });
};

export const onUserLeftWebRTC = (callback) => {
  socketManager.on('userLeft', (data) => {
    console.log('👤 Kullanıcı WebRTC odasından ayrıldı:', data);
    callback(data);
  });
};

export const onRoomParticipants = (callback) => {
  socketManager.on('roomParticipants', (data) => {
    console.log('👥 Oda katılımcıları:', data);
    callback(data);
  });
};

// Seminar specific functions
export const joinSeminarRoom = (seminarId, userId, isHost) => {
  const webrtcJoined = joinWebRTCRoom(seminarId, userId, isHost);
  if (socketManager.isConnected()) {
    socketManager.emit('joinRoom', seminarId);
    console.log(`💬 Chat odasına katıldı: ${seminarId}`);
  }
  return webrtcJoined;
};

export const leaveSeminarRoom = (seminarId) => {
  leaveWebRTCRoom(seminarId);
};

export const sendSeminarMessage = (seminarId, senderId, message) => {
  if (socketManager.isConnected()) {
    socketManager.emit('sendMessage', {
      roomId: seminarId,
      senderId,
      message,
      timestamp: new Date().toISOString()
    });
  }
};

export const onSeminarMessage = (callback) => {
  socketManager.on('receiveMessage', callback);
};

export const onSeminarParticipants = (callback) => {
  onRoomParticipants(callback);
};

// ==================== CONNECTION HEALTH CHECK ====================
export const sendPing = () => {
  if (socketManager.isConnected()) {
    socketManager.emit('ping');
    console.log('📡 Ping gönderildi');
  }
};

// Bağlantı sağlığını kontrol et
export const checkConnectionHealth = () => {
  return new Promise((resolve) => {
    if (!socketManager.isConnected()) {
      resolve(false);
      return;
    }

    const timeout = setTimeout(() => {
      resolve(false);
    }, 5000);

    socketManager.emit('ping');
    socketManager.on('pong', () => {
      clearTimeout(timeout);
      resolve(true);
    });
  });
};

// ==================== UTILITY FUNCTIONS ====================
export const getSocketId = () => {
  return socketManager.getSocket() ? socketManager.getSocket().id : null;
};

export const removeAllListeners = () => {
  if (socketManager.getSocket()) {
    socketManager.getSocket().removeAllListeners();
  }
};

export const removeListener = (eventName) => {
  if (socketManager.getSocket()) {
    socketManager.getSocket().off(eventName);
  }
};

// ==================== DEBUG FUNCTIONS ====================
export const getConnectionStatus = () => {
  if (!socketManager.getSocket()) return 'NOT_INITIALIZED';
  if (socketManager.getSocket().connected) return 'CONNECTED';
  if (socketManager.getSocket().connecting) return 'CONNECTING';
  return 'DISCONNECTED';
};

export const getRoomInfo = () => {
  return {
    socketId: getSocketId(),
    connected: isSocketConnected(),
    status: getConnectionStatus(),
    reconnectAttempts: socketManager.reconnectAttempts
  };
};

// Chat specific functions
export const sendMessage = (roomId, senderId, message) => {
  if (socketManager.isConnected()) {
    socketManager.emit('sendMessage', {
      roomId,
      senderId,
      message,
      timestamp: new Date().toISOString()
    });
    return true;
  }
  console.error('⚠️ WebSocket bağlı değil.');
  return false;
};

export const onMessageReceived = (callback) => {
  socketManager.on('receiveMessage', callback);
};

export const sendTyping = (roomId, senderId, isTyping) => {
  if (socketManager.isConnected()) {
    socketManager.emit('userTyping', { roomId, senderId, isTyping });
    return true;
  }
  console.error('⚠️ WebSocket bağlı değil.');
  return false;
};

export const onTypingReceived = (callback) => {
  socketManager.on('userTyping', callback);
};

// Utility functions
export const closeSocket = () => {
  socketManager.disconnect();
};
