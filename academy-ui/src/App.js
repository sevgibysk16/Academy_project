import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Navbar from './components/Navigation/Navbar';
import HomePage from './components/Home/HomePage';
import Footer from './components/Layout/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';
import CommunityPage from './components/Community/CommunityPage';
import Dashboard from './components/Dashboard/Dashboard'; // Burayı ekledim ✅
import ChatPage from './pages/ChatPage'; // Sohbet sayfasını buraya ekledim ✅

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppContent() {
  const { currentUser, loading, logout } = useAuth();
  const isLoggedIn = !!currentUser;
  const location = useLocation();

  // Footer'ı gizlemek istediğin route'lar
  const hideFooterRoutes = ['/community', '/chat']; // Sohbet sayfası da footer'dan çıkarıldı ✅
  const shouldShowFooter = !hideFooterRoutes.includes(location.pathname);

  return (
    <div className="app">
      <div className="full-width-container">
        <div className="content-container">
          <Navbar 
            isLoggedIn={isLoggedIn}
            onLogout={logout}
            currentUser={currentUser}
          />
        </div>
      </div>

      <main className="main-content">
        <div className="content-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/login"
              element={isLoggedIn ? <Navigate to="/" /> : <Login />}
            />
            <Route
              path="/register"
              element={isLoggedIn ? <Navigate to="/" /> : <Register />}
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard /> {/* Gerçek Dashboard sayfası burada açılıyor ✅ */}
                </ProtectedRoute>
              }
            />
            <Route
              path="/community"
              element={
                <ProtectedRoute>
                  <CommunityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage /> {/* Sohbet sayfası burada açılıyor ✅ */}
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </main>

      {shouldShowFooter && (
        <div className="full-width-container">
          <div className="content-container">
            <Footer />
          </div>
        </div>
      )}
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
