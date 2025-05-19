const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS ayarları
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  methods: ["GET", "POST"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// Socket.IO yapılandırması
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  allowEIO3: true
});

// Aktif odalar ve katılımcılar için Map
const seminarRooms = new Map();

// Socket.IO bağlantı yönetimi
io.on('connection', (socket) => {
  console.log('Yeni kullanıcı bağlandı:', socket.id);

  // Bağlantı durumunu kontrol et
  socket.on('connect_error', (error) => {
    console.error('Bağlantı hatası:', error);
  });

  socket.on('error', (error) => {
    console.error('Socket hatası:', error);
  });

  // Seminer odasına katılma
  socket.on('joinSeminarRoom', ({ seminarId, userId, isHost }) => {
    try {
      socket.join(seminarId);
      
      if (!seminarRooms.has(seminarId)) {
        seminarRooms.set(seminarId, {
          participants: new Map(),
          messages: []
        });
      }
      
      const room = seminarRooms.get(seminarId);
      room.participants.set(userId, {
        id: userId,
        socketId: socket.id,
        isHost,
        joinedAt: Date.now()
      });
      
      // Katılımcılara bildirim
      socket.to(seminarId).emit('userJoinedSeminar', { userId });
      
      // Mevcut katılımcıları ve mesajları gönder
      socket.emit('seminarParticipants', {
        participants: Array.from(room.participants.values()),
        messages: room.messages
      });
      
      console.log(`${userId} kullanıcısı ${seminarId} odasına katıldı`);
    } catch (error) {
      console.error('Oda katılım hatası:', error);
      socket.emit('error', { message: 'Oda katılım hatası' });
    }
  });

  // Seminer mesajı gönderme
  socket.on('sendSeminarMessage', ({ seminarId, message }) => {
    try {
      const room = seminarRooms.get(seminarId);
      if (!room) return;

      const newMessage = {
        id: Date.now().toString(),
        ...message,
        timestamp: Date.now()
      };
      
      room.messages.push(newMessage);
      io.to(seminarId).emit('seminarMessage', newMessage);
      
      console.log(`${message.senderId} kullanıcısı ${seminarId} odasına mesaj gönderdi`);
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
    }
  });

  // Yazma durumu
  socket.on('typing', ({ seminarId, userId, isTyping }) => {
    socket.to(seminarId).emit('userTyping', { userId, isTyping });
  });

  // Canlı yayın başlatma
  socket.on('startStreaming', ({ seminarId, userId }) => {
    socket.join(`${seminarId}-stream`);
    io.to(seminarId).emit('streamStarted', { userId });
    console.log(`${userId} kullanıcısı ${seminarId} odasında yayın başlattı`);
  });

  // Canlı yayın verisi
  socket.on('streamData', ({ seminarId, data }) => {
    socket.to(`${seminarId}-stream`).emit('streamData', data);
  });

  // Canlı yayın durdurma
  socket.on('stopStreaming', ({ seminarId, userId }) => {
    socket.leave(`${seminarId}-stream`);
    io.to(seminarId).emit('streamStopped', { userId });
    console.log(`${userId} kullanıcısı ${seminarId} odasında yayını durdurdu`);
  });

  // Seminer odasından ayrılma
  socket.on('leaveSeminarRoom', ({ seminarId, userId }) => {
    try {
      const room = seminarRooms.get(seminarId);
      if (!room) return;

      socket.leave(seminarId);
      room.participants.delete(userId);

      socket.to(seminarId).emit('userLeftSeminar', { userId });

      if (room.participants.size === 0) {
        seminarRooms.delete(seminarId);
        io.to(seminarId).emit('seminarEnded', { seminarId });
      }

      console.log(`${userId} kullanıcısı ${seminarId} odasından ayrıldı`);
    } catch (error) {
      console.error('Oda ayrılma hatası:', error);
    }
  });

  // Bağlantı kesildiğinde
  socket.on('disconnect', (reason) => {
    console.log('Kullanıcı bağlantısı kesildi:', socket.id, 'Sebep:', reason);
    
    // Kullanıcının bulunduğu odaları temizle
    seminarRooms.forEach((room, seminarId) => {
      const participant = Array.from(room.participants.values())
        .find(p => p.socketId === socket.id);
      
      if (participant) {
        room.participants.delete(participant.id);
        socket.to(seminarId).emit('userLeftSeminar', { userId: participant.id });
        
        if (room.participants.size === 0) {
          seminarRooms.delete(seminarId);
          io.to(seminarId).emit('seminarEnded', { seminarId });
        }
      }
    });
  });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
}); 