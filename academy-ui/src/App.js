import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Navbar from './components/Navigation/Navbar';
import HomePage from './components/Home/HomePage';
import Footer from './components/Layout/Footer';
import CommunityPage from './components/Community/CommunityPage';
import Dashboard from './components/Dashboard/Dashboard';
import EditProfile from './components/Dashboard/EditProfile';
import Activities from './components/Dashboard/Activities';
import ChatPage from './pages/ChatPage';
import SeminarPage from './pages/SeminarPage';
import SeminarControls from './components/SeminarControls';
import { AuthProvider, useAuth } from './context/AuthContext';
import TezListesi from './components/tez/TezListesi';
import TezDetay from './components/tez/TezDetay';
import YeniTez from './components/tez/YeniTez';
import './styles/tezlistesi.css';
import './styles/tezdetay.css';
import './styles/yenitez.css';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
};

const AcademicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  
  const isAcademic = 
    currentUser.role === 'academic' ||
    currentUser.userType === 'academic' ||
    currentUser.isAcademic === true;
  
  if (!isAcademic) return <Navigate to="/dashboard" replace />;
  
  return children;
};

function AppContent() {
  const { currentUser, loading, logout } = useAuth();
  const isLoggedIn = !!currentUser;
  const location = useLocation();
  
  const isAcademic = currentUser ?
    currentUser.role === 'academic' ||
    currentUser.userType === 'academic' ||
    currentUser.isAcademic === true : false;
  
  const hideFooterRoutes = ['/community', '/chat', '/tez/','/dashboard','/tezler','/edit-profile', '/seminar'];
  const shouldShowFooter = !hideFooterRoutes.some((route) => location.pathname.startsWith(route));
  
  return (
    <div className="app-container">
      <Navbar isLoggedIn={isLoggedIn} onLogout={logout} currentUser={currentUser} />
      <main className="main-content">
        <div className="content-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={isLoggedIn ? <Navigate to="/" /> : <Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            
            {/* Seminar rotaları */}
            <Route 
              path="/seminar"
              element={
                <ProtectedRoute>
                  <SeminarControls 
                    isAdmin={isAcademic}
                    initialTab={isAcademic ? "create" : "join"}
                  />
                </ProtectedRoute>
              }
            />
            
            <Route 
              path="/seminar/create"
              element={
                <AcademicRoute>
                  <SeminarControls
                    isAdmin={true}
                    initialTab="create"
                    onCreateSeminar={(seminarData) => {
                      console.log('Seminer oluşturuluyor:', seminarData);
                    }}
                    onJoinSeminar={(seminarId) => {
                      console.log('Seminere katılınıyor:', seminarId);
                    }}
                  />
                </AcademicRoute>
              }
            />
            
            <Route 
              path="/seminar/:id"
              element={
                <ProtectedRoute>
                  <SeminarPage />
                </ProtectedRoute>
              }
            />
            
            {/* Tez modülü route'ları */}
            <Route path="/tezler" element={<TezListesi />} />
            <Route path="/tez/:tezId" element={<TezDetay />} />
            <Route path="/yeni-tez" element={
              <AcademicRoute>
                <YeniTez />
              </AcademicRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
      {shouldShowFooter && <Footer />}
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
