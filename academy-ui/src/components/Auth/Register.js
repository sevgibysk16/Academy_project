import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AuthStyles.css';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

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

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Ad doğrulama
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad gereklidir';
    }
    
    // Soyad doğrulama
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad gereklidir';
    }
    
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
    
    // Şifre tekrar doğrulama
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifre tekrarı gereklidir';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Şifreler eşleşmiyor';
    }
    
    // Kullanım şartları doğrulama
    if (!agreeTerms) {
      newErrors.agreeTerms = 'Devam etmek için kullanım şartlarını kabul etmelisiniz';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setLoading(true);
      setRegisterError('');
      
      try {
        // AuthContext'teki register fonksiyonunu kullan
        const result = await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password
        });
        
        if (result.success) {
          navigate('/login', { state: { message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' } });
        } else {
          setRegisterError(result.message || 'Kayıt sırasında bir hata oluştu.');
        }
      } catch (error) {
        setRegisterError('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
        console.error('Register error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Kayıt Ol</h2>
        
        {registerError && <div className="error-message">{registerError}</div>}
        
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
                className={errors.firstName ? "invalid" : ""}
              />
              {errors.firstName && <div className="field-error">{errors.firstName}</div>}
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
                className={errors.lastName ? "invalid" : ""}
              />
              {errors.lastName && <div className="field-error">{errors.lastName}</div>}
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
              className={errors.email ? "invalid" : ""}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
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
              className={errors.password ? "invalid" : ""}
            />
            <span 
              className="password-toggle"
              onClick={togglePasswordVisibility}
            >
              {/* Göz ikonu */}
            </span>
            {errors.password && <div className="field-error">{errors.password}</div>}
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
              className={errors.confirmPassword ? "invalid" : ""}
            />
            <span 
              className="password-toggle"
              onClick={toggleConfirmPasswordVisibility}
            >
              {/* Göz ikonu */}
            </span>
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
          </div>
          
          <div className="remember-me terms-checkbox">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreeTerms}
              onChange={() => setAgreeTerms(!agreeTerms)}
              className={errors.agreeTerms ? "invalid" : ""}
            />
            <label htmlFor="agreeTerms">
              <Link to="/terms" onClick={(e) => e.preventDefault()}>Kullanım şartlarını</Link> ve <Link to="/privacy" onClick={(e) => e.preventDefault()}>Gizlilik Politikasını</Link> kabul ediyorum
            </label>
            {errors.agreeTerms && <div className="field-error">{errors.agreeTerms}</div>}
          </div>
          
          <button 
            type="submit"
            className={`auth-button ${loading ? 'submitting' : ''}`}
            disabled={loading}
          >
            {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
          </button>
        </form>
        
        <div className="auth-switch">
          Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
