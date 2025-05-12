import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSeminar } from '../services/seminarService';
import { useSeminarContext } from '../../context/SeminarContext';
import '../../styles/seminars.css';

const CreateSeminar = () => {
  const navigate = useNavigate();
  const { refreshSeminars, currentUser } = useSeminarContext();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    presenter: '',
    startDate: '',
    endDate: '',
    maxParticipants: '',
    meetingLink: '',
    isPublic: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
        
    if (!currentUser) {
      setError('Seminer oluşturmak için giriş yapmalısınız.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      // Validate dates
      const startDateTime = new Date(formData.startDate);
      const endDateTime = new Date(formData.endDate);
            
      if (endDateTime <= startDateTime) {
        throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalıdır.');
      }
      const seminarData = {
        ...formData,
        creatorId: currentUser.uid,
        creatorEmail: currentUser.email,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null
      };
      const newSeminar = await createSeminar(seminarData);
      console.log("Yeni seminer oluşturuldu:", newSeminar);
      
      // Seminerleri yenile ve tamamlanmasını bekle
      await refreshSeminars();
      
      navigate(`/seminars/${newSeminar.id}`);
    } catch (err) {
      setError(err.message || 'Seminer oluşturulurken bir hata oluştu.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-seminar-container">
      <h2>Yeni Seminer Oluştur</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="seminar-form">
        <div className="form-group">
          <label htmlFor="title">Seminer Başlığı *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Açıklama *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="presenter">Sunucu *</label>
          <input
            type="text"
            id="presenter"
            name="presenter"
            value={formData.presenter}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="startDate">Başlangıç Tarihi ve Saati *</label>
          <input
            type="datetime-local"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="endDate">Bitiş Tarihi ve Saati *</label>
          <input
            type="datetime-local"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="maxParticipants">Maksimum Katılımcı Sayısı</label>
          <input
            type="number"
            id="maxParticipants"
            name="maxParticipants"
            value={formData.maxParticipants}
            onChange={handleChange}
            min="1"
            placeholder="Boş bırakırsanız sınırsız olacaktır"
          />
        </div>
        
        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            id="isPublic"
            name="isPublic"
            checked={formData.isPublic}
            onChange={handleChange}
          />
          <label htmlFor="isPublic">Herkese Açık</label>
        </div>
        
        <button 
          type="submit" 
          className="submit-button" 
          disabled={loading}
        >
          {loading ? 'Oluşturuluyor...' : 'Semineri Oluştur'}
        </button>
      </form>
    </div>
  );
};

export default CreateSeminar;
