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
    confirmPassword: '',
    userType: 'student', // Varsayılan olarak öğrenci seçili
    studentId: '',       // Öğrenci numarası (sadece öğrenciler için)
    academicTitle: '',   // Akademik unvan (sadece akademisyenler için)
    department: '',      // Bölüm bilgisi (her iki kullanıcı tipi için)
    institution: ''      // Kurum bilgisi (her iki kullanıcı tipi için)
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
    
    // Kullanıcı tipi doğrulama
    if (!formData.userType) {
      newErrors.userType = 'Kullanıcı tipi seçmelisiniz';
    }
    
    // Öğrenci numarası doğrulama (sadece öğrenciler için)
    if (formData.userType === 'student' && !formData.studentId) {
      newErrors.studentId = 'Öğrenci numarası gereklidir';
    }
    
    // Akademik unvan doğrulama (sadece akademisyenler için)
    if (formData.userType === 'academic' && !formData.academicTitle) {
      newErrors.academicTitle = 'Akademik unvan gereklidir';
    }
    
    // Bölüm doğrulama
    if (!formData.department) {
      newErrors.department = 'Bölüm bilgisi gereklidir';
    }
    
    // Kurum doğrulama
    if (!formData.institution) {
      newErrors.institution = 'Kurum bilgisi gereklidir';
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
        // Firebase Authentication register fonksiyonunu kullan
        const result = await register(formData.email, formData.password, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          userType: formData.userType,
          studentId: formData.userType === 'student' ? formData.studentId : null,
          academicTitle: formData.userType === 'academic' ? formData.academicTitle : null,
          department: formData.department,
          institution: formData.institution
        });
        
        if (result.success) {
          navigate('/login', { 
            state: { 
              message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.',
              userType: formData.userType 
            } 
          });
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
          <div className="form-group user-type-selection">
            <label>Kullanıcı Tipi</label>
            <div className="radio-group">
              <div className="radio-option">
                <input
                  type="radio"
                  id="student"
                  name="userType"
                  value="student"
                  checked={formData.userType === 'student'}
                  onChange={handleChange}
                />
                <label htmlFor="student">Öğrenci</label>
              </div>
              <div className="radio-option">
                <input
                  type="radio"
                  id="academic"
                  name="userType"
                  value="academic"
                  checked={formData.userType === 'academic'}
                  onChange={handleChange}
                />
                <label htmlFor="academic">Akademisyen</label>
              </div>
                          </div>
            {errors.userType && <div className="field-error">{errors.userType}</div>}
          </div>
          
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
                required
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
                required
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
              required
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>
          
          {/* Öğrenci numarası (sadece öğrenciler için) */}
          {formData.userType === 'student' && (
            <div className="form-group">
              <label htmlFor="studentId">Öğrenci Numarası</label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="Öğrenci numaranızı giriniz"
                className={errors.studentId ? "invalid" : ""}
                required
              />
              {errors.studentId && <div className="field-error">{errors.studentId}</div>}
            </div>
          )}
          
          {/* Akademik unvan (sadece akademisyenler için) */}
          {formData.userType === 'academic' && (
            <div className="form-group">
              <label htmlFor="academicTitle">Akademik Unvan</label>
              <select
                id="academicTitle"
                name="academicTitle"
                value={formData.academicTitle}
                onChange={handleChange}
                className={errors.academicTitle ? "invalid" : ""}
                required
              >
                <option value="">Unvan seçiniz</option>
                <option value="Prof. Dr.">Prof. Dr.</option>
                <option value="Doç. Dr.">Doç. Dr.</option>
                <option value="Dr. Öğr. Üyesi">Dr. Öğr. Üyesi</option>
                <option value="Öğr. Gör.">Öğr. Gör.</option>
                <option value="Arş. Gör.">Arş. Gör.</option>
                <option value="Diğer">Diğer</option>
              </select>
              {errors.academicTitle && <div className="field-error">{errors.academicTitle}</div>}
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="department">Bölüm</label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Bölümünüzü giriniz"
                className={errors.department ? "invalid" : ""}
                required
              />
              {errors.department && <div className="field-error">{errors.department}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="institution">Kurum</label>
              <input
                type="text"
                id="institution"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                placeholder="Kurumunuzu giriniz"
                className={errors.institution ? "invalid" : ""}
                required
              />
              {errors.institution && <div className="field-error">{errors.institution}</div>}
            </div>
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
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Şifre Tekrar</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Şifrenizi tekrar giriniz"
                className={errors.confirmPassword ? "invalid" : ""}
                required
              />
              <span 
                className="password-toggle"
                onClick={toggleConfirmPasswordVisibility}
              >
               
              </span>
            </div>
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
              <Link to="/terms" onClick={(e) => e.stopPropagation()}>Kullanım şartlarını</Link> ve <Link to="/privacy" onClick={(e) => e.stopPropagation()}>Gizlilik Politikasını</Link> kabul ediyorum
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

            
