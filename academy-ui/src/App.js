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
import TranscriptsPage from './pages/TranscriptsPage';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import CreateBlogPost from './components/CreateBlogPost';
import ForgotPassword from './components/Auth/ForgotPassword';
import ResetPassword from './components/Auth/ResetPassword';
import BackButton from './components/BackButton';
import ProjectsPage from './pages/ProjectsPage';
import ProjectPage from './pages/ProjectPage';
import './styles/tezlistesi.css';
import './styles/tezdetay.css';
import './styles/yenitez.css';
import './styles/Blog.css';
import './styles/CreateBlogPost.css';

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

const BlogRoute = () => {
  return (
    <ProtectedRoute>
      <Blog />
    </ProtectedRoute>
  );
};

const BlogPostRoute = () => {
  return (
    <ProtectedRoute>
      <BlogPost />
    </ProtectedRoute>
  );
};

// Geri tuşunun görünürlüğünü kontrol eden bileşen
const BackButtonWrapper = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  
  // Ana sayfa ve giriş/kayıt sayfalarında geri tuşunu gösterme
  const hideBackButton = ['/', '/login', '/register'].includes(location.pathname);
  
  if (hideBackButton || !currentUser) {
    return null;
  }
  
  return <BackButton />;
};

function AppContent() {
  const { currentUser, loading, logout } = useAuth();
  const isLoggedIn = !!currentUser;
  const location = useLocation();
  
  const isAcademic = currentUser ?
    currentUser.role === 'academic' ||
    currentUser.userType === 'academic' ||
    currentUser.isAcademic === true : false;
  
  const hideFooterRoutes = ['/community', '/chat', '/tez/','/dashboard','/tezler','/edit-profile', '/seminar', '/transcripts', '/yeni-tez', '/blog','/login','/register', '/projects', '/project'];
  const shouldShowFooter = !hideFooterRoutes.some((route) => location.pathname.startsWith(route));
  
  return (
    <div className="app-container">
      <Navbar isLoggedIn={isLoggedIn} onLogout={logout} currentUser={currentUser} />
      <main className="main-content">
        <div className="content-container">
          <BackButtonWrapper />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <Login />} />
            <Route path="/register" element={isLoggedIn ? <Navigate to="/" /> : <Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/forgot-password" element={isLoggedIn ? <Navigate to="/" /> : <ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Blog rotaları */}
            <Route path="/blog/create" element={
              <AcademicRoute>
                <CreateBlogPost />
              </AcademicRoute>
            } />
            <Route path="/blog/:postId" element={<BlogPostRoute />} />
            <Route path="/blog" element={<BlogRoute />} />
            
            {/* Proje rotaları */}
            <Route path="/projects" element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            } />
            <Route path="/project/:id" element={
              <ProtectedRoute>
                <ProjectPage />
              </ProtectedRoute>
            } />
            
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
            
            {/* Transkript sayfası */}
            <Route path="/transcripts" element={
              <ProtectedRoute>
                <TranscriptsPage />
              </ProtectedRoute>
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
