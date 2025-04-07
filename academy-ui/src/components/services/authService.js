import axios from 'axios';

// Mevcut kullanıcı verileri (geçici olarak tutulabilir, JWT entegrasyonu sonrası kaldırılabilir)
const users = [
  // Mevcut kullanıcılarınız
];

const API_URL = 'http://localhost:8000/api';

// Axios instance oluşturma
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - her istekte token ekler
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - token süresi dolduğunda kullanıcıyı çıkış yapar
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token geçersiz veya süresi dolmuş
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Eski giriş işlemi (simülasyon)
export const loginUserMock = async (credentials) => {
  // API çağrısını simüle etmek için bir gecikme ekliyoruz
  return new Promise((resolve) => {
    setTimeout(() => {
      const user = users.find(u => u.email === credentials.email);
      
      if (user && user.password === credentials.password) {
        // Başarılı giriş
        resolve({
          success: true,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          }
        });
      } else {
        // Başarısız giriş
        resolve({
          success: false,
          message: 'Email veya şifre hatalı'
        });
      }
    }, 1000); // 1 saniyelik gecikme
  });
};

// Eski kayıt işlemi (simülasyon)
export const registerUserMock = async (userData) => {
  // API çağrısını simüle etmek için bir gecikme ekliyoruz
  return new Promise((resolve) => {
    setTimeout(() => {
      // Email zaten kullanılıyor mu kontrol et
      const existingUser = users.find(u => u.email === userData.email);
      
      if (existingUser) {
        resolve({
          success: false,
          message: 'Bu email adresi zaten kullanılıyor'
        });
        return;
      }
      
      // Yeni kullanıcı oluştur
      const newUser = {
        id: Date.now().toString(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password
      };
      
      // Kullanıcıyı kaydet
      users.push(newUser);
      
      // Başarılı yanıt döndür
      resolve({
        success: true,
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email
        }
      });
    }, 1000); // 1 saniyelik gecikme
  });
};

// Yeni JWT tabanlı giriş işlemi
export const loginUser = async (credentials) => {
  try {
    const formData = new FormData();
    formData.append('username', credentials.email); // Backend'de username olarak email kullanıyoruz
    formData.append('password', credentials.password);
    
    const response = await axios.post(`${API_URL}/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      
      // Kullanıcı bilgilerini al
      const userData = await getCurrentUser();
      
      return {
        success: true,
        user: {
          id: userData.id,
          firstName: userData.first_name || userData.username.split('@')[0],
          lastName: userData.last_name || '',
          email: userData.email || userData.username
        }
      };
    }
    
    return {
      success: false,
      message: 'Giriş başarısız. Lütfen tekrar deneyin.'
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Giriş sırasında bir hata oluştu.'
    };
  }
};

// Yeni JWT tabanlı kayıt işlemi
export const registerUser = async (userData) => {
  try {
    const response = await axiosInstance.post('/users/', {
      username: userData.email,
      email: userData.email,
      password: userData.password,
      first_name: userData.firstName,
      last_name: userData.lastName
    });
    
    if (response.data) {
      // Kayıt başarılı, şimdi giriş yap
      return await loginUser({
        email: userData.email,
        password: userData.password
      });
    }
    
    return {
      success: false,
      message: 'Kayıt başarısız. Lütfen tekrar deneyin.'
    };
  } catch (error) {
    console.error('Register error:', error);
    return {
      success: false,
      message: error.response?.data?.detail || 'Kayıt sırasında bir hata oluştu.'
    };
  }
};

// Kullanıcı bilgilerini alma
export const getCurrentUser = async () => {
  try {
    const response = await axiosInstance.get('/users/me');
    return response.data;
  } catch (error) {
    console.error('Get current user error:', error);
    throw error;
  }
};

// Çıkış yapma
export const logoutUser = () => {
  localStorage.removeItem('token');
};

// Kimlik doğrulama durumunu kontrol etme
export const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

// Tüm fonksiyonları içeren bir nesne olarak dışa aktar
const authService = {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  isAuthenticated,
  axiosInstance
};

export default authService;
export { axiosInstance };
