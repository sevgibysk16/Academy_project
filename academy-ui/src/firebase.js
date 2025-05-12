// Firebase App (the core Firebase SDK) import
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Yeni Firebase yapılandırma bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyAt3gb6YqSt-H51b7gmMVkG03B5VvT2FpI",
  authDomain: "academy-ui-cab87.firebaseapp.com",
  projectId: "academy-ui-cab87",
  storageBucket: "academy-ui-cab87.firebasestorage.app",
  messagingSenderId: "53652387773",
  appId: "1:53652387773:web:84e3b89b5f3894175244d4",
  measurementId: "G-5EDPYL7JB2"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Kimlik doğrulama, Firestore ve Storage servislerini başlat
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Diğer bileşenlerde kullanmak için dışa aktar
export { auth, db, storage };
export default app;
