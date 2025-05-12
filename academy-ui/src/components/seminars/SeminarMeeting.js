import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSeminarById } from '../services/seminarService';
import { useSeminarContext } from '../../context/SeminarContext';
import VideoConference from './VideoConference';
import '../../styles/meeting.css';

const SeminarMeeting = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useSeminarContext();
  const [seminar, setSeminar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSeminar = async () => {
      try {
        setLoading(true);
        const data = await getSeminarById(id);
        setSeminar(data);
        
        if (!currentUser) {
          throw new Error('Toplantıya katılmak için giriş yapmalısınız.');
        }
        
        const isParticipant = data.participants?.some(p => p.email === currentUser.email);
        const isCreator = data.creatorEmail === currentUser.email;
        
        if (!isParticipant && !isCreator) {
          throw new Error('Bu toplantıya katılma izniniz yok.');
        }
        
        const now = new Date();
        const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
        const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);
        
        if (now < startDate && !isCreator) {
          throw new Error('Bu toplantı henüz başlamadı.');
        }
        
        if (now > endDate) {
          throw new Error('Bu toplantı sona erdi.');
        }
        
        if (data.status === 'cancelled') {
          throw new Error('Bu toplantı iptal edildi.');
        }
        
        setError(null);
      } catch (err) {
        setError(err.message || 'Toplantı bilgileri yüklenirken bir hata oluştu.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSeminar();
  }, [id, currentUser]);

  const handleLeaveRoom = () => {
    navigate(`/seminars/${id}`);
  };

  if (loading) {
    return <div className="loading-container">Toplantı yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => navigate(`/seminars/${id}`)}>
          Seminer Detaylarına Dön
        </button>
      </div>
    );
  }

  return (
    <div className="meeting-container">
      <div className="meeting-header">
        <h1>{seminar.title}</h1>
        <button className="leave-room-button" onClick={handleLeaveRoom}>
          Toplantıdan Ayrıl
        </button>
      </div>

      <div className="meeting-content">
        <VideoConference 
          seminarId={id} 
          currentUser={currentUser} 
        />
      </div>

      <div className="meeting-info">
        <h3>Toplantı Bilgileri</h3>
        <p><strong>Sunucu:</strong> {seminar.presenter}</p>
        <p><strong>Katılımcılar:</strong> {seminar.participants?.length || 0}</p>
        <p><strong>Başlangıç:</strong> {new Date(seminar.startDate).toLocaleString('tr-TR')}</p>
        <p><strong>Bitiş:</strong> {new Date(seminar.endDate).toLocaleString('tr-TR')}</p>
      </div>
    </div>
  );
};

export default SeminarMeeting;
