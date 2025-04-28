// src/services/authService.js
import { auth } from '../Config/firebaseConfig'; // Firebase auth importu
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Giriş işlemi (Firebase ile)
export const loginUser = async (credentials) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    const user = userCredential.user;

    // Başarılı giriş
    return {
      success: true,
      user: {
        id: user.uid,
        firstName: user.displayName || user.email.split('@')[0],  // Display Name mevcutsa kullan, yoksa email'den ad çek
        email: user.email,
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error.message || 'Giriş sırasında bir hata oluştu.'
    };
  }
};

// Kayıt işlemi (Firebase ile)
export const registerUser = async (userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const user = userCredential.user;

    // Kullanıcı bilgilerini güncelleme (isteğe bağlı, örneğin ismi ekleme)
    await user.updateProfile({
      displayName: `${userData.firstName} ${userData.lastName}`
    });

    return {
      success: true,
      user: {
        id: user.uid,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: user.email
      }
    };
  } catch (error) {
    console.error('Register error:', error);
    return {
      success: false,
      message: error.message || 'Kayıt sırasında bir hata oluştu.'
    };
  }
};

// Çıkış yapma
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return {
      success: true,
      message: 'Başarıyla çıkış yapıldı.'
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: error.message || 'Çıkış sırasında bir hata oluştu.'
    };
  }
};

// Mevcut kullanıcı bilgilerini alma
export const getCurrentUser = async () => {
  try {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          resolve({
            id: user.uid,
            firstName: user.displayName || user.email.split('@')[0],
            email: user.email,
          });
        } else {
          reject('No user is signed in');
        }
      });
    });
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// Kimlik doğrulama durumunu kontrol etme
export const isAuthenticated = () => {
  return auth.currentUser !== null;
};

// Tüm fonksiyonları içeren bir nesne olarak dışa aktar
const authService = {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  isAuthenticated
};

export default authService;
