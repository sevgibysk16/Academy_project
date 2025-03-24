import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Navbar from './components/Navigation/Navbar';
import HomePage from './components/Home/HomePage';
import Footer from './components/Layout/Footer';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleLogin = (user) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const handleRegisterSuccess = (user) => {
    // Kayıt başarılı olduğunda kullanıcı bilgilerini sakla
    setCurrentUser(user);
    // Otomatik giriş yapmak isterseniz:
    // setIsLoggedIn(true);
  };

  return (
    <Router>
      <div className="app">
        {/* Navbar tam genişlikte olmalı */}
        <div className="full-width-container">
          <div className="content-container">
            <Navbar 
              isLoggedIn={isLoggedIn} 
              onLogout={handleLogout} 
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
                  <Login onLoginSuccess={handleLogin} />
                } 
              />
              <Route 
                path="/register" 
                element={
                  isLoggedIn ? 
                  <Navigate to="/" /> : 
                  <Register onRegisterSuccess={handleRegisterSuccess} />
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
    </Router>
  );
}

export default App;