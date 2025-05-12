// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

// Auth ve Firestore servislerini al
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
