import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import './styles/meeting.css';

import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Navbar from './components/Navigation/Navbar';
import HomePage from './components/Home/HomePage';
import Footer from './components/Layout/Footer';
import CommunityPage from './components/Community/CommunityPage';
import Dashboard from './components/Dashboard/Dashboard';
import ChatPage from './pages/ChatPage';

import { AuthProvider, useAuth } from './context/AuthContext';
import { SeminarProvider } from './context/SeminarContext';

// Yeni eklenen sayfalar
import SeminarsPage from './pages/SeminarsPage';
import CreateSeminarPage from './pages/CreateSeminarPage';
import SeminarDetailPage from './pages/SeminarDetailPage';
import SeminarMeetingPage from './pages/SeminarMeetingPage';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;

  return children;
};

function AppContent() {
  const { currentUser, loading, logout } = useAuth();
  const isLoggedIn = !!currentUser;
  const location = useLocation();

  const hideFooterRoutes = ['/community', '/chat', '/seminars'];
  const shouldShowFooter = !hideFooterRoutes.some((route) => location.pathname.startsWith(route));

  return (
    <div className="app-container">
      {/* Navbar */}
      <Navbar isLoggedIn={isLoggedIn} onLogout={logout} currentUser={currentUser} />

      {/* Sayfa İçeriği */}
      <main className="main-content">
        <div className="content-container">
          <Routes>
            {/* Genel Sayfalar */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={isLoggedIn ? <Navigate to="/" /> : <Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

            {/* Seminer Sayfaları */}
            <Route path="/seminars" element={<SeminarsPage />} />
            <Route path="/seminars/:id" element={<SeminarDetailPage />} />
            <Route
              path="/create-seminar"
              element={
                <ProtectedRoute>
                  <CreateSeminarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seminars/:id/meeting"
              element={
                <ProtectedRoute>
                  <SeminarMeetingPage />
                </ProtectedRoute>
              }
            />

            {/* Geçersiz rota */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>

      {/* Footer */}
      {shouldShowFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SeminarProvider>
        <Router>
          <AppContent />
        </Router>
      </SeminarProvider>
    </AuthProvider>
  );
}

export default App;
