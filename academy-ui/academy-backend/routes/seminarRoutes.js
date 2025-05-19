const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { v4: uuidv4 } = require('uuid');

// Create new seminar
router.post('/', async (req, res) => {
  const { title, description, scheduledFor } = req.body;
  const userId = req.user.uid; // User ID from authentication middleware
  
  try {
    // Get user information
    const userRef = await db.collection('users').doc(userId).get();
    const userData = userRef.data();
    
    // Create seminar ID
    const seminarId = uuidv4();
    
    // Create seminar data
    const seminarData = {
      id: seminarId,
      title,
      description,
      scheduledFor: new Date(scheduledFor),
      createdAt: new Date(),
      createdBy: userId,
      creatorName: userData.displayName || userData.email,
      status: 'scheduled', // scheduled, active, ended
      participants: [userId], // First participant is the creator
    };
    
    // Save seminar to database
    await db.collection('seminars').doc(seminarId).set(seminarData);
    
    res.status(201).json({
      id: seminarId,
      message: 'Seminer başarıyla oluşturuldu'
    });
  } catch (error) {
    console.error("Seminer oluşturulamadı:", error);
    res.status(500).send('Seminer oluşturulamadı');
  }
});

// Get all seminars
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('seminars')
      .orderBy('scheduledFor', 'desc')
      .get();
    
    const seminars = [];
    snapshot.forEach(doc => {
      seminars.push({
        id: doc.id,
        ...doc.data(),
        scheduledFor: doc.data().scheduledFor.toDate(),
        createdAt: doc.data().createdAt.toDate()
      });
    });
    
    res.status(200).json(seminars);
  } catch (error) {
    console.error("Seminerler getirilemedi:", error);
    res.status(500).send('Seminerler getirilemedi');
  }
});

// Get specific seminar
router.get('/:seminarId', async (req, res) => {
  const { seminarId } = req.params;
  
  try {
    const seminarRef = await db.collection('seminars').doc(seminarId).get();
    
    if (!seminarRef.exists) {
      return res.status(404).send('Seminer bulunamadı');
    }
    
    const seminarData = seminarRef.data();
    
    res.status(200).json({
      id: seminarRef.id,
      ...seminarData,
      scheduledFor: seminarData.scheduledFor.toDate(),
      createdAt: seminarData.createdAt.toDate(),
      endedAt: seminarData.endedAt ? seminarData.endedAt.toDate() : null
    });
  } catch (error) {
    console.error("Seminer getirilemedi:", error);
    res.status(500).send('Seminer getirilemedi');
  }
});

// Join seminar
router.post('/:seminarId/join', async (req, res) => {
  const { seminarId } = req.params;
  const userId = req.user.uid;
  
  try {
    const seminarRef = db.collection('seminars').doc(seminarId);
    const seminarDoc = await seminarRef.get();
    
    if (!seminarDoc.exists) {
      return res.status(404).send('Seminer bulunamadı');
    }
    
    const seminarData = seminarDoc.data();
    
    // Check if user is already a participant
    if (seminarData.participants.includes(userId)) {
      return res.status(200).json({ message: 'Zaten bu seminere katılmışsınız' });
    }
        
    // Add to participant list
    await seminarRef.update({
      participants: [...seminarData.participants, userId]
    });
    
    res.status(200).json({ message: 'Seminere başarıyla katıldınız' });
  } catch (error) {
    console.error("Seminere katılınamadı:", error);
    res.status(500).send('Seminere katılınamadı');
  }
});

// Start seminar (creator only)
router.post('/:seminarId/start', async (req, res) => {
  const { seminarId } = req.params;
  const userId = req.user.uid;
  
  try {
    const seminarRef = db.collection('seminars').doc(seminarId);
    const seminarDoc = await seminarRef.get();
    
    if (!seminarDoc.exists) {
      return res.status(404).send('Seminer bulunamadı');
    }
    
    const seminarData = seminarDoc.data();
    
    // Check if user is the creator
    if (seminarData.createdBy !== userId) {
      return res.status(403).send('Bu işlemi yapmaya yetkiniz yok');
    }
    
    // Update seminar status
    await seminarRef.update({
      status: 'active',
      startedAt: new Date()
    });
    
    res.status(200).json({ message: 'Seminer başarıyla başlatıldı' });
  } catch (error) {
    console.error("Seminer başlatılamadı:", error);
    res.status(500).send('Seminer başlatılamadı');
  }
});

// End seminar (creator only)
router.post('/:seminarId/end', async (req, res) => {
  const { seminarId } = req.params;
  const userId = req.user.uid;
  
  try {
    const seminarRef = db.collection('seminars').doc(seminarId);
    const seminarDoc = await seminarRef.get();
    
    if (!seminarDoc.exists) {
      return res.status(404).send('Seminer bulunamadı');
    }
    
    const seminarData = seminarDoc.data();
    
    // Check if user is the creator
    if (seminarData.createdBy !== userId) {
      return res.status(403).send('Bu işlemi yapmaya yetkiniz yok');
    }
    
    // Update seminar status
    await seminarRef.update({
      status: 'ended',
      endedAt: new Date()
    });
    
    res.status(200).json({ message: 'Seminer başarıyla sonlandırıldı' });
  } catch (error) {
    console.error("Seminer sonlandırılamadı:", error);
    res.status(500).send('Seminer sonlandırılamadı');
  }
});

// Get seminar participants
router.get('/:seminarId/participants', async (req, res) => {
  const { seminarId } = req.params;
  
  try {
    const seminarRef = await db.collection('seminars').doc(seminarId).get();
    
    if (!seminarRef.exists) {
      return res.status(404).send('Seminer bulunamadı');
    }
    
    const seminarData = seminarRef.data();
    const participantIds = seminarData.participants;
    
    // Get participant information
    const participants = [];
    for (const userId of participantIds) {
      const userRef = await db.collection('users').doc(userId).get();
      if (userRef.exists) {
        const userData = userRef.data();
        participants.push({
          id: userId,
          displayName: userData.displayName || userData.email,
          photoURL: userData.photoURL || null,
          isCreator: userId === seminarData.createdBy
        });
      }
    }
    
    res.status(200).json(participants);
  } catch (error) {
    console.error("Katılımcılar getirilemedi:", error);
    res.status(500).send('Katılımcılar getirilemedi');
  }
});

// Get seminar messages
router.get('/:seminarId/messages', async (req, res) => {
  const { seminarId } = req.params;
  
  try {
    const snapshot = await db.collection('seminarMessages')
      .where('seminarId', '==', seminarId)
      .orderBy('timestamp', 'asc')
      .get();
    
    const messages = [];
    snapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate()
      });
    });
    
    res.status(200).json(messages);
  } catch (error) {
    console.error("Seminer mesajları getirilemedi:", error);
    res.status(500).send('Seminer mesajları getirilemedi');
  }
});

// Send seminar message
router.post('/:seminarId/messages', async (req, res) => {
  const { seminarId } = req.params;
  const { text } = req.body;
  const userId = req.user.uid;
  
  try {
    // Get user information
    const userRef = await db.collection('users').doc(userId).get();
    const userData = userRef.data();
    const senderName = userData.displayName || userData.email;
    
    // Save message to database
    const messageRef = await db.collection('seminarMessages').add({
      seminarId,
      senderId: userId,
      senderName,
      text,
      timestamp: new Date()
    });
    
    res.status(201).json({
      id: messageRef.id,
      message: 'Mesaj başarıyla gönderildi'
    });
  } catch (error) {
    console.error("Mesaj gönderilemedi:", error);
    res.status(500).send('Mesaj gönderilemedi');
  }
});

module.exports = router;
