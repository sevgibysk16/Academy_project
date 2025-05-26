import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import '../styles/TranscriptsPage.css';

const TranscriptsPage = () => {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTranscripts();
  }, []);

  const fetchTranscripts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Transkriptler yükleniyor...');

      const recordingsRef = collection(db, 'seminarRecordings');
      const q = query(recordingsRef, orderBy('startedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      console.log('Bulunan kayıt sayısı:', querySnapshot.size);
      
      const transcriptsData = [];
      for (const docSnapshot of querySnapshot.docs) {
        try {
          const recordingData = docSnapshot.data();
          console.log('Kayıt verisi:', recordingData);

          let seminarData = {};
          if (recordingData.seminarId) {
            const seminarRef = doc(db, 'seminars', recordingData.seminarId);
            const seminarDoc = await getDoc(seminarRef);
            if (seminarDoc.exists()) {
              seminarData = seminarDoc.data();
              console.log('Seminer verisi:', seminarData);
            } else {
              console.log('Seminer bulunamadı:', recordingData.seminarId);
            }
          }

          const transcriptData = {
            id: docSnapshot.id,
            ...recordingData,
            seminarTitle: seminarData?.title || '',
            seminarDescription: seminarData?.description || '',
            hostName: seminarData?.hostName || recordingData.hostName || '',
            hostEmail: seminarData?.hostEmail || recordingData.hostEmail || '',
            participants: seminarData?.participants || [],
            duration: calculateDuration(recordingData.startedAt, recordingData.endedAt || recordingData.lastUpdated)
          };

          console.log('Birleştirilmiş veri:', transcriptData);
          transcriptsData.push(transcriptData);
        } catch (docError) {
          console.error('Kayıt işlenirken hata:', docError);
        }
      }
      
      console.log('Toplam işlenen kayıt:', transcriptsData.length);
      setTranscripts(transcriptsData);
    } catch (error) {
      console.error('Transkriptler yüklenirken hata:', error);
      setError('Transkriptler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return '';
    try {
      const startTime = start.toDate();
      const endTime = end.toDate();
      const duration = Math.floor((endTime - startTime) / 1000 / 60); // dakika cinsinden
      return duration > 0 ? `${duration} dakika` : '';
    } catch (error) {
      console.error('Süre hesaplanırken hata:', error);
      return '';
    }
  };

  const handleTranscriptClick = (transcript) => {
    setSelectedTranscript(transcript);
  };

  const filteredTranscripts = transcripts.filter(transcript => {
    const matchesSearch = 
      transcript.seminarTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transcript.academicName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transcript.hostName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || transcript.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date) => {
    if (!date) return '';
    try {
      return date.toDate().toLocaleString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Tarih formatlanırken hata:', error);
      return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'completed':
        return 'Tamamlandı';
      case 'ended':
        return 'Sonlandı';
      default:
        return '';
    }
  };

  return (
    <div className="transcripts-page">
      <div className="transcripts-header">
        <h1>Seminer Transkriptleri</h1>
        <div className="transcripts-controls">
          <input
            type="text"
            placeholder="Seminer, akademisyen veya sunucu ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="status-filter"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="completed">Tamamlandı</option>
            <option value="ended">Sonlandı</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="transcripts-container">
        <div className="transcripts-list">
          {loading ? (
            <div className="loading">Yükleniyor...</div>
          ) : filteredTranscripts.length === 0 ? (
            <div className="no-transcripts">Transkript bulunamadı</div>
          ) : (
            filteredTranscripts.map((transcript) => (
              <div
                key={transcript.id}
                className={`transcript-card ${selectedTranscript?.id === transcript.id ? 'selected' : ''}`}
                onClick={() => handleTranscriptClick(transcript)}
              >
                <div className="transcript-card-header">
                  <h3>{transcript.seminarTitle}</h3>
                  <span className={`status-badge ${transcript.status}`}>
                    {getStatusText(transcript.status)}
                  </span>
                </div>
                <div className="transcript-card-details">
                  <p><strong>Akademisyen:</strong> {transcript.academicName}</p>
                  <p><strong>Sunucu:</strong> {transcript.hostName}</p>
                  <p><strong>Tarih:</strong> {formatDate(transcript.startedAt)}</p>
                  <p><strong>Süre:</strong> {transcript.duration}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="transcript-detail">
          {selectedTranscript ? (
            <div className="transcript-content">
              <div className="transcript-header">
                <h2>{selectedTranscript.seminarTitle}</h2>
                <div className="transcript-meta">
                  {selectedTranscript.hostEmail && (
                    <p><strong>Sunucu E-posta:</strong> {selectedTranscript.hostEmail}</p>
                  )}
                  {selectedTranscript.status && (
                    <p><strong>Durum:</strong> {getStatusText(selectedTranscript.status)}</p>
                  )}
                </div>
              </div>
              <div className="transcript-text">
                {selectedTranscript.text || 'Transkript henüz oluşturulmadı.'}
              </div>
            </div>
          ) : (
            <div className="no-selection">
              Görüntülemek için bir transkript seçin
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptsPage; 