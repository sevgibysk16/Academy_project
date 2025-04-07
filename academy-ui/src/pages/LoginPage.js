import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

const LoginPage = () => {
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Kayıt sayfasından yönlendirme mesajını kontrol et
    if (location.state && location.state.message) {
      setSuccessMessage(location.state.message);
      
      // Mesajı 5 saniye sonra kaldır
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location]);

  return (
    <div>
      {successMessage && (
        <div style={{
          backgroundColor: '#4CAF50',
          color: 'white',
          padding: '10px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          {successMessage}
        </div>
      )}
      <LoginForm />
    </div>
  );
};

export default LoginPage;
