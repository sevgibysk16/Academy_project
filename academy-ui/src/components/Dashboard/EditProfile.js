import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaUser, FaUniversity, FaIdCard, FaBookReader, FaChalkboardTeacher } from 'react-icons/fa';
import './EditProfile.css';

const EditProfile = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    department: '',
    institution: '',
    studentId: '',
    academicTitle: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFormData({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            department: userData.department || '',
            institution: userData.institution || '',
            studentId: userData.studentId || '',
            academicTitle: userData.academicTitle || ''
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Kullanıcı bilgileri alınırken hata:", error);
        setMessage({
          type: 'error',
          text: 'Profil bilgileri yüklenirken bir hata oluştu.'
        });
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const userRef = doc(db, "users", currentUser.uid);
      
      // Kullanıcı tipine göre güncellenecek alanları belirle
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        department: formData.department,
        institution: formData.institution
      };
      
      // Kullanıcı tipine özel alanları ekle
      if (currentUser.userType === 'student') {
        updateData.studentId = formData.studentId;
      } else if (currentUser.userType === 'academic') {
        updateData.academicTitle = formData.academicTitle;
      }
      
      await updateDoc(userRef, updateData);
      
      setMessage({
        type: 'success',
        text: 'Profil bilgileriniz başarıyla güncellendi.'
      });
      
      // 2 saniye sonra dashboard'a yönlendir
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error("Profil güncellenirken hata:", error);
      setMessage({
        type: 'error',
        text: 'Profil güncellenirken bir hata oluştu.'
      });
    } finally {
      setSaving(false);
    }
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
    <div className="edit-profile-container">
      <div className="edit-profile-card">
        <h2>Profil Bilgilerini Düzenle</h2>
        
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <FaUser className="form-icon" />
              Ad
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Adınız"
              required
            />
          </div>
          
          <div className="form-group">
            <label>
              <FaUser className="form-icon" />
              Soyad
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Soyadınız"
              required
            />
          </div>
          
          <div className="form-group">
            <label>
              <FaUniversity className="form-icon" />
              Kurum
            </label>
            <input
              type="text"
              name="institution"
              value={formData.institution}
              onChange={handleChange}
              placeholder="Kurumunuz"
              required
            />
          </div>
          
          <div className="form-group">
            <label>
              <FaBookReader className="form-icon" />
              Bölüm
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Bölümünüz"
              required
            />
          </div>
          
          {currentUser.userType === 'student' && (
            <div className="form-group">
              <label>
                <FaIdCard className="form-icon" />
                Öğrenci Numarası
              </label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="Öğrenci Numaranız"
              />
            </div>
          )}
          
          {currentUser.userType === 'academic' && (
            <div className="form-group">
              <label>
                <FaChalkboardTeacher className="form-icon" />
                Akademik Unvan
              </label>
              <select
                name="academicTitle"
                value={formData.academicTitle}
                onChange={handleChange}
              >
                <option value="">Unvan seçiniz</option>
                <option value="Prof. Dr.">Prof. Dr.</option>
                <option value="Doç. Dr.">Doç. Dr.</option>
                <option value="Dr. Öğr. Üyesi">Dr. Öğr. Üyesi</option>
                <option value="Öğr. Gör.">Öğr. Gör.</option>
                <option value="Arş. Gör.">Arş. Gör.</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
          )}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => navigate('/dashboard')}
            >
              İptal
            </button>
            <button 
              type="submit" 
              className="save-btn"
              disabled={saving}
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
