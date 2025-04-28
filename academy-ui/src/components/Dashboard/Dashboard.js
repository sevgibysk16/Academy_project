import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FaUser, FaCalendarAlt, FaEnvelope, FaChartLine, FaHistory } from 'react-icons/fa';
import { db } from '../../firebase'; // Firebase yapılandırmanızdan db'yi import edin
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLogins: 0,
    lastLogin: null,
    completedTasks: 0,
    pendingTasks: 0
  });
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
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

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Hoş Geldiniz, {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Kullanıcı'}</h2>
        <p className="last-login">Son giriş: {stats.lastLogin ? formatDate(stats.lastLogin) : 'İlk giriş'}</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card profile-card">
          <div className="card-header">
            <FaUser className="card-icon" />
            <h3>Profil Bilgileri</h3>
          </div>
          {currentUser ? (
            <div className="user-info">
              <p><FaEnvelope className="info-icon" /> <strong>Email:</strong> {currentUser.email}</p>
              <p><FaCalendarAlt className="info-icon" /> <strong>Katılma Tarihi:</strong> {formatDate(new Date(currentUser.metadata.creationTime))}</p>
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
