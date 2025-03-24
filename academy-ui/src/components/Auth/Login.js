import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Email doğrulama
      if (!formData.email.includes('@')) {
        throw new Error('Geçerli bir email adresi giriniz');
      }

      // Şifre doğrulama
      if (formData.password.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır');
      }

      // Simüle edilmiş giriş işlemi
      setTimeout(() => {
        setLoading(false);
        // Başarılı giriş simülasyonu
        if (formData.email === "test@example.com" && formData.password === "123456") {
          const user = {
            id: "1",
            firstName: "Test",
            lastName: "Kullanıcı",
            email: formData.email
          };
          onLoginSuccess(user);
        } else {
          setError('Email veya şifre hatalı');
        }
      }, 1000);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Giriş sırasında bir hata oluştu');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Giriş Yap</h2>
        {error && <div className="error-message">{error}</div>}
        
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
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Şifrenizi giriniz"
              required
            />
            <span 
              className="password-toggle" 
              onClick={togglePasswordVisibility}
            >
              <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </span>
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
              <a href="#forgot">Şifremi unuttum</a>
            </div>
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        
        <div className="auth-switch">
          Hesabınız yok mu? <button onClick={() => navigate('/register')}>Kayıt Ol</button>
        </div>
      </div>
    </div>
  );
};

export default Login;
