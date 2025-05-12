import { db } from './firebase';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  orderBy,
  query,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  where,
  Timestamp
} from 'firebase/firestore';

// Tüm seminerleri getir
export const getSeminars = async () => {
  try {
    const seminarsQuery = query(collection(db, 'seminars'), orderBy('startDate', 'desc'));
    const seminarsSnapshot = await getDocs(seminarsQuery);
    return seminarsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Seminerler getirilirken hata oluştu:", error);
    throw error;
  }
};

// Seminer detayını getir
export const getSeminarById = async (seminarId) => {
  try {
    const seminarDoc = await getDoc(doc(db, 'seminars', seminarId));
    if (!seminarDoc.exists()) {
      throw new Error('Seminer bulunamadı');
    }
    return {
      id: seminarDoc.id,
      ...seminarDoc.data()
    };
  } catch (error) {
    console.error("Seminer detayı getirilirken hata oluştu:", error);
    throw error;
  }
};

// Yeni seminer oluştur
export const createSeminar = async (seminarData) => {
  try {
    // Tarih alanlarını Firestore Timestamp'e dönüştür
    const startDate = seminarData.startDate instanceof Date 
      ? Timestamp.fromDate(seminarData.startDate)
      : Timestamp.fromDate(new Date(seminarData.startDate));
    
    const endDate = seminarData.endDate instanceof Date
      ? Timestamp.fromDate(seminarData.endDate)
      : Timestamp.fromDate(new Date(seminarData.endDate));

    const newSeminarRef = await addDoc(collection(db, 'seminars'), {
      ...seminarData,
      startDate,
      endDate,
      createdAt: serverTimestamp(),
      participants: [],
      status: 'scheduled'
    });
    
    // Yeni oluşturulan semineri getir
    const newSeminar = await getDoc(newSeminarRef);
    return {
      id: newSeminar.id,
      ...newSeminar.data()
    };
  } catch (error) {
    console.error("Seminer oluşturulurken hata oluştu:", error);
    throw error;
  }
};

// Seminere katıl
export const joinSeminar = async (seminarId, userData) => {
  try {
    const seminarRef = doc(db, 'seminars', seminarId);
    
    // Önce semineri kontrol et
    const seminarDoc = await getDoc(seminarRef);
    if (!seminarDoc.exists()) {
      throw new Error('Seminer bulunamadı');
    }
    
    const seminarData = seminarDoc.data();
    
    // Maksimum katılımcı sayısını kontrol et
    if (seminarData.participants && 
        seminarData.maxParticipants && 
        seminarData.participants.length >= seminarData.maxParticipants) {
      throw new Error('Seminer maksimum katılımcı sayısına ulaştı');
    }
    
    // Katılımcıyı seminerin participants alanına ekle
    await updateDoc(seminarRef, {
      participants: arrayUnion({
        ...userData,
        joinedAt: new Date().toISOString() // serverTimestamp() yerine normal tarih kullan
      })
    });
    
    return true;
  } catch (error) {
    console.error("Seminere katılırken hata oluştu:", error);
    throw error;
  }
};

// Seminerden ayrıl
export const leaveSeminar = async (seminarId, userEmail) => {
  try {
    const seminarRef = doc(db, 'seminars', seminarId);
    
    // Önce semineri ve katılımcıları al
    const seminarDoc = await getDoc(seminarRef);
    if (!seminarDoc.exists()) {
      throw new Error('Seminer bulunamadı');
    }
    
    const seminarData = seminarDoc.data();
    
        // Katılımcıyı filtrele
    const updatedParticipants = (seminarData.participants || [])
      .filter(participant => participant.email !== userEmail);
    
    // Katılımcı listesini güncelle
    await updateDoc(seminarRef, {
      participants: updatedParticipants
    });
    
    return true;
  } catch (error) {
    console.error("Seminerden ayrılırken hata oluştu:", error);
    throw error;
  }
};

// Seminer durumunu güncelle
export const updateSeminarStatus = async (seminarId, status) => {
  try {
    const seminarRef = doc(db, 'seminars', seminarId);
    await updateDoc(seminarRef, { status });
    return true;
  } catch (error) {
    console.error("Seminer durumu güncellenirken hata oluştu:", error);
    throw error;
  }
};

// Yaklaşan seminerleri getir
export const getUpcomingSeminars = async () => {
  try {
    const now = Timestamp.fromDate(new Date());
    const seminarsQuery = query(
      collection(db, 'seminars'),
      where('startDate', '>', now),
      orderBy('startDate', 'asc')
    );
    
    const seminarsSnapshot = await getDocs(seminarsQuery);
    return seminarsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Yaklaşan seminerler getirilirken hata oluştu:", error);
    throw error;
  }
};

// Geçmiş seminerleri getir
export const getPastSeminars = async () => {
  try {
    const now = Timestamp.fromDate(new Date());
    const seminarsQuery = query(
      collection(db, 'seminars'),
      where('startDate', '<', now),
      orderBy('startDate', 'desc')
    );
        
    const seminarsSnapshot = await getDocs(seminarsQuery);
    return seminarsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Geçmiş seminerler getirilirken hata oluştu:", error);
    throw error;
  }
};

