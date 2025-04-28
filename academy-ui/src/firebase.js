// Firebase App (the core Firebase SDK) import
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase yapılandırma bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyCHMRO1a5vbUjJ37MQa3GnyFfI5X5f0XXk",
  authDomain: "academy-335be.firebaseapp.com",
  projectId: "academy-335be",
  storageBucket: "academy-335be.firebasestorage.app",
  messagingSenderId: "253039869385",
  appId: "1:253039869385:web:268761ae35198251eb3c18",
  measurementId: "G-2KT03P977K"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Kimlik doğrulama, Firestore ve Storage servislerini başlat
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Diğer bileşenlerde kullanmak için dışa aktar
export { auth, db, storage };
export default app;
