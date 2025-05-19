const { Server } = require('socket.io');
const { db } = require('./firebase');

class SocketHandler {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      allowEIO3: true
    });

    this.seminarRooms = new Map();
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.handshake.query.userId;
      console.log(`Kullanıcı bağlandı: ${userId}, Socket ID: ${socket.id}`);

      // Genel oda katılımı
      socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`${socket.id} odasına katıldı: ${roomId}`);
      });

      // Seminer odasına katılma
      socket.on('joinSeminarRoom', ({ roomId, userId, isAdmin }) => {
        try {
          console.log(`${userId} kullanıcısı ${roomId} seminer odasına katıldı`);
          
          socket.join(roomId);
          
          if (!this.seminarRooms.has(roomId)) {
            this.seminarRooms.set(roomId, {
              id: roomId,
              participants: new Map(),
              messages: [],
              isStreaming: false,
              streamHost: null,
              createdAt: Date.now()
            });
          }
          
          const seminarRoom = this.seminarRooms.get(roomId);
          
          seminarRoom.participants.set(userId, {
            id: userId,
            socketId: socket.id,
            isAdmin,
            joinedAt: Date.now()
          });
          
          // Katılımcılara bildirim
          socket.to(roomId).emit('userJoinedSeminar', {
            userId,
            isAdmin,
            timestamp: Date.now()
          });
          
          // Mevcut katılımcıları gönder
          const participants = Array.from(seminarRoom.participants.values())
            .map(p => ({
              id: p.id,
              isAdmin: p.isAdmin
            }));
          
          socket.emit('seminarParticipants', {
            participants,
            messages: seminarRoom.messages,
            isStreaming: seminarRoom.isStreaming,
            streamHost: seminarRoom.streamHost
          });

        } catch (error) {
          console.error('Seminer odasına katılma hatası:', error);
          socket.emit('error', {
            message: 'Seminer odasına katılınamadı'
          });
        }
      });

      // Canlı yayın başlatma
      socket.on('startStreaming', async ({ roomId, userId, streamData }) => {
        try {
          const seminarRoom = this.seminarRooms.get(roomId);
          if (!seminarRoom) return;

          socket.join(`${roomId}-stream`);
          seminarRoom.isStreaming = true;
          seminarRoom.streamHost = userId;

          // Yayın durumunu güncelle
          await db.collection('seminars').doc(roomId).update({
            isStreaming: true,
            streamStartedAt: new Date(),
            streamHost: userId
          });

          this.io.to(roomId).emit('streamStarted', {
            userId,
            timestamp: Date.now()
          });

          console.log(`${userId} kullanıcısı ${roomId} odasında yayın başlattı`);
        } catch (error) {
          console.error('Yayın başlatma hatası:', error);
        }
      });

      // Canlı yayın verisi
      socket.on('streamData', ({ roomId, data }) => {
        socket.to(`${roomId}-stream`).emit('streamData', data);
      });

      // Canlı yayın durdurma
      socket.on('stopStreaming', async ({ roomId, userId }) => {
        try {
          const seminarRoom = this.seminarRooms.get(roomId);
          if (!seminarRoom) return;

          socket.leave(`${roomId}-stream`);
          seminarRoom.isStreaming = false;
          seminarRoom.streamHost = null;

          // Yayın durumunu güncelle
          await db.collection('seminars').doc(roomId).update({
            isStreaming: false,
            streamEndedAt: new Date()
          });

          this.io.to(roomId).emit('streamStopped', {
            userId,
            timestamp: Date.now()
          });

          console.log(`${userId} kullanıcısı ${roomId} odasında yayını durdurdu`);
        } catch (error) {
          console.error('Yayın durdurma hatası:', error);
        }
      });

      // Seminer mesajı gönderme
      socket.on('seminarMessage', ({ roomId, message, userId, userName }) => {
        console.log(`${userId} kullanıcısı ${roomId} odasına mesaj gönderdi`);
        
        if (this.seminarRooms.has(roomId)) {
          const seminarRoom = this.seminarRooms.get(roomId);
          
          const newMessage = {
            id: Date.now().toString(),
            senderId: userId,
            senderName: userName,
            text: message,
            timestamp: Date.now()
          };
          
          // Mesajı kaydet
          seminarRoom.messages.push(newMessage);
          
          // Mesajı odadaki herkese gönder
          this.io.to(roomId).emit('seminarMessage', newMessage);
          
          // Firebase'e kaydet
          try {
            db.collection('seminarMessages').add({
              seminarId: roomId,
              senderId: userId,
              senderName: userName,
              text: message,
              timestamp: new Date()
            });
          } catch (error) {
            console.error("Seminer mesajı veritabanına kaydedilemedi:", error);
          }
        }
      });

      // Seminer odasından ayrılma
      socket.on('leaveSeminarRoom', ({ roomId, userId }) => {
        try {
          console.log(`${userId} kullanıcısı ${roomId} seminer odasından ayrıldı`);
          
          socket.leave(roomId);
          
          if (this.seminarRooms.has(roomId)) {
            const seminarRoom = this.seminarRooms.get(roomId);
            seminarRoom.participants.delete(userId);
            
            socket.to(roomId).emit('userLeftSeminar', {
              userId,
              timestamp: Date.now()
            });
            
            if (seminarRoom.participants.size === 0) {
              this.seminarRooms.delete(roomId);
              console.log(`${roomId} seminer odası kapatıldı`);
            }
          }
        } catch (error) {
          console.error('Seminer odasından ayrılma hatası:', error);
        }
      });

      // Bağlantı koptuğunda
      socket.on('disconnect', () => {
        console.log(`Kullanıcı bağlantısı kesildi: ${userId}`);
        
        for (const [roomId, room] of this.seminarRooms.entries()) {
          if (room.participants.has(userId)) {
            room.participants.delete(userId);
            
            socket.to(roomId).emit('userLeftSeminar', {
              userId,
              timestamp: Date.now()
            });
            
            if (room.participants.size === 0) {
              this.seminarRooms.delete(roomId);
              console.log(`${roomId} seminer odası kapatıldı`);
            }
          }
        }
      });
    });
  }

  // Aktif seminerleri listele
  getActiveSeminars() {
    return Array.from(this.seminarRooms.values()).map(room => ({
      id: room.id,
      participantCount: room.participants.size,
      isStreaming: room.isStreaming,
      streamHost: room.streamHost,
      createdAt: room.createdAt
    }));
  }

  // Belirli bir seminere katılan kullanıcıları listele
  getSeminarParticipants(roomId) {
    const room = this.seminarRooms.get(roomId);
    if (!room) return [];

    return Array.from(room.participants.values()).map(p => ({
      id: p.id,
      isAdmin: p.isAdmin,
      joinedAt: p.joinedAt
    }));
  }
}

module.exports = SocketHandler;