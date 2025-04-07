import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './ProtectedRoute.css';

const ProtectedRoute = ({ children, redirectPath = '/login' }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Kullanıcı durumu yükleniyorsa bekle
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!currentUser) {
    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    // state ile mevcut konumu da gönderiyoruz, böylece giriş sonrası kullanıcı kaldığı yerden devam edebilir
    return <Navigate to={redirectPath} state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;
