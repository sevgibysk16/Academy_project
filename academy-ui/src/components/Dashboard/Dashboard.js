import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FaUser,
  FaCalendarAlt,
  FaEnvelope,
  FaChartLine,
  FaHistory,
  FaGraduationCap,
  FaUniversity,
  FaIdCard,
  FaBookReader,
  FaChalkboardTeacher
} from 'react-icons/fa';
import { db } from '../../firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({
    totalLogins: 0,
    lastLogin: null,
    completedTasks: 0,
    pendingTasks: 0
  });
  const [activities, setActivities] = useState([]);

  // Profil düzenleme sayfasına yönlendirme fonksiyonu
  const handleEditProfile = () => {
    navigate('/edit-profile');
  };
  
  // Tüm aktiviteleri görüntüleme sayfasına yönlendirme fonksiyonu
  const handleViewAllActivities = () => {
    navigate('/activities');
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        // Kullanıcı profil bilgilerini getir
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setUserProfile(userSnap.data());
        }
        
        // Kullanıcı istatistiklerini getir
        const userStatsRef = doc(db, "userStats", currentUser.uid);
        const userStatsSnap = await getDoc(userStatsRef);
        
        if (userStatsSnap.exists()) {
          const userStatsData = userStatsSnap.data();
          setStats({
            totalLogins: userStatsData.totalLogins || 0,
            lastLogin: userStatsData.lastLogin ? new Date(userStatsData.lastLogin.toDate()) : null,
            completedTasks: userStatsData.completedTasks || 0,
            pendingTasks: userStatsData.pendingTasks || 0
          });
        }
        
        // Kullanıcı aktivitelerini getir
        const activitiesRef = collection(db, "activities");
        const activitiesQuery = query(
          activitiesRef,
          where("userId", "==", currentUser.uid),
          orderBy("timestamp", "desc"),
          limit(5)
        );
        
        const activitiesSnap = await getDocs(activitiesQuery);
        const activitiesData = [];
        
        activitiesSnap.forEach((doc) => {
          const data = doc.data();
          activitiesData.push({
            id: doc.id,
            type: data.type,
            date: new Date(data.timestamp.toDate()),
            description: data.description
          });
        });
        
        setActivities(activitiesData);
        setLoading(false);
      } catch (error) {
        console.error("Veri yüklenirken hata oluştu:", error);
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [currentUser]);

  const formatDate = (date) => {
    if (!date) return 'Bilinmiyor';
    return date.toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Profil bilgileri yükleniyor...</p>
      </div>
    );
  }

  // Kullanıcı tipine göre ikon ve başlık belirle
  const userTypeIcon = userProfile?.userType === 'student' ? 
    <FaGraduationCap className="user-type-icon" /> : 
    <FaChalkboardTeacher className="user-type-icon" />;
  
  const userTypeTitle = userProfile?.userType === 'student' ? 'Öğrenci' : 'Akademisyen';

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-left">
          <h2>Hoş Geldiniz, {userProfile?.firstName || currentUser?.email?.split('@')[0] || 'Kullanıcı'}</h2>
          <div className="user-type-badge">
            {userTypeIcon}
            <span>{userTypeTitle}</span>
          </div>
        </div>
        <p className="last-login">Son giriş: {stats.lastLogin ? formatDate(stats.lastLogin) : 'İlk giriş'}</p>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card profile-card">
          <div className="card-header">
            <FaUser className="card-icon" />
            <h3>Profil Bilgileri</h3>
          </div>
          
          {userProfile ? (
            <div className="user-info">
              <div className="user-info-row">
                <FaUser className="info-icon" /> 
                <div>
                  <strong>Ad Soyad:</strong> 
                  <span>{userProfile.firstName} {userProfile.lastName}</span>
                </div>
              </div>
              
              <div className="user-info-row">
                <FaEnvelope className="info-icon" /> 
                <div>
                  <strong>Email:</strong> 
                  <span>{currentUser.email}</span>
                </div>
              </div>
              
              <div className="user-info-row">
                <FaUniversity className="info-icon" /> 
                <div>
                  <strong>Kurum:</strong> 
                  <span>{userProfile.institution || 'Belirtilmemiş'}</span>
                </div>
              </div>
              
              <div className="user-info-row">
                <FaBookReader className="info-icon" /> 
                <div>
                  <strong>Bölüm:</strong> 
                  <span>{userProfile.department || 'Belirtilmemiş'}</span>
                </div>
              </div>
              
              {userProfile.userType === 'student' && (
                <div className="user-info-row">
                  <FaIdCard className="info-icon" /> 
                  <div>
                    <strong>Öğrenci Numarası:</strong> 
                    <span>{userProfile.studentId || 'Belirtilmemiş'}</span>
                  </div>
                </div>
              )}
              
              {userProfile.userType === 'academic' && (
                <div className="user-info-row">
                  <FaChalkboardTeacher className="info-icon" /> 
                  <div>
                    <strong>Akademik Unvan:</strong> 
                    <span>{userProfile.academicTitle || 'Belirtilmemiş'}</span>
                  </div>
                </div>
              )}
              
              <div className="user-info-row">
                <FaCalendarAlt className="info-icon" /> 
                <div>
                  <strong>Katılma Tarihi:</strong> 
                  <span>{formatDate(userProfile.createdAt?.toDate() || new Date(currentUser.metadata.creationTime))}</span>
                </div>
              </div>
              
              <button 
                className="edit-profile-btn"
                onClick={handleEditProfile}
              >
                Profili Düzenle
              </button>
            </div>
          ) : (
            <p>Kullanıcı verisi bulunamadı.</p>
          )}
        </div>
        
        <div className="dashboard-card stats-card">
          <div className="card-header">
            <FaChartLine className="card-icon" />
            <h3>İstatistikler</h3>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.totalLogins}</span>
              <span className="stat-label">Toplam Giriş</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.completedTasks}</span>
              <span className="stat-label">Tamamlanan Görev</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.pendingTasks}</span>
              <span className="stat-label">Bekleyen Görev</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{Math.floor((Date.now() - new Date(currentUser?.metadata.creationTime).getTime()) / (1000 * 60 * 60 * 24))}</span>
              <span className="stat-label">Üyelik Günü</span>
            </div>
          </div>
        </div>
        
        <div className="dashboard-card activities-card">
          <div className="card-header">
            <FaHistory className="card-icon" />
            <h3>Son Aktiviteler</h3>
          </div>
          {activities.length > 0 ? (
            <ul className="activity-list">
              {activities.map(activity => (
                <li key={activity.id} className={`activity-item activity-${activity.type}`}>
                  <span className="activity-date">{formatDate(activity.date)}</span>
                  <span className="activity-description">{activity.description}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-activity">Henüz aktivite kaydı bulunmamaktadır.</p>
          )}
          
          <button 
            className="view-all-btn"
            onClick={handleViewAllActivities}
          >
            Tüm Aktiviteleri Görüntüle
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
