const { db } = require('./firebase');

module.exports = (io) => {
  // WebRTC odalarını ve kullanıcıları takip etmek için
  const rooms = new Map();
  const userSockets = new Map();

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`✅ Yeni kullanıcı bağlandı: ${socket.id}${userId ? ` (User: ${userId})` : ''}`);
        
    if (userId) {
      userSockets.set(userId, socket.id);
      socket.userId = userId;
    }

    // Bağlantı onayı
    socket.emit('connected', {
      socketId: socket.id,
      userId: userId,
      timestamp: new Date().toISOString()
    });

    // WebRTC bağlantı yönetimi - EVENT İSMİ DÜZELTİLDİ
    socket.on('joinWebRTC', async ({ roomId, userId, isHost }) => {
      try {
        console.log(`🎥 WebRTC bağlantısı başlatılıyor - Room: ${roomId}, User: ${userId}, Host: ${isHost}`);
                
        // Kullanıcıyı odaya ekle
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Map());
        }
                
        const room = rooms.get(roomId);
        room.set(socket.id, { userId, isHost });
                
        // Odaya katıldığını bildir
        socket.join(roomId);
        socket.to(roomId).emit('userJoined', { userId, isHost, socketId: socket.id });
                
        // Oda bilgilerini gönder
        const participants = Array.from(room.entries()).map(([socketId, data]) => ({
          socketId,
          ...data
        }));
        socket.emit('roomParticipants', participants);
                
        console.log(`✅ WebRTC bağlantısı başarıyla kuruldu - Room: ${roomId}, User: ${userId}`);
      } catch (error) {
        console.error('WebRTC bağlantı hatası:', error);
        socket.emit('error', { message: 'WebRTC bağlantısı kurulamadı' });
      }
    });

    // OFFER EVENT - PARAMETRE DÜZELTMESİ
    socket.on('offer', async ({ roomId, offer, targetUserId }) => {
      try {
        console.log(`📤 Offer gönderiliyor - Room: ${roomId}, Target: ${targetUserId || 'broadcast'}`);
        const room = rooms.get(roomId);
        if (!room) {
          throw new Error('Oda bulunamadı');
        }

        if (targetUserId) {
          // Belirli bir kullanıcıya gönder
          const targetSocket = Array.from(room.entries())
            .find(([_, data]) => data.userId === targetUserId)?.[0];
          if (targetSocket) {
            io.to(targetSocket).emit('offer', { offer, from: socket.userId });
          }
        } else {
          // Odadaki herkese gönder
          socket.to(roomId).emit('offer', { offer, from: socket.userId });
        }
        
        console.log(`✅ Offer başarıyla gönderildi - Room: ${roomId}`);
      } catch (error) {
        console.error('Offer gönderme hatası:', error);
        socket.emit('error', { message: 'Offer gönderilemedi' });
      }
    });

    // ANSWER EVENT - PARAMETRE DÜZELTMESİ
    socket.on('answer', async ({ roomId, answer, targetUserId }) => {
      try {
        console.log(`📥 Answer gönderiliyor - Room: ${roomId}, Target: ${targetUserId}`);
        const room = rooms.get(roomId);
        if (!room) {
          throw new Error('Oda bulunamadı');
        }

        if (targetUserId) {
          // Belirli bir kullanıcıya gönder
          const targetSocket = Array.from(room.entries())
            .find(([_, data]) => data.userId === targetUserId)?.[0];
          if (targetSocket) {
            io.to(targetSocket).emit('answer', { answer, from: socket.userId });
          }
        } else {
          // Odadaki herkese gönder
          socket.to(roomId).emit('answer', { answer, from: socket.userId });
        }
        
        console.log(`✅ Answer başarıyla gönderildi - Room: ${roomId}`);
      } catch (error) {
        console.error('Answer gönderme hatası:', error);
        socket.emit('error', { message: 'Answer gönderilemedi' });
      }
    });

    // ICE CANDIDATE EVENT - PARAMETRE DÜZELTMESİ
    socket.on('ice-candidate', async ({ roomId, candidate, targetUserId }) => {
      try {
        console.log(`🧊 ICE candidate gönderiliyor - Room: ${roomId}, Target: ${targetUserId || 'broadcast'}`);
        const room = rooms.get(roomId);
        if (!room) {
          throw new Error('Oda bulunamadı');
        }

        if (targetUserId) {
          // Belirli bir kullanıcıya gönder
          const targetSocket = Array.from(room.entries())
            .find(([_, data]) => data.userId === targetUserId)?.[0];
          if (targetSocket) {
            io.to(targetSocket).emit('ice-candidate', { candidate, from: socket.userId });
          }
        } else {
          // Odadaki herkese gönder
          socket.to(roomId).emit('ice-candidate', { candidate, from: socket.userId });
        }
        
        console.log(`✅ ICE candidate başarıyla gönderildi - Room: ${roomId}`);
      } catch (error) {
        console.error('ICE candidate gönderme hatası:', error);
        socket.emit('error', { message: 'ICE candidate gönderilemedi' });
      }
    });

    // BAĞLANTI KESİLME OLAYLARI
    socket.on('disconnect', (reason) => {
      console.log(`❌ Kullanıcı bağlantıyı kopardı: ${socket.id}, Reason: ${reason}`);
            
      try {
        if (socket.userId) {
          userSockets.delete(socket.userId);
        }
        // Kullanıcının bulunduğu odaları temizle
        rooms.forEach((users, roomId) => {
          if (users.has(socket.id)) {
            handleLeaveRoom(socket, roomId);
          }
        });
      } catch (error) {
        console.error('Bağlantı kesme hatası:', error);
      }
    });

    // HATA YÖNETİMİ
    socket.on('error', (error) => {
      console.error(`Socket hatası (${socket.id}):`, error);
      socket.emit('error', {
        message: 'Bağlantı hatası: ' + error.message,
        code: 'SOCKET_ERROR'
      });
    });

    // PING/PONG - BAĞLANTI SAĞLIĞI KONTROLÜ
    socket.on('ping', () => {
      console.log(`📡 Ping alındı (${socket.id})`);
      socket.emit('pong');
    });

    // WebRTC room leave
    socket.on('leaveWebRTC', ({ roomId }) => {
      try {
        handleLeaveRoom(socket, roomId);
      } catch (error) {
        console.error('Leave WebRTC error:', error);
      }
    });

    // Chat room events
    socket.on('joinRoom', (roomId) => {
      try {
        socket.join(roomId);
        console.log(`💬 ${socket.id} chat odasına katıldı: ${roomId}`);
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });

    socket.on('sendMessage', async (data) => {
      const { roomId, senderId, message, timestamp } = data;
            
      if (!roomId || !senderId || !message) {
        socket.emit('messageError', 'Missing required message fields');
        return;
      }

      try {
        const messageData = {
          roomId,
          senderId,
          message,
          timestamp: timestamp || new Date().toISOString(),
          status: 'sent',
          createdAt: new Date()
        };

        const messageRef = await db.collection('messages').add(messageData);
        const messageId = messageRef.id;
        
        await db.collection('messages').doc(messageId).update({
          id: messageId,
        });

        const fullMessageData = {
          ...messageData,
          messageId,
        };

        io.to(roomId).emit('receiveMessage', fullMessageData);
        console.log(`💬 Mesaj yayınlandı ve kaydedildi: ${message.substring(0, 50)}...`);
      } catch (err) {
        console.error('Mesaj kaydedilirken hata:', err);
        socket.emit('messageError', 'Mesaj kaydedilemedi. Lütfen tekrar deneyin.');
      }
    });

    socket.on('userTyping', (data) => {
      const { roomId, senderId, isTyping } = data;
            
      if (roomId && senderId !== undefined) {
        socket.to(roomId).emit('userTyping', { senderId, isTyping });
      }
    });
  });

  // Helper function to handle leaving rooms
  function handleLeaveRoom(socket, roomId) {
    socket.leave(roomId);
        
    if (rooms.has(roomId)) {
      const roomData = rooms.get(roomId).get(socket.id);
      rooms.get(roomId).delete(socket.id);
            
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
        console.log(`🗑️ Oda silindi: ${roomId} (boş kaldı)`);
      }
            
      // Odadaki diğer kullanıcılara bildir
      socket.to(roomId).emit('userLeft', {
        userId: socket.userId || socket.id,
        socketId: socket.id,
        userData: roomData,
        timestamp: new Date().toISOString()
      });
            
      console.log(`👋 ${socket.id} odadan ayrıldı: ${roomId}`);
    }
  }

  // Periodic cleanup for stale connections
  setInterval(() => {
    rooms.forEach((users, roomId) => {
      users.forEach((userData, socketId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (!socket || !socket.connected) {
          console.log(`🧹 Eski bağlantı temizleniyor: ${socketId} odadan: ${roomId}`);
          users.delete(socketId);
                    
          if (users.size === 0) {
            rooms.delete(roomId);
          }
        }
      });
    });
  }, 30000);

  // Room statistics
  setInterval(() => {
    if (rooms.size > 0) {
      console.log(`📊 Aktif odalar: ${rooms.size}, Toplam bağlantı: ${io.engine.clientsCount}`);
    }
  }, 60000);
};
