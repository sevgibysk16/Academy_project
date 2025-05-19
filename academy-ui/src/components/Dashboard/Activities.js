import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { FaHistory, FaArrowLeft } from 'react-icons/fa';
import './Activities.css';

const Activities = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        const activitiesRef = collection(db, "activities");
        const activitiesQuery = query(
          activitiesRef,
          where("userId", "==", currentUser.uid),
          orderBy("timestamp", "desc")
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
        console.error("Aktiviteler yüklenirken hata oluştu:", error);
        setLoading(false);
      }
    };

    fetchActivities();
  }, [currentUser, navigate]);

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

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Aktiviteler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="activities-container">
      <div className="activities-header">
        <button className="back-button" onClick={handleBack}>
          <FaArrowLeft /> Geri
        </button>
        <h2><FaHistory /> Tüm Aktivitelerim</h2>
      </div>

      <div className="activities-content">
        {activities.length > 0 ? (
          <div className="activities-list">
            {activities.map(activity => (
              <div key={activity.id} className={`activity-item activity-${activity.type}`}>
                <div className="activity-header">
                  <span className="activity-date">{formatDate(activity.date)}</span>
                  <span className="activity-type">{activity.type}</span>
                </div>
                <div className="activity-body">
                  <p className="activity-description">{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-activities">
            <p>Henüz aktivite kaydı bulunmamaktadır.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Activities;
