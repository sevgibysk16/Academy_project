import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';

const Register = ({ onRegisterSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

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

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Form doğrulama
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }
    
    if (!formData.email.includes('@')) {
      setError('Geçerli bir email adresi giriniz');
      return;
    }

    if (!agreeTerms) {
      setError('Devam etmek için kullanım şartlarını kabul etmelisiniz');
      return;
    }

    setLoading(true);
    
    try {
      // Simüle edilmiş kayıt işlemi
      setTimeout(() => {
        setLoading(false);
        
        // Başarılı kayıt simülasyonu
        const newUser = {
          id: Date.now().toString(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email
        };
        
        onRegisterSuccess(newUser);
        navigate('/login'); // Kayıt başarılı olduğunda giriş ekranına yönlendir
      }, 1000);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Kayıt sırasında bir hata oluştu');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Kayıt Ol</h2>
        {error && <div className="error-message">{error}</div>}
        
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">Ad</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Adınızı giriniz"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="lastName">Soyad</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Soyadınızı giriniz"
                required
              />
            </div>
          </div>
          
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
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Şifre Tekrar</label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Şifrenizi tekrar giriniz"
              required
            />
            <span 
              className="password-toggle" 
              onClick={toggleConfirmPasswordVisibility}
            >
              <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </span>
          </div>
          
          <div className="remember-me terms-checkbox">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreeTerms}
              onChange={() => setAgreeTerms(!agreeTerms)}
              required
            />
            <label htmlFor="agreeTerms">
              <a href="#terms" onClick={(e) => e.preventDefault()}>Kullanım şartlarını</a> ve <a href="#privacy" onClick={(e) => e.preventDefault()}>Gizlilik Politikasını</a> kabul ediyorum
            </label>
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
          </button>
        </form>
        
        <div className="auth-switch">
          Zaten hesabınız var mı? <button onClick={() => navigate('/login')}>Giriş Yap</button>
        </div>
      </div>
    </div>
  );
};

export default Register;
