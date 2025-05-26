const admin = require('firebase-admin');
require('dotenv').config();

// Firebase yapılandırma bilgilerini kontrol et
if (!process.env.FIREBASE_PRIVATE_KEY) {
  console.error('HATA: FIREBASE_PRIVATE_KEY çevre değişkeni bulunamadı!');
  process.exit(1);
}

// Private key'i düzgün formata dönüştür
const privateKey = process.env.FIREBASE_PRIVATE_KEY.includes('\\n')
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : process.env.FIREBASE_PRIVATE_KEY;

// Firebase Admin SDK'yı başlat
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  console.log('Firebase Admin SDK başarıyla başlatıldı');
} catch (error) {
  console.error('Firebase Admin SDK başlatma hatası:', error);
  process.exit(1);
}

const db = admin.firestore();

module.exports = {
  admin,
  db
}; 