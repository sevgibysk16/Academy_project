import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Navbar from './components/Navigation/Navbar';
import HomePage from './components/Home/HomePage';
import Footer from './components/Layout/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';

// Korumalı Route bileşeni
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    // Yükleniyor durumu gösterilebilir
    return <div className="loading">Yükleniyor...</div>;
  }
  
  if (!currentUser) {
    // Kullanıcı giriş yapmamışsa login sayfasına yönlendir
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppContent() {
  const { currentUser, loading, logout } = useAuth();
  const isLoggedIn = !!currentUser;

  return (
    <div className="app">
      {/* Navbar tam genişlikte olmalı */}
      <div className="full-width-container">
        <div className="content-container">
          <Navbar 
            isLoggedIn={isLoggedIn}
            onLogout={logout}
            currentUser={currentUser}
          />
        </div>
      </div>
      
      {/* Ana içerik sabit genişlikte ve ortalanmış olmalı */}
      <main className="main-content">
        <div className="content-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/login"
              element={
                isLoggedIn ?
                <Navigate to="/" /> :
                <Login />
              }
            />
            <Route
              path="/register"
              element={
                isLoggedIn ?
                <Navigate to="/" /> :
                <Register />
              }
            />
            
            {/* Korumalı rotalar için örnek */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Dashboard Sayfası</div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <div>Profil Sayfası</div>
                </ProtectedRoute>
              }
            />
            
            {/* Diğer sayfalar için route'lar ekleyebilirsiniz */}
          </Routes>
        </div>
      </main>
      
      {/* Footer tam genişlikte olmalı */}
      <div className="full-width-container">
        <div className="content-container">
          <Footer />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
