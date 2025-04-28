import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';  // Firebase Authentication hook'u
import './AuthStyles.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();  // Firebase login fonksiyonunu kullanmak için
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Kullanıcı yazmaya başladığında ilgili hata mesajını temizle
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Email doğrulama
    if (!formData.email) {
      newErrors.email = 'Email adresi gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir email adresi giriniz';
    }
    
    // Şifre doğrulama
    if (!formData.password) {
      newErrors.password = 'Şifre gereklidir';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setLoading(true);
      setLoginError('');
      
      try {
        // Firebase login fonksiyonunu kullan
        const result = await login(formData.email, formData.password);
        
        if (result.success) {
          // Eğer "Beni hatırla" seçeneği işaretlenmişse, token'ı localStorage'da sakla
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          } else {
            localStorage.setItem('rememberMe', 'false');
          }
          
          navigate('/dashboard');  // Başarıyla giriş yapıldığında yönlendir
        } else {
          setLoginError(result.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        }
      } catch (error) {
        setLoginError('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
        console.error('Login error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Giriş Yap</h2>
        
        {loginError && <div className="error-message">{loginError}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email adresinizi giriniz"
              className={errors.email ? "invalid" : ""}
              required
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Şifrenizi giriniz"
                className={errors.password ? "invalid" : ""}
                required
              />
              <span 
                className="password-toggle"
                onClick={togglePasswordVisibility}
              >
              </span>
            </div>
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>
          
          <div className="remember-forgot">
            <div className="remember-me">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              <label htmlFor="rememberMe">Beni hatırla</label>
            </div>
            
            <div className="forgot-password">
              <Link to="/forgot-password">Şifremi unuttum</Link>
            </div>
          </div>
          
          <button 
            type="submit"
            className={`auth-button ${loading ? 'submitting' : ''}`}
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        
        <div className="auth-switch">
          Hesabınız yok mu? <Link to="/register">Kayıt Ol</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
