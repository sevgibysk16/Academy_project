const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Aktif odaları ve kullanıcıları takip etmek için
const rooms = {};

io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;
  console.log(`Kullanıcı bağlandı: ${userId}`);

  // Kullanıcı bir odaya katıldığında
  socket.on('join-room', (roomId, userId, isAdmin) => {
    console.log(`Kullanıcı ${userId} odaya katıldı: ${roomId}`);
    
    // Odayı oluştur veya mevcut odaya katıl
    if (!rooms[roomId]) {
      rooms[roomId] = {
        participants: {},
        messages: []
      };
    }
    
    // Kullanıcıyı odaya ekle
    rooms[roomId].participants[userId] = {
      socketId: socket.id,
      isAdmin,
      joinedAt: new Date()
    };
    
    // Kullanıcıyı odaya abone et
    socket.join(roomId);
    
    // Diğer kullanıcılara yeni kullanıcının katıldığını bildir
    socket.to(roomId).emit('user-connected', userId, isAdmin);
    
    // Kullanıcı ayrıldığında
    socket.on('disconnect', () => {
      console.log(`Kullanıcı ayrıldı: ${userId}`);
      
      // Kullanıcının bulunduğu tüm odalardan çıkar
      Object.keys(rooms).forEach(id => {
        if (rooms[id].participants[userId]) {
          delete rooms[id].participants[userId];
          
          // Eğer odada hiç kullanıcı kalmadıysa odayı sil
          if (Object.keys(rooms[id].participants).length === 0) {
            delete rooms[id];
          } else {
            // Diğer kullanıcılara kullanıcının ayrıldığını bildir
            socket.to(id).emit('user-disconnected', userId);
          }
        }
      });
    });
  });
  
  // Sinyal gönderildiğinde
  socket.on('signal', ({ to, userId, signal }) => {
    io.to(getSocketId(to)).emit('signal', {
      userId,
      signal
    });
  });
  
  // Mesaj gönderildiğinde
  socket.on('send-message', (roomId, message) => {
    if (rooms[roomId]) {
      // Mesajı odadaki diğer kullanıcılara ilet
      socket.to(roomId).emit('receive-message', message);
      
      // Mesajı odanın mesaj geçmişine ekle
      rooms[roomId].messages.push(message);
    }
  });
  
  // Seminer oluşturulduğunda
  socket.on('create-seminar', ({ seminarId, userId, isAdmin }) => {
    console.log(`Seminer oluşturuldu: ${seminarId} (${userId})`);
    
    if (!rooms[seminarId]) {
      rooms[seminarId] = {
        participants: {},
        messages: [],
        createdBy: userId,
        createdAt: new Date()
      };
    }
    
    // Kullanıcıyı odaya ekle
    rooms[seminarId].participants[userId] = {
      socketId: socket.id,
      isAdmin,
      joinedAt: new Date()
    };
    
    // Kullanıcıyı odaya abone et
    socket.join(seminarId);
  });
  
  // Seminere katılma
  socket.on('join-seminar', ({ seminarId, userId, userName, isAdmin }) => {
    console.log(`Kullanıcı seminere katıldı: ${seminarId} (${userId})`);
    
    if (!rooms[seminarId]) {
      rooms[seminarId] = {
        participants: {},
        messages: []
      };
    }
    
    // Kullanıcıyı odaya ekle
    rooms[seminarId].participants[userId] = {
      socketId: socket.id,
      isAdmin,
      userName,
      joinedAt: new Date()
    };
    
    // Kullanıcıyı odaya abone et
    socket.join(seminarId);
    
    // Diğer kullanıcılara yeni kullanıcının katıldığını bildir
    socket.to(seminarId).emit('user-connected', userId, isAdmin, userName);
  });
  
  // Semineri sonlandırma
  socket.on('end-seminar', (seminarId) => {
    console.log(`Seminer sonlandırıldı: ${seminarId}`);
    
    if (rooms[seminarId]) {
      // Odadaki tüm kullanıcılara seminerin sonlandığını bildir
      io.to(seminarId).emit('seminar-ended');
      
      // Odayı sil
      delete rooms[seminarId];
    }
  });
  
  // Katılımcı listesini isteme
  socket.on('get-participants', (roomId) => {
    if (rooms[roomId]) {
      const participantsList = Object.entries(rooms[roomId].participants).map(([id, data]) => ({
        id,
        isAdmin: data.isAdmin,
        name: data.userName || 'Katılımcı'
      }));
      
      socket.emit('participants-list', participantsList);
    } else {
      socket.emit('participants-list', []);
    }
  });
});

// Socket ID'sini kullanıcı ID'sine göre bul
function getSocketId(userId) {
  for (const roomId in rooms) {
    if (rooms[roomId].participants[userId]) {
      return rooms[roomId].participants[userId].socketId;
    }
  }
  return null;
}

// Basit bir API endpoint'i
app.get('/', (req, res) => {
  res.send('Seminer API çalışıyor');
});

// Aktif seminerleri listele
app.get('/api/seminars', (req, res) => {
  const activeSeminars = Object.keys(rooms).map(roomId => ({
    id: roomId,
    participantCount: Object.keys(rooms[roomId].participants).length,
    createdAt: rooms[roomId].createdAt
  }));
  
  res.json(activeSeminars);
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
}); 