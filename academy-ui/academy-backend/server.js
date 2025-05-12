const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const { db } = require('./firebase'); // Firebase bağlantısı
const { authenticateUser } = require('./auth'); // ✅ Middleware import edildi
const seminarRoutes = require('./routes/seminarRoutes');

// .env dosyasını yükle
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Seminer rotaları (korumalı)
app.use('/seminars', authenticateUser, seminarRoutes); // ✅ Kimlik doğrulama eklendi

// Test endpoint
app.get('/', (req, res) => {
  res.send('Sunucu çalışıyor!');
});

// Socket.IO başlat
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Socket.IO işlemleri
io.on('connection', (socket) => {
  socket.on('join-room', (roomId, userId, isAdmin) => {
    socket.join(roomId);

    socket.to(roomId).emit('user-connected', userId, isAdmin);

    socket.on('signal', (data) => {
      io.to(data.to).emit('signal', { userId: data.userId, signal: data.signal });
    });

    socket.on('send-message', (roomId, message) => {
      socket.to(roomId).emit('receive-message', message);
    });

    socket.on('end-seminar', (roomId) => {
      io.to(roomId).emit('seminar-ended');
    });

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });
});

// Mesaj gönderme API'si
app.post('/sendMessage', async (req, res) => {
  const { fromUserId, toUserId, text } = req.body;

  try {
    await db.collection('messages').add({
      from: fromUserId,
      to: toUserId,
      text,
      timestamp: Date.now(),
      status: 'sent',
    });
    res.status(200).send('Mesaj gönderildi');
  } catch (error) {
    console.error("Mesaj gönderilemedi:", error);
    res.status(500).send('Mesaj gönderilemedi');
  }
});

// Mesaj durumu güncelleme API'si
app.post('/updateMessageStatus', async (req, res) => {
  const { messageId, status } = req.body;

  try {
    await db.collection('messages').doc(messageId).update({ status });
    res.status(200).send('Mesaj durumu güncellendi');
  } catch (error) {
    console.error("Durum güncellenemedi:", error);
    res.status(500).send('Mesaj durumu güncellenemedi');
  }
});

// Kullanıcı yazma durumu güncelleme API'si
app.post('/setUserTypingStatus', async (req, res) => {
  const { userId, isTyping } = req.body;

  try {
    await db.collection('users').doc(userId).update({ isTyping });
    res.status(200).send('Kullanıcı durumu güncellendi');
  } catch (error) {
    console.error("Yazma durumu güncellenemedi:", error);
    res.status(500).send('Kullanıcı durumu güncellenemedi');
  }
});

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Sunucu ${PORT} portunda çalışıyor`);
});
