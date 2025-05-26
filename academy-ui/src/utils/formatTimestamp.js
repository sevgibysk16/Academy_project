// Firestore timestamp'lerini formatlamak için yardımcı fonksiyon
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Belirtilmedi';
  
  // Firestore timestamp'i JavaScript Date'e çevir
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  
  // Tarih ve saat formatı
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return date.toLocaleDateString('tr-TR', options);
};
