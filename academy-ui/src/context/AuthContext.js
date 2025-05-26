import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  applyActionCode
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  collection,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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

    return () => unsubscribe();
  }, []);

  const login = async (email, password, userType) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

      if (!userDoc.exists()) {
        await signOut(auth);
        return { success: false, message: "Kullanıcı bilgileri bulunamadı." };
      }

      const userData = userDoc.data();

      if (userType && userData.userType !== userType) {
        await signOut(auth);
        return {
          success: false,
          message: `Bu hesap bir ${userType === 'student' ? 'öğrenci' : 'akademisyen'} hesabı değil. Lütfen doğru kullanıcı tipini seçin.`
        };
      }

      return { success: true, userData };
    } catch (error) {
      let message = "Giriş sırasında bir hata oluştu.";

      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          message = "Email veya şifre hatalı.";
          break;
        case 'auth/invalid-email':
          message = "Geçersiz email adresi.";
          break;
        case 'auth/user-disabled':
          message = "Bu hesap devre dışı bırakılmış.";
          break;
        case 'auth/too-many-requests':
          message = "Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.";
          break;
        default:
          message = error.message;
      }

      return { success: false, message };
    }
  };

  const register = async (email, password, userData) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      const userDocData = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email,
        userType: userData.userType,
        studentId: userData.userType === 'student' ? userData.studentId : null,
        academicTitle: userData.userType === 'academic' ? userData.academicTitle : null,
        department: userData.department,
        institution: userData.institution,
        createdAt: new Date(),
        isEmailVerified: false,
        lastLogin: null,
        status: 'active'
      };

      await setDoc(doc(db, "users", userCredential.user.uid), userDocData);

      return { success: true };
    } catch (error) {
      let message = "Kayıt sırasında bir hata oluştu.";

      switch (error.code) {
        case 'auth/email-already-in-use':
          message = "Bu email adresi zaten kullanılıyor.";
          break;
        case 'auth/invalid-email':
          message = "Geçersiz email adresi.";
          break;
        case 'auth/weak-password':
          message = "Şifre çok zayıf. En az 6 karakter kullanın.";
          break;
        default:
          message = error.message;
      }

      return { success: false, message };
    }
  };

  const resetPassword = {
    sendVerificationCode: async (email) => {
      try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          throw new Error("Bu email adresiyle kayıtlı bir kullanıcı bulunamadı.");
        }

        await sendPasswordResetEmail(auth, email, {
          url: `${window.location.origin}/reset-password`,
          handleCodeInApp: true
        });

        return { success: true };
      } catch (error) {
        let message = "Şifre sıfırlama kodu gönderilemedi.";

        switch (error.code) {
          case 'auth/invalid-email':
            message = "Geçersiz email adresi.";
            break;
          case 'auth/user-not-found':
            message = "Bu email adresiyle kayıtlı bir kullanıcı bulunamadı.";
            break;
          default:
            message = error.message;
        }

        throw new Error(message);
      }
    },

    verifyCode: async (code) => {
      try {
        await applyActionCode(auth, code);
        return true;
      } catch {
        throw new Error("Geçersiz veya süresi dolmuş doğrulama kodu.");
      }
    },

    updatePassword: async (code, newPassword) => {
      try {
        if (newPassword.length < 6) {
          throw new Error("Şifre en az 6 karakter olmalıdır.");
        }

        await confirmPasswordReset(auth, code, newPassword);

        const user = auth.currentUser;
        if (user) {
          await updateDoc(doc(db, "users", user.uid), {
            lastPasswordChange: new Date()
          });
        }

        return { success: true };
      } catch (error) {
        throw new Error("Şifre güncellenemedi: " + error.message);
      }
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          lastLogout: new Date()
        });
      }

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
