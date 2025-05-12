
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { collection, getDocs, getDoc, doc, addDoc, updateDoc, query, where, serverTimestamp, arrayUnion, arrayRemove } = require('firebase/firestore');
const { authenticateUser } = require('../middleware/auth');


// Tüm seminerleri getir
router.get('/api/seminars', async (req, res) => {
  try {
    const seminarsRef = collection(db, 'seminars');
    const snapshot = await getDocs(seminarsRef);
    
    const seminars = [];
    snapshot.forEach(doc => {
      seminars.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({ success: true, seminars });
  } catch (error) {
    console.error('Seminerler getirilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Seminerler getirilirken bir hata oluştu' });
  }
});


// Belirli bir semineri getir
router.get('/api/seminars/:id', async (req, res) => {
  try {
    const seminarId = req.params.id;
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    res.json({ 
      success: true, 
      seminar: {
        id: seminarDoc.id,
        ...seminarDoc.data()
      }
    });
  } catch (error) {
    console.error('Seminer getirilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Seminer getirilirken bir hata oluştu' });
  }
});


// Yeni bir seminer oluştur
router.post('/api/seminars', authenticateUser, async (req, res) => {
  try {
    const { title, description, presenter, startDate, endDate, isPublic, meetingLink } = req.body;
    
    if (!title || !description || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Gerekli alanları doldurun' });
    }
    
    // Önce semineri katılımcısız oluştur
    const seminarData = {
      title,
      description,
      presenter: presenter || '',
      startDate: new Date(startDate), // Tarih formatını düzelt
      endDate: new Date(endDate), // Tarih formatını düzelt
      createdAt: new Date(), // JavaScript Date nesnesi kullan
      creatorId: req.user.uid,
      creatorEmail: req.user.email,
      status: 'scheduled',
      isPublic: isPublic || true,
      meetingLink: meetingLink || '',
      maxParticipants: null,
      participants: [] // Boş dizi olarak başlat
    };
    
    const docRef = await addDoc(collection(db, 'seminars'), seminarData);
    
    // Katılımcı eklemek için ayrı bir işlem yapma - gerekirse daha sonra eklenebilir
    
    res.status(201).json({ 
      success: true, 
      message: 'Seminer başarıyla oluşturuldu',
      seminarId: docRef.id
    });
  } catch (error) {
    console.error('Seminer oluşturulurken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Seminer oluşturulurken bir hata oluştu' });
  }
});


// Seminere katıl
router.post('/api/seminars/:id/join', authenticateUser, async (req, res) => {
  try {
    const seminarId = req.params.id;
    const userId = req.user.uid;
    
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    const seminarData = seminarDoc.data();
    
    // Seminer iptal edilmiş mi kontrol et
    if (seminarData.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Bu seminer iptal edilmiştir' });
    }
    
    // Seminer tamamlanmış mı kontrol et
    if (seminarData.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Bu seminer tamamlanmıştır' });
    }
    
    // Maksimum katılımcı sayısı kontrolü
    if (seminarData.maxParticipants && seminarData.participants && seminarData.participants.length >= seminarData.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Seminer maksimum katılımcı sayısına ulaşmıştır' });
    }
    
    // Kullanıcı zaten katılımcı mı kontrol et
    if (seminarData.participants && seminarData.participants.includes(userId)) {
      return res.status(400).json({ success: false, message: 'Bu seminere zaten katılmışsınız' });
    }
    
    // Kullanıcıyı katılımcı olarak ekle
    await updateDoc(seminarRef, {
      participants: arrayUnion(userId)
    });
    
    res.json({ 
      success: true, 
      message: 'Seminere başarıyla katıldınız'
    });
  } catch (error) {
    console.error('Seminere katılırken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Seminere katılırken bir hata oluştu' });
  }
});


// Seminerden ayrıl
router.post('/api/seminars/:id/leave', authenticateUser, async (req, res) => {
  try {
    const seminarId = req.params.id;
    const userId = req.user.uid;
    
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    const seminarData = seminarDoc.data();
    
    // Kullanıcı semineri oluşturan kişi mi kontrol et
    if (seminarData.creatorId === userId) {
      return res.status(400).json({ success: false, message: 'Semineri oluşturan kişi olarak ayrılamazsınız' });
    }
    
    // Kullanıcı katılımcı mı kontrol et
    if (!seminarData.participants || !seminarData.participants.includes(userId)) {
      return res.status(400).json({ success: false, message: 'Bu seminere katılmamışsınız' });
    }
    
    // Kullanıcıyı katılımcılardan çıkar
    await updateDoc(seminarRef, {
      participants: arrayRemove(userId)
    });
    
    res.json({ 
      success: true, 
      message: 'Seminerden başarıyla ayrıldınız'
    });
  } catch (error) {
    console.error('Seminerden ayrılırken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Seminerden ayrılırken bir hata oluştu' });
  }
});


// Seminer durumunu güncelle
router.put('/api/seminars/:id/status', authenticateUser, async (req, res) => {
  try {
    const seminarId = req.params.id;
    const userId = req.user.uid;
    const { status } = req.body;
    
    if (!status || !['scheduled', 'active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Geçersiz durum değeri' });
    }
    
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    const seminarData = seminarDoc.data();
    
    // Sadece semineri oluşturan kişi durumu değiştirebilir
    if (seminarData.creatorId !== userId) {
      return res.status(403).json({ success: false, message: 'Sadece semineri oluşturan kişi durumu değiştirebilir' });
    }
    
    // Durumu güncelle
    await updateDoc(seminarRef, {
      status: status
    });
    
    res.json({ 
      success: true, 
      message: `Seminer durumu başarıyla "${status}" olarak güncellendi`
    });
  } catch (error) {
    console.error('Seminer durumu güncellenirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Seminer durumu güncellenirken bir hata oluştu' });
  }
});


// Gelecek seminerleri getir
router.get('/api/seminars/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const seminarsRef = collection(db, 'seminars');
    
    // Tarih ve saat karşılaştırması için daha karmaşık bir sorgu gerekebilir
    // Bu basit bir örnek, gerçek uygulamada tarih formatına göre düzenlenmelidir
    const q = query(seminarsRef, where('date', '>=', now.toISOString().split('T')[0]));
    const snapshot = await getDocs(q);
    
    const seminars = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Bugünkü seminerler için saat kontrolü
      if (data.date === now.toISOString().split('T')[0]) {
        // Eğer seminer saati geçmişse listeye ekleme
        if (data.time > now.toTimeString().split(' ')[0]) {
          seminars.push({
            id: doc.id,
            ...data
          });
        }
      } else {
        seminars.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    res.json({ success: true, seminars });
  } catch (error) {
    console.error('Gelecek seminerler getirilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Gelecek seminerler getirilirken bir hata oluştu' });
  }
});


// Geçmiş seminerleri getir
router.get('/api/seminars/past', async (req, res) => {
  try {
    const now = new Date();
    const seminarsRef = collection(db, 'seminars');
    
    // Tarih ve saat karşılaştırması için daha karmaşık bir sorgu gerekebilir
    // Bu basit bir örnek, gerçek uygulamada tarih formatına göre düzenlenmelidir
    const q = query(seminarsRef, where('status', '==', 'completed'));
    const snapshot = await getDocs(q);
    
    const seminars = [];
    snapshot.forEach(doc => {
      seminars.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({ success: true, seminars });
  } catch (error) {
    console.error('Geçmiş seminerler getirilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Geçmiş seminerler getirilirken bir hata oluştu' });
  }
});


// Kullanıcının kendi seminerlerini getir
router.get('/api/seminars/my-seminars', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const seminarsRef = collection(db, 'seminars');
    
    // Kullanıcının oluşturduğu seminerleri getir
    const q = query(seminarsRef, where('createdBy', '==', userId));
    const snapshot = await getDocs(q);
    
    const seminars = [];
    snapshot.forEach(doc => {
      seminars.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json({ success: true, seminars });
  } catch (error) {
    console.error('Kullanıcı seminerleri getirilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Kullanıcı seminerleri getirilirken bir hata oluştu' });
  }
});


// Kullanıcının katıldığı seminerleri getir
router.get('/api/seminars/joined', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const seminarsRef = collection(db, 'seminars');
    
    // Kullanıcının katıldığı seminerleri getir
    const q = query(seminarsRef, where('participants', 'array-contains', userId));
        const snapshot = await getDocs(q);
    
    const seminars = [];
    snapshot.forEach(doc => {
      // Kullanıcının oluşturduğu seminerleri hariç tut
      const data = doc.data();
      if (data.createdBy !== userId) {
        seminars.push({
          id: doc.id,
          ...data
        });
      }
    });
        
    res.json({ success: true, seminars });
  } catch (error) {
    console.error('Katılınan seminerler getirilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Katılınan seminerler getirilirken bir hata oluştu' });
  }
});


// Semineri başlat (yönetici için)
router.post('/api/seminars/:id/start', authenticateUser, async (req, res) => {
  try {
    const seminarId = req.params.id;
    const userId = req.user.uid;
    
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    const seminarData = seminarDoc.data();
    
    // Sadece semineri oluşturan kişi başlatabilir
    if (seminarData.createdBy !== userId) {
      return res.status(403).json({ success: false, message: 'Sadece semineri oluşturan kişi başlatabilir' });
    }
    
    // Seminer zaten aktif mi kontrol et
    if (seminarData.active) {
      return res.status(400).json({ success: false, message: 'Bu seminer zaten aktif durumda' });
    }
    
    // İşlemleri ayır - önce aktif durumunu güncelle
    await updateDoc(seminarRef, {
      active: true,
      status: 'active'
    });
    
    // Sonra zaman damgasını ekle
    await updateDoc(seminarRef, {
      startedAt: serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'Seminer başarıyla başlatıldı'
    });
  } catch (error) {
    console.error('Seminer başlatılırken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Seminer başlatılırken bir hata oluştu' });
  }
});


// Semineri sonlandır (yönetici için)
router.post('/api/seminars/:id/end', authenticateUser, async (req, res) => {
  try {
    const seminarId = req.params.id;
    const userId = req.user.uid;
    
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    const seminarData = seminarDoc.data();
    
    // Sadece semineri oluşturan kişi sonlandırabilir
    if (seminarData.createdBy !== userId) {
      return res.status(403).json({ success: false, message: 'Sadece semineri oluşturan kişi sonlandırabilir' });
    }
    
    // Seminer aktif mi kontrol et
    if (!seminarData.active) {
      return res.status(400).json({ success: false, message: 'Bu seminer aktif değil' });
    }
    
    // İşlemleri ayır - önce durumu güncelle
    await updateDoc(seminarRef, {
      active: false,
      status: 'completed'
    });
    
    // Sonra zaman damgasını ekle
    await updateDoc(seminarRef, {
      endedAt: serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'Seminer başarıyla sonlandırıldı'
    });
  } catch (error) {
    console.error('Seminer sonlandırılırken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Seminer sonlandırılırken bir hata oluştu' });
  }
});


// Semineri iptal et (yönetici için)
router.post('/api/seminars/:id/cancel', authenticateUser, async (req, res) => {
  try {
    const seminarId = req.params.id;
    const userId = req.user.uid;
    const { reason } = req.body;
    
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    const seminarData = seminarDoc.data();
    
    // Sadece semineri oluşturan kişi iptal edebilir
    if (seminarData.createdBy !== userId) {
      return res.status(403).json({ success: false, message: 'Sadece semineri oluşturan kişi iptal edebilir' });
    }
    
    // Seminer zaten tamamlanmış mı kontrol et
    if (seminarData.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Tamamlanmış bir seminer iptal edilemez' });
    }
    
    // İşlemleri ayır - önce durumu güncelle
    await updateDoc(seminarRef, {
      active: false,
      status: 'cancelled',
      cancellationReason: reason || 'Belirtilmedi'
    });
    
    // Sonra zaman damgasını ekle
    await updateDoc(seminarRef, {
      cancelledAt: serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'Seminer başarıyla iptal edildi'
    });
  } catch (error) {
    console.error('Seminer iptal edilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Seminer iptal edilirken bir hata oluştu' });
  }
});


// Seminer katılımcılarını getir
router.get('/api/seminars/:id/participants', authenticateUser, async (req, res) => {
  try {
    const seminarId = req.params.id;
    const userId = req.user.uid;
    
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    const seminarData = seminarDoc.data();
    
    // Kullanıcı seminere katılmış mı veya yönetici mi kontrol et
    if (seminarData.createdBy !== userId && (!seminarData.participants || !seminarData.participants.includes(userId))) {
      return res.status(403).json({ success: false, message: 'Bu seminerin katılımcılarını görüntüleme yetkiniz yok' });
    }
    
    // Katılımcı bilgilerini getir
    const participants = [];
    
    if (seminarData.participants && seminarData.participants.length > 0) {
      // Her katılımcı için kullanıcı bilgilerini getir
      for (const participantId of seminarData.participants) {
        const userRef = doc(db, 'users', participantId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          participants.push({
            id: participantId,
            displayName: userData.displayName || 'İsimsiz Kullanıcı',
            email: userData.email,
            photoURL: userData.photoURL || null,
            isAdmin: participantId === seminarData.createdBy
          });
        }
      }
    }
    
    res.json({ 
      success: true, 
      participants
    });
  } catch (error) {
    console.error('Katılımcılar getirilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Katılımcılar getirilirken bir hata oluştu' });
  }
});


// Seminer soruları/mesajlarını getir
router.get('/api/seminars/:id/questions', authenticateUser, async (req, res) => {
  try {
    const seminarId = req.params.id;
    const userId = req.user.uid;
    
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    const seminarData = seminarDoc.data();
    
    // Kullanıcı seminere katılmış mı veya yönetici mi kontrol et
    if (seminarData.createdBy !== userId && (!seminarData.participants || !seminarData.participants.includes(userId))) {
      return res.status(403).json({ success: false, message: 'Bu seminerin sorularını görüntüleme yetkiniz yok' });
    }
    
    // Seminer sorularını getir
    const questionsRef = collection(db, 'seminarQuestions');
    const q = query(questionsRef, where('seminarId', '==', seminarId));
    const snapshot = await getDocs(q);
    
    const questions = [];
    snapshot.forEach(doc => {
      questions.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : null
      });
    });
    
    // Soruları zamana göre sırala
    questions.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return a.timestamp - b.timestamp;
    });
    
    res.json({ 
      success: true, 
      questions
    });
  } catch (error) {
    console.error('Sorular getirilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Sorular getirilirken bir hata oluştu' });
  }
});


// Seminere soru/mesaj ekle
router.post('/api/seminars/:id/questions', authenticateUser, async (req, res) => {
  try {
    const seminarId = req.params.id;
    const userId = req.user.uid;
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Soru metni boş olamaz' });
    }
    
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    const seminarData = seminarDoc.data();
    
    // Kullanıcı seminere katılmış mı veya yönetici mi kontrol et
    if (seminarData.createdBy !== userId && (!seminarData.participants || !seminarData.participants.includes(userId))) {
      return res.status(403).json({ success: false, message: 'Bu seminere soru gönderme yetkiniz yok' });
    }
    
    // Seminer aktif mi kontrol et
    if (!seminarData.active) {
      return res.status(400).json({ success: false, message: 'Bu seminer şu anda aktif değil' });
    }
    
    // Kullanıcı bilgilerini al
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    let userName = 'İsimsiz Kullanıcı';
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      userName = userData.displayName || userData.email || 'İsimsiz Kullanıcı';
    }
    
    // Soruyu veritabanına ekle - timestamp olmadan
    const questionData = {
      seminarId,
      text,
      sender: userName,
      senderId: userId,
      isAdmin: userId === seminarData.createdBy,
      answered: false
    };
    
    const docRef = await addDoc(collection(db, 'seminarQuestions'), questionData);
    
    // Sonra timestamp ekle (ayrı işlem)
    await updateDoc(doc(db, 'seminarQuestions', docRef.id), {
      timestamp: serverTimestamp()
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Soru başarıyla gönderildi',
      questionId: docRef.id
    });
  } catch (error) {
    console.error('Soru gönderilirken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Soru gönderilirken bir hata oluştu' });
  }
});


// Soruyu yanıtla (yönetici için)
router.post('/api/seminars/:seminarId/questions/:questionId/answer', authenticateUser, async (req, res) => {
  try {
    const { seminarId, questionId } = req.params;
    const userId = req.user.uid;
    const { answer } = req.body;
    
    if (!answer || answer.trim() === '') {
      return res.status(400).json({ success: false, message: 'Yanıt metni boş olamaz' });
    }
    
    const seminarRef = doc(db, 'seminars', seminarId);
    const seminarDoc = await getDoc(seminarRef);
    
    if (!seminarDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Seminer bulunamadı' });
    }
    
    const seminarData = seminarDoc.data();
    
    // Sadece semineri oluşturan kişi yanıt verebilir
    if (seminarData.createdBy !== userId) {
            return res.status(403).json({ success: false, message: 'Sadece seminer yöneticisi yanıt verebilir' });
    }
    
    // Soruyu getir
    const questionRef = doc(db, 'seminarQuestions', questionId);
    const questionDoc = await getDoc(questionRef);
    
    if (!questionDoc.exists()) {
      return res.status(404).json({ success: false, message: 'Soru bulunamadı' });
    }
    
    // İşlemleri ayır - önce yanıtı ve yanıtlayan bilgisini ekle
    await updateDoc(questionRef, {
      answer,
      answeredBy: userId,
      answered: true
    });
    
    // Sonra zaman damgasını ekle
    await updateDoc(questionRef, {
      answeredAt: serverTimestamp()
    });
    
    res.json({ 
      success: true, 
      message: 'Soru başarıyla yanıtlandı'
    });
  } catch (error) {
    console.error('Soru yanıtlanırken hata oluştu:', error);
    res.status(500).json({ success: false, message: 'Soru yanıtlanırken bir hata oluştu' });
  }
});


module.exports = router;


