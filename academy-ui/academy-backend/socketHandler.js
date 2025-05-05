const { db } = require('./firebase');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Yeni bir kullanıcı bağlandı:', socket.id);

    // Kullanıcı odaya katılıyor
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log(`${socket.id} odasına katıldı: ${roomId}`);
    });

    // Mesaj gönderildiğinde tetiklenir
    socket.on('sendMessage', async (data) => {
      const { roomId, senderId, message, timestamp } = data;

      try {
        // Mesaj verisi
        const messageData = {
          roomId,
          senderId,
          message,
          timestamp: timestamp || new Date().toISOString(),
          status: 'sent', // Başlangıçta 'sent' durumu
        };

        // Firestore'a mesajı kaydet
        const messageRef = await db.collection('messages').add(messageData);

        // Mesajın Firestore'daki kimliğini al
        const messageId = messageRef.id;

        // Mesajın kimliğini veritabanında güncelle
        await db.collection('messages').doc(messageId).update({
          id: messageId, // Mesaj kimliği ekleniyor
        });

        // Aynı odaya mesajı yayınla
        io.to(roomId).emit('receiveMessage', {
          ...messageData,
          messageId, // Mesaj kimliği istemciye gönderiliyor
        });

        console.log(`Mesaj yayınlandı ve kaydedildi: ${message}`);
      } catch (err) {
        console.error('Mesaj kaydedilirken hata:', err);
        socket.emit('messageError', 'Mesaj kaydedilemedi. Lütfen tekrar deneyin.');
      }
    });

    // Kullanıcı yazma durumu
    socket.on('userTyping', (data) => {
      const { roomId, senderId, isTyping } = data;

      // Diğer kullanıcılara yazma durumu bildirilir
      socket.to(roomId).emit('userTyping', { senderId, isTyping });
    });

    // Kullanıcı bağlantıyı kopardı
    socket.on('disconnect', () => {
      console.log('Kullanıcı bağlantıyı kopardı:', socket.id);
    });
  });
};
