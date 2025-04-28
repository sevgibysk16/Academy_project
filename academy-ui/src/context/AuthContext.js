// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';  // src/firebase.js dosyasını import et

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase ile oturum dinleme
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    // Cleanup
    return () => unsubscribe();
  }, []);

  // Giriş fonksiyonu
  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  };

  // Kayıt fonksiyonu
  const register = async (email, password, userData) => {
    try {
      // Firebase Authentication ile kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Kullanıcı bilgilerini Firestore'a kaydet
      await setDoc(doc(db, "users", userCredential.user.uid), {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: email,
        createdAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  };

  // Çıkış fonksiyonu
  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.message 
      };
    }
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
