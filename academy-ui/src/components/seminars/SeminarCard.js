import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/seminars.css';

const SeminarCard = ({ seminar }) => {
  // Convert Firestore timestamp to Date
  const startDate = seminar.startDate?.toDate ? 
    seminar.startDate.toDate() : 
    new Date(seminar.startDate);

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'scheduled': return 'status-scheduled';
      case 'live': return 'status-live';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  return (
    <div className="seminar-card">
      <div className={`seminar-status ${getStatusClass(seminar.status)}`}>
        {seminar.status === 'scheduled' && 'Planlandı'}
        {seminar.status === 'live' && 'Canlı'}
        {seminar.status === 'completed' && 'Tamamlandı'}
        {seminar.status === 'cancelled' && 'İptal Edildi'}
      </div>
      <h3 className="seminar-title">{seminar.title}</h3>
      <p className="seminar-presenter">Sunucu: {seminar.presenter}</p>
      <p className="seminar-date">Tarih: {formatDate(startDate)}</p>
      <p className="seminar-participants">
        Katılımcılar: {seminar.participants?.length || 0} / {seminar.maxParticipants || 'Sınırsız'}
      </p>
      <div className="seminar-description">{seminar.description?.substring(0, 100)}...</div>
      <Link to={`/seminars/${seminar.id}`} className="seminar-details-link">
        Detayları Görüntüle
      </Link>
    </div>
  );
};

export default SeminarCard;
