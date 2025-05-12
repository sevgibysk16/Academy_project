import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSeminarById, updateSeminarStatus, joinSeminar, leaveSeminar } from '../services/seminarService';
import { useSeminarContext } from '../../context/SeminarContext';
import '../../styles/seminars.css';

const SeminarDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useSeminarContext();
  const [seminar, setSeminar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState(null);

  const fetchSeminar = async () => {
    try {
      setLoading(true);
      const data = await getSeminarById(id);
      setSeminar(data);
      setError(null);
    } catch (err) {
      setError('Seminer detayları yüklenirken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeminar();
  }, [id]);

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  // Kullanıcı semineri oluşturan kişi mi kontrol et
  const isCreator = currentUser && seminar && currentUser.email === seminar.creatorEmail;
  
  // Kullanıcı zaten katılımcı mı kontrol et
  const isParticipant = seminar?.participants?.some(
    p => (p.email === currentUser?.email) || (p.uid === currentUser?.uid)
  );
  
  // Seminer dolu mu kontrol et
  const isFull = seminar?.maxParticipants &&
    seminar.participants?.length >= seminar.maxParticipants;
  
  // Seminer geçmiş tarihli mi kontrol et
  const now = new Date();
  const startDate = seminar?.startDate?.toDate ? seminar.startDate.toDate() : new Date(seminar?.startDate);
  const endDate = seminar?.endDate?.toDate ? seminar.endDate.toDate() : new Date(seminar?.endDate);
  const isLive = now >= startDate && now <= endDate;
  const isPast = now > endDate;
  const isFuture = now < startDate;

  const handleStatusChange = async (newStatus) => {
    try {
      await updateSeminarStatus(id, newStatus);
      fetchSeminar();
    } catch (err) {
      console.error('Seminer durumu güncellenirken hata oluştu:', err);
    }
  };

  const handleJoinMeeting = () => {
    navigate(`/seminars/${id}/meeting`);
  };

  const handleJoin = async () => {
    if (!currentUser) {
      setJoinError('Seminere katılmak için giriş yapmalısınız.');
      return;
    }
    
    try {
      setJoinLoading(true);
      setJoinError(null);
      
      const userData = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || 'İsimsiz Kullanıcı'
      };
      
      await joinSeminar(seminar.id, userData);
      await fetchSeminar();
      
      // Kullanıcı başarıyla katıldıktan sonra seminer ekranına yönlendir
      if (seminar.status === 'live') {
        navigate(`/seminars/${id}/meeting`);
      } else {
        // Eğer seminer henüz canlı değilse, kullanıcıya bilgi mesajı göster
        setJoinError('Seminere başarıyla katıldınız. Seminer başladığında izleyebileceksiniz.');
      }
    } catch (err) {
      setJoinError(err.message || 'Seminere katılırken bir hata oluştu.');
      console.error(err);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!currentUser) return;
    
    try {
      setJoinLoading(true);
      setJoinError(null);
      
      await leaveSeminar(seminar.id, currentUser.email);
      fetchSeminar();
    } catch (err) {
      setJoinError(err.message || 'Seminerden ayrılırken bir hata oluştu.');
      console.error(err);
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container">Seminer detayları yükleniyor...</div>;
  }

  if (error || !seminar) {
    return <div className="error-container">{error || 'Seminer bulunamadı.'}</div>;
  }

  return (
    <div className="seminar-detail-container">
      <div className="seminar-detail-header">
        <h1>{seminar.title}</h1>
        <div className={`seminar-status status-${seminar.status}`}>
          {seminar.status === 'scheduled' && 'Planlandı'}
          {seminar.status === 'live' && 'Canlı'}
          {seminar.status === 'completed' && 'Tamamlandı'}
          {seminar.status === 'cancelled' && 'İptal Edildi'}
        </div>
      </div>
      <div className="seminar-detail-content">
        <div className="seminar-info">
          <p><strong>Sunucu:</strong> {seminar.presenter}</p>
          <p><strong>Başlangıç:</strong> {formatDate(seminar.startDate)}</p>
          <p><strong>Bitiş:</strong> {formatDate(seminar.endDate)}</p>
          <p><strong>Oluşturan:</strong> {seminar.creatorEmail}</p>
          {seminar.maxParticipants && (
            <p><strong>Maksimum Katılımcı:</strong> {seminar.maxParticipants}</p>
          )}
        </div>
        <div className="seminar-description">
          <h3>Açıklama</h3>
          <p>{seminar.description}</p>
        </div>
        {/* Seminer Yönetim Kontrolleri - Sadece oluşturucu için */}
        {isCreator && (
          <div className="creator-controls">
            <h3>Seminer Yönetimi</h3>
            {seminar.status !== 'cancelled' && (
              <button
                className="cancel-button"
                onClick={() => handleStatusChange('cancelled')}
              >
                Semineri İptal Et
              </button>
            )}
            {seminar.status === 'scheduled' && isLive && (
              <button
                className="start-button"
                onClick={() => handleStatusChange('live')}
              >
                Semineri Başlat
              </button>
            )}
            {seminar.status === 'live' && (
              <button
                className="complete-button"
                onClick={() => handleStatusChange('completed')}
              >
                Semineri Tamamla
              </button>
            )}
          </div>
        )}
        {/* Katılım Kontrolleri - Oluşturucu olmayan kullanıcılar için */}
        <div className="join-seminar-container">
          {joinError && <div className="error-message">{joinError}</div>}
          
          {isPast ? (
            <p className="seminar-status-message">Bu seminer sona ermiştir.</p>
          ) : isCreator ? (
            <p className="seminar-status-message success">Bu seminerin oluşturucususunuz.</p>
          ) : isParticipant ? (
            <div>
              <p className="seminar-status-message success">Bu seminere katıldınız!</p>
              {seminar.status === 'live' && (
                <button
                  className="join-meeting-button"
                  onClick={handleJoinMeeting}
                >
                  Semineri İzle
                </button>
              )}
              <button
                className="leave-button"
                onClick={handleLeave}
                disabled={joinLoading}
              >
                {joinLoading ? 'İşleniyor...' : 'Seminerden Ayrıl'}
              </button>
            </div>
          ) : isFull ? (
            <p className="seminar-status-message error">Bu seminer dolu.</p>
          ) : seminar.status !== 'cancelled' && !isPast ? (
            <button
              className="join-button"
              onClick={handleJoin}
              disabled={joinLoading}
            >
              {joinLoading ? 'İşleniyor...' : seminar.status === 'live' ? 'Katıl ve İzle' : 'Seminere Katıl'}
            </button>
          ) : null}
        </div>
        {/* Toplantı Kontrolleri */}
        {seminar.status !== 'cancelled' && (
          <div className="meeting-controls">
            {/* Canlı seminer - Katılımcılar ve oluşturucu toplantıya katılabilir */}
            {seminar.status === 'live' && isCreator && (
              <button
                className="join-meeting-button"
                onClick={handleJoinMeeting}
              >
                Toplantıyı Yönet
              </button>
            )}
            
            {/* Planlanmış seminer - Sadece oluşturucu toplantıyı başlatabilir */}
            {seminar.status === 'scheduled' && isCreator && (
              <button
                className="join-meeting-button"
                onClick={handleJoinMeeting}
              >
                Toplantıyı Başlat
              </button>
            )}
          </div>
        )}
        <div className="participants-list">
          <h3>Katılımcılar ({seminar.participants?.length || 0})</h3>
          {seminar.participants && seminar.participants.length > 0 ? (
            <ul>
              {seminar.participants.map((participant, index) => (
                <li key={index}>
                  {participant.displayName} ({participant.email})
                </li>
              ))}
            </ul>
          ) : (
            <p>Henüz katılımcı yok.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeminarDetail;
