import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';  // src/firebase.js dosyasını import et

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase ile oturum dinleme
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Kullanıcı oturum açtıysa, Firestore'dan ek bilgileri al
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setCurrentUser({
              ...user,
              ...userDoc.data()
            });
          } else {
            setCurrentUser(user);
          }
        } catch (error) {
          console.error("Kullanıcı bilgileri alınırken hata:", error);
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    
    // Cleanup
    return () => unsubscribe();
  }, []);

  // Giriş fonksiyonu - userType parametresi eklendi
  const login = async (email, password, userType) => {
    try {
      // Firebase Authentication ile giriş yap
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Firestore'dan kullanıcı bilgilerini al
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      
      if (!userDoc.exists()) {
        await signOut(auth); // Kullanıcı bilgileri yoksa çıkış yaptır
        return { 
          success: false, 
          message: "Kullanıcı bilgileri bulunamadı." 
        };
      }
      
      const userData = userDoc.data();
      
      // Kullanıcı tipi kontrolü
      if (userType && userData.userType !== userType) {
        // Yanlış kullanıcı tipi ile giriş yapılmaya çalışılıyor
        await signOut(auth); // Kullanıcıyı çıkış yaptır
        return { 
          success: false, 
          message: `Bu hesap bir ${userType === 'student' ? 'öğrenci' : 'akademisyen'} hesabı değil. Lütfen doğru kullanıcı tipini seçin.` 
        };
      }
      
      return { success: true, userData };
    } catch (error) {
      let message = "Giriş sırasında bir hata oluştu.";
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = "Email veya şifre hatalı.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Geçersiz email adresi.";
      } else if (error.code === 'auth/user-disabled') {
        message = "Bu hesap devre dışı bırakılmış.";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.";
      }
      
      return {
        success: false,
        message: message
      };
    }
  };

  // Kayıt fonksiyonu - userType ve diğer alanlar eklendi
  const register = async (email, password, userData) => {
    try {
      // Firebase Authentication ile kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Kullanıcı bilgilerini Firestore'a kaydet
      await setDoc(doc(db, "users", userCredential.user.uid), {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: email,
        userType: userData.userType,
        studentId: userData.userType === 'student' ? userData.studentId : null,
        academicTitle: userData.userType === 'academic' ? userData.academicTitle : null,
        department: userData.department,
        institution: userData.institution,
        createdAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      let message = "Kayıt sırasında bir hata oluştu.";
      
      if (error.code === 'auth/email-already-in-use') {
        message = "Bu email adresi zaten kullanılıyor.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Geçersiz email adresi.";
      } else if (error.code === 'auth/weak-password') {
        message = "Şifre çok zayıf.";
      }
      
      return {
        success: false,
        message: message
      };
    }
  };

  // Şifre sıfırlama fonksiyonu
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      let message = "Şifre sıfırlama sırasında bir hata oluştu.";
      
      if (error.code === 'auth/user-not-found') {
        message = "Bu email adresiyle kayıtlı bir kullanıcı bulunamadı.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Geçersiz email adresi.";
      }
      
      return { success: false, message };
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
    loading,
    login,
    register,
    logout,
    resetPassword
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
