import React, { createContext, useState, useEffect, useContext } from 'react';
import authService, { axiosInstance } from '../components/services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sayfa yüklendiğinde token kontrolü yap
    const checkUserLoggedIn = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // authService'den getCurrentUser fonksiyonunu kullan
          const userData = await authService.getCurrentUser();
          setCurrentUser(userData);
        } catch (error) {
          console.error('Auth check error:', error);
          localStorage.removeItem('token');
          setCurrentUser(null);
        }
      }
      
      setLoading(false);
    };
    
    checkUserLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      // authService'den loginUser fonksiyonunu kullan
      const formData = new FormData();
      formData.append('username', email); // Backend'de username olarak email kullanıyoruz
      formData.append('password', password);
      
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        
        // Kullanıcı bilgilerini al
        try {
          const userData = await authService.getCurrentUser();
          setCurrentUser(userData);
          return { success: true };
        } catch (userError) {
          console.error('Error fetching user data after login:', userError);
          return { 
            success: false, 
            message: 'Giriş başarılı ancak kullanıcı bilgileri alınamadı.' 
          };
        }
      } else {
        return { 
          success: false, 
          message: data.detail || 'Giriş başarısız. Kullanıcı adı veya şifre hatalı.' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axiosInstance.post('/users/', {
        username: userData.email,
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName
      });
      
      if (response.status === 201 || response.status === 200) {
        // Kayıt başarılı, otomatik giriş yapabilirsiniz
        return { success: true };
      } else {
        return {
          success: false,
          message: response.data?.detail || 'Kayıt başarısız'
        };
      }
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
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
