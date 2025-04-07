import React from 'react';
import Dashboard from '../components/Dashboard/Dashboard';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import './DashboardPage.css';

const DashboardPage = () => {
  const { isAuthenticated, loading } = useAuth();

  // Yükleme durumunda bir yükleme göstergesi göster
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <h1>Dashboard</h1>
        <p>Hesabınızı yönetin ve bilgilerinizi güncelleyin</p>
      </div>
      
      <Dashboard />
    </div>
  );
};

export default DashboardPage;
