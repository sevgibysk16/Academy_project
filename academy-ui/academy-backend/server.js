const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();
const { db } = require('./firebase');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.56.1:3000'],
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Socket.IO sunucusu yapılandırması
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://192.168.56.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true,
  maxHttpBufferSize: 1e8,
  path: '/socket.io/',
  serveClient: false,
  connectTimeout: 45000,
  allowUpgrades: true,
  perMessageDeflate: { threshold: 2048 }
});

// WebRTC için global değişkenler
const rooms = new Map();
const userSockets = new Map();

// Socket.IO engine olayları
io.engine.on('connection_error', (err) => {
  console.error('🔌 Bağlantı hatası:', err);
});

io.engine.on('upgrade', (transport) => {
  console.log('🔄 Transport yükseltildi:', transport.name);
});

io.engine.on('upgradeError', (err) => {
  console.error('❌ Transport yükseltme hatası:', err);
});

// Socket bağlantı yönetimi
io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
  console.log(`✅ Yeni kullanıcı bağlandı: ${socket.id}${userId ? ` (User: ${userId})` : ''}`);
  
  if (userId) {
    userSockets.set(userId, socket.id);
    socket.userId = userId;
  }

  socket.emit('connected', {
    socketId: socket.id,
    userId,
    timestamp: new Date().toISOString()
  });

  // WebRTC odaya katılma
  socket.on('joinWebRTC', ({ roomId, userId, isHost }) => {
    try {
      console.log(`🎥 WebRTC bağlantısı başlatılıyor - Room: ${roomId}, User: ${userId}, Host: ${isHost}`);
      socket.join(roomId);
      socket.currentRoom = roomId;
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      
      rooms.get(roomId).set(socket.id, {
        userId,
        isHost,
        joinedAt: new Date()
      });

      socket.to(roomId).emit('userJoined', {
        userId,
        isHost,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });

      const roomParticipants = Array.from(rooms.get(roomId).entries())
        .filter(([sid]) => sid !== socket.id)
        .map(([sid, data]) => ({
          socketId: sid,
          userId: data.userId,
          isHost: data.isHost
        }));

      socket.emit('roomParticipants', roomParticipants);
      console.log(`✅ WebRTC bağlantısı başarıyla kuruldu - Room: ${roomId}, User: ${userId}`);
    } catch (error) {
      console.error('WebRTC bağlantı hatası:', error);
      socket.emit('error', {
        message: 'WebRTC bağlantısı kurulamadı: ' + error.message,
        code: 'WEBRTC_CONNECTION_FAILED'
      });
    }
  });

  // WebRTC Offer
  socket.on('offer', ({ roomId, offer, targetUserId }) => {
    try {
      console.log(`📤 Offer gönderiliyor - Room: ${roomId}, From: ${socket.id}`);
      if (!rooms.has(roomId)) throw new Error('Oda bulunamadı');
      
      const targetSocketId = userSockets.get(targetUserId);
      if (targetUserId && targetSocketId) {
        io.to(targetSocketId).emit('offer', {
          offer,
          from: socket.id,
          fromUserId: socket.userId,
          roomId
        });
        console.log(`✅ Offer başarıyla gönderildi - To: ${targetUserId}`);
      } else {
        socket.to(roomId).emit('offer', {
          offer,
          from: socket.id,
          fromUserId: socket.userId,
          roomId
        });
        console.log(`✅ Offer başarıyla yayınlandı - Room: ${roomId}`);
      }
    } catch (error) {
      console.error('Offer gönderme hatası:', error);
      socket.emit('error', {
        message: 'Offer gönderilemedi: ' + error.message,
        code: 'OFFER_SEND_FAILED'
      });
    }
  });

  // WebRTC Answer
  socket.on('answer', ({ roomId, answer, targetUserId }) => {
    try {
      console.log(`📥 Answer gönderiliyor - Room: ${roomId}, From: ${socket.id}`);
      if (!rooms.has(roomId)) throw new Error('Oda bulunamadı');
      
      const targetSocketId = userSockets.get(targetUserId);
      if (targetUserId && targetSocketId) {
        io.to(targetSocketId).emit('answer', {
          answer,
          from: socket.id,
          fromUserId: socket.userId,
          roomId
        });
        console.log(`✅ Answer başarıyla gönderildi - To: ${targetUserId}`);
      } else {
        socket.to(roomId).emit('answer', {
          answer,
          from: socket.id,
          fromUserId: socket.userId,
          roomId
        });
        console.log(`✅ Answer başarıyla yayınlandı - Room: ${roomId}`);
      }
    } catch (error) {
      console.error('Answer gönderme hatası:', error);
      socket.emit('error', {
        message: 'Answer gönderilemedi: ' + error.message,
        code: 'ANSWER_SEND_FAILED'
      });
    }
  });

  // ICE Candidate
  socket.on('ice-candidate', ({ roomId, candidate, targetUserId }) => {
    try {
      console.log(`🧊 ICE candidate gönderiliyor - Room: ${roomId}, From: ${socket.id}`);
      if (!rooms.has(roomId)) throw new Error('Oda bulunamadı');
      
      const targetSocketId = userSockets.get(targetUserId);
      if (targetUserId && targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', {
          candidate,
          from: socket.id,
          fromUserId: socket.userId,
          roomId
        });
        console.log(`✅ ICE candidate başarıyla gönderildi - To: ${targetUserId}`);
      } else {
        socket.to(roomId).emit('ice-candidate', {
          candidate,
          from: socket.id,
          fromUserId: socket.userId,
          roomId
        });
        console.log(`✅ ICE candidate başarıyla yayınlandı - Room: ${roomId}`);
      }
    } catch (error) {
      console.error('ICE candidate gönderme hatası:', error);
      socket.emit('error', {
        message: 'ICE candidate gönderilemedi: ' + error.message,
        code: 'ICE_CANDIDATE_SEND_FAILED'
      });
    }
  });

  // WebRTC odadan ayrılma
  socket.on('leaveWebRTC', ({ roomId }) => {
    try {
      handleLeaveRoom(socket, roomId);
    } catch (error) {
      console.error('WebRTC odadan ayrılma hatası:', error);
    }
  });

  // Bağlantı kesme
  socket.on('disconnect', (reason) => {
    console.log(`❌ Kullanıcı bağlantıyı kopardı: ${socket.id}, Reason: ${reason}`);
    try {
      if (socket.userId) userSockets.delete(socket.userId);
      if (socket.currentRoom) handleLeaveRoom(socket, socket.currentRoom);
      rooms.forEach((users, roomId) => {
        if (users.has(socket.id)) handleLeaveRoom(socket, roomId);
      });
    } catch (error) {
      console.error('Bağlantı kesme hatası:', error);
    }
  });
});

// Odadan ayrılma fonksiyonu
function handleLeaveRoom(socket, roomId) {
  socket.leave(roomId);
  if (rooms.has(roomId)) {
    const roomData = rooms.get(roomId).get(socket.id);
    rooms.get(roomId).delete(socket.id);
    
    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
      console.log(`🗑️ Oda silindi: ${roomId} (boş kaldı)`);
    }

    socket.to(roomId).emit('userLeft', {
      userId: socket.userId || socket.id,
      socketId: socket.id,
      userData: roomData,
      timestamp: new Date().toISOString()
    });
    console.log(`👋 ${socket.id} odadan ayrıldı: ${roomId}`);
  }
}

// Temizlik işlemleri
setInterval(() => {
  const now = new Date();
  rooms.forEach((users, roomId) => {
    users.forEach((userData, socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket || !socket.connected) {
        console.log(`🧹 Eski bağlantı temizleniyor: ${socketId} odadan: ${roomId}`);
        users.delete(socketId);
        if (users.size === 0) rooms.delete(roomId);
      }
    });
  });
}, 30000);

setInterval(() => {
  if (rooms.size > 0) {
    console.log(`📊 Aktif odalar: ${rooms.size}, Toplam bağlantı: ${io.engine.clientsCount}`);
  }
}, 60000);

// Test endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Gerçek zamanlı mesajlaşma backend çalışıyor!',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 5001,
    activeRooms: rooms.size,
    totalConnections: io.engine.clientsCount
  });
});

// Seminer API endpoint
app.get('/api/seminars', (req, res) => {
  const activeSeminars = Array.from(rooms.entries()).map(([roomId, users]) => ({
    id: roomId,
    participantCount: users.size,
    participants: Array.from(users.values()).map(user => ({
      userId: user.userId,
      isHost: user.isHost,
      joinedAt: user.joinedAt
    }))
  }));
  res.json(activeSeminars);
});

// Mesajlaşma API Routes
app.post('/sendMessage', async (req, res) => {
  const { fromUserId, toUserId, text } = req.body;
  
  if (!fromUserId || !toUserId || !text) {
    return res.status(400).json({ error: 'Eksik alanlar var' });
  }

  try {
    await sendMessage(fromUserId, toUserId, text);
    res.status(200).json({ message: 'Mesaj gönderildi' });
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    res.status(500).json({ error: 'Mesaj gönderilemedi' });
  }
});

app.post('/updateMessageStatus', async (req, res) => {
  const { messageId, status } = req.body;
  
  if (!messageId || !status) {
    return res.status(400).json({ error: 'Eksik alanlar var' });
  }

  try {
    await updateMessageStatus(messageId, status);
    res.status(200).json({ message: 'Mesaj durumu güncellendi' });
  } catch (error) {
    console.error('Mesaj durumu güncelleme hatası:', error);
    res.status(500).json({ error: 'Mesaj durumu güncellenemedi' });
  }
});

app.post('/setUserTypingStatus', async (req, res) => {
  const { userId, isTyping } = req.body;
  
  if (!userId || typeof isTyping !== 'boolean') {
    return res.status(400).json({ error: 'Eksik alanlar var' });
  }

  try {
    await setUserTypingStatus(userId, isTyping);
    res.status(200).json({ message: 'Kullanıcı durumu güncellendi' });
  } catch (error) {
    console.error('Kullanıcı durumu güncelleme hatası:', error);
    res.status(500).json({ error: 'Kullanıcı durumu güncellenemedi' });
  }
});

// Helper functions
const sendMessage = async (fromUserId, toUserId, text) => {
  const timestamp = Date.now();
  try {
    const docRef = await db.collection('messages').add({
      from: fromUserId,
      to: toUserId,
      text,
      timestamp,
      status: 'sent',
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error("Mesaj gönderilemedi: ", error);
    throw new Error('Mesaj gönderilemedi');
  }
};

const updateMessageStatus = async (messageId, status) => {
  try {
    await db.collection('messages').doc(messageId).update({
      status: status,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Mesaj durumu güncellenemedi: ", error);
    throw new Error('Mesaj durumu güncellenemedi');
  }
};

const setUserTypingStatus = async (userId, isTyping) => {
  try {
    await db.collection('users').doc(userId).update({
      isTyping: isTyping,
      lastActivity: new Date     });
  } catch (error) {
    console.error("Kullanıcı durumu güncellenemedi: ", error);
    throw new Error('Kullanıcı durumu güncellenemedi');
  }
};

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Sunucu hatası:', error);
  res.status(500).json({ error: 'Sunucu hatası' });
});

// Port yapılandırması
const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ WebSocket sunucusu ${PORT} portunda çalışıyor`);
  console.log(`🌐 Test URL: http://localhost:${PORT}`);
  console.log(`🌐 Network URL: http://192.168.56.1:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı, sunucu kapatılıyor');
  server.close(() => {
    console.log('İşlem sonlandırıldı');
  });
});

