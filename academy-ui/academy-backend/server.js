const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const socketHandler = require('./socketHandler');
require('dotenv').config(); // .env desteği varsa
const { db } = require('./firebase'); // Firebase bağlantısı
const app = express();
const server = http.createServer(app);

// CORS yapılandırması
app.use(cors());

// Test endpoint (isteğe bağlı)
app.get('/', (req, res) => {
  res.send('Gerçek zamanlı mesajlaşma backend çalışıyor!');
});

// Socket.IO sunucusunu başlat
const io = new Server(server, {
  cors: {
    origin: '*', // Geliştirme için tüm kaynaklara izin verilir
    methods: ['GET', 'POST'],
  },
});

// Socket olaylarını yönet
socketHandler(io);

// Mesaj gönderme API'si
app.post('/sendMessage', async (req, res) => {
  const { fromUserId, toUserId, text } = req.body;

  try {
    // Mesajı Firestore'a kaydetme
    await sendMessage(fromUserId, toUserId, text);
    res.status(200).send('Mesaj gönderildi');
  } catch (error) {
    res.status(500).send('Mesaj gönderilemedi');
  }
});

// Mesaj gönderme fonksiyonu
const sendMessage = async (fromUserId, toUserId, text) => {
  const timestamp = Date.now();
  try {
    await db.collection('messages').add({
      from: fromUserId,
      to: toUserId,
      text,
      timestamp,
      status: 'sent', // Mesaj başlangıç durumu 'sent'
    });
  } catch (error) {
    console.error("Mesaj gönderilemedi: ", error);
    throw new Error('Mesaj gönderilemedi');
  }
};

// Mesaj durumu güncelleme API'si
app.post('/updateMessageStatus', async (req, res) => {
  const { messageId, status } = req.body;

  try {
    // Mesaj durumunu Firestore'da güncelleme
    await updateMessageStatus(messageId, status);
    res.status(200).send('Mesaj durumu güncellendi');
  } catch (error) {
    res.status(500).send('Mesaj durumu güncellenemedi');
  }
});

// Mesaj durumu güncelleme fonksiyonu
const updateMessageStatus = async (messageId, status) => {
  try {
    await db.collection('messages').doc(messageId).update({
      status: status, // 'sent', 'delivered', 'read'
    });
  } catch (error) {
    console.error("Mesaj durumu güncellenemedi: ", error);
    throw new Error('Mesaj durumu güncellenemedi');
  }
};

// Kullanıcı yazma durumu güncelleme API'si
app.post('/setUserTypingStatus', async (req, res) => {
  const { userId, isTyping } = req.body;

  try {
    await setUserTypingStatus(userId, isTyping);
    res.status(200).send('Kullanıcı durumu güncellendi');
  } catch (error) {
    res.status(500).send('Kullanıcı durumu güncellenemedi');
  }
});

// Kullanıcı yazma durumu güncelleme fonksiyonu
const setUserTypingStatus = async (userId, isTyping) => {
  try {
    await db.collection('users').doc(userId).update({
      isTyping: isTyping,
    });
  } catch (error) {
    console.error("Kullanıcı durumu güncellenemedi: ", error);
    throw new Error('Kullanıcı durumu güncellenemedi');
  }
};

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ WebSocket sunucusu ${PORT} portunda çalışıyor`);
});
