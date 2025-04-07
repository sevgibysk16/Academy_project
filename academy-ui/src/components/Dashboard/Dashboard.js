import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Eğer AuthContext'ten kullanıcı bilgisi varsa, onu kullan
        if (currentUser) {
          // Kullanıcı bilgilerini API'den al
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Token bulunamadı');
          }

          // API'den kullanıcı profil bilgilerini al
          const response = await fetch('http://localhost:8000/users/me/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Kullanıcı bilgileri alınamadı');
          }

          const data = await response.json();
          setUserData(data);
          setLoading(false);
          return;
        }

        // Eğer AuthContext'ten kullanıcı bilgisi yoksa, API'den al
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Token bulunamadı');
        }

        // API'den kullanıcı bilgilerini al
        const response = await fetch('http://localhost:8000/users/me/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Kullanıcı bilgileri alınamadı');
        }

        const data = await response.json();
        setUserData(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        console.error('Kullanıcı bilgileri alınırken hata:', err);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handleLogout = () => {
    logout();
  };

  // Profil güncelleme işlemi
  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const profileData = {
      first_name: formData.get('firstName'),
      last_name: formData.get('lastName'),
      phone: formData.get('phone'),
      address: formData.get('address')
    };

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token bulunamadı');
      }

      const response = await fetch('http://localhost:8000/users/me/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        throw new Error('Profil güncellenemedi');
      }

      // Profil başarıyla güncellendi, kullanıcı verilerini yeniden yükle
      const updatedUserResponse = await fetch('http://localhost:8000/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!updatedUserResponse.ok) {
        throw new Error('Güncel kullanıcı bilgileri alınamadı');
      }

      const updatedUserData = await updatedUserResponse.json();
      setUserData(updatedUserData);
      alert('Profil başarıyla güncellendi');
    } catch (err) {
      alert(`Hata: ${err.message}`);
      console.error('Profil güncellenirken hata:', err);
    }
  };

  // Şifre değiştirme işlemi
  const handlePasswordChange = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const passwordData = {
      current_password: formData.get('currentPassword'),
      new_password: formData.get('newPassword'),
      confirm_password: formData.get('confirmPassword')
    };

    // Şifre doğrulama kontrolü
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('Yeni şifre ve şifre tekrarı eşleşmiyor');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token bulunamadı');
      }

      const response = await fetch('http://localhost:8000/users/me/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(passwordData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Şifre değiştirilemedi');
      }

      alert('Şifreniz başarıyla değiştirildi');
      // Formu sıfırla
      event.target.reset();
    } catch (err) {
      alert(`Hata: ${err.message}`);
      console.error('Şifre değiştirilirken hata:', err);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-card">
          <h2>Bir Hata Oluştu</h2>
          <p className="error-message">{error}</p>
          <button onClick={handleLogout} className="dashboard-button danger">
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Hoş Geldiniz, {userData?.full_name || 'Kullanıcı'}</h1>
        <p>Hesabınızı yönetin ve bilgilerinizi güncelleyin</p>
      </div>
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fas fa-home"></i> Genel Bakış
        </button>
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <i className="fas fa-user"></i> Profil
        </button>
        <button 
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <i className="fas fa-cog"></i> Ayarlar
        </button>
        <button 
          className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <i className="fas fa-chart-line"></i> Aktivite
        </button>
      </div>
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="tab-content">
            <div className="dashboard-cards">
              <div className="dashboard-card">
                <div className="card-icon">
                  <i className="fas fa-user-circle"></i>
                </div>
                <div className="card-content">
                  <h3>Profil Bilgileri</h3>
                  <p><strong>Ad Soyad:</strong> {userData?.full_name}</p>
                  <p><strong>Email:</strong> {userData?.email}</p>
                  <p><strong>Üyelik Tarihi:</strong> {userData?.joined_date}</p>
                  <p><strong>Son Giriş:</strong> {userData?.last_login}</p>
                  <button className="dashboard-button" onClick={() => setActiveTab('profile')}>
                    Profili Düzenle
                  </button>
                </div>
              </div>
              <div className="dashboard-card">
                <div className="card-icon">
                  <i className="fas fa-bell"></i>
                </div>
                <div className="card-content">
                  <h3>Bildirimler</h3>
                  <div className="notification-list">
                    <div className="notification-item">
                      <i className="fas fa-info-circle"></i>
                      <p>Hoş geldiniz! Profilinizi tamamlayın.</p>
                    </div>
                    <div className="notification-item">
                      <i className="fas fa-lock"></i>
                      <p>Güvenlik için şifrenizi düzenli olarak değiştirin.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="dashboard-card">
                <div className="card-icon">
                  <i className="fas fa-chart-pie"></i>
                </div>
                <div className="card-content">
                  <h3>Hesap Özeti</h3>
                  <p><strong>Hesap Türü:</strong> {userData?.account_type}</p>
                  <p><strong>Durum:</strong> <span className="status-active">Aktif</span></p>
                  <button className="dashboard-button" onClick={() => setActiveTab('settings')}>
                    Hesap Ayarları
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="tab-content">
            <div className="dashboard-card full-width">
              <h2>Profil Bilgileri</h2>
              <form className="profile-form" onSubmit={handleProfileUpdate}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Ad</label>
                    <input 
                      type="text" 
                      name="firstName"
                      defaultValue={currentUser?.first_name} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Soyad</label>
                    <input 
                      type="text" 
                      name="lastName"
                      defaultValue={currentUser?.last_name} 
                      required 
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    defaultValue={userData?.email} 
                    disabled 
                  />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input 
                    type="tel" 
                    name="phone"
                    placeholder="Telefon numaranızı girin" 
                  />
                </div>
                <div className="form-group">
                  <label>Adres</label>
                  <textarea 
                    name="address"
                    placeholder="Adresinizi girin"
                  ></textarea>
                </div>
                <button type="submit" className="dashboard-button">Değişiklikleri Kaydet</button>
              </form>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="tab-content">
            <div className="dashboard-card full-width">
              <h2>Hesap Ayarları</h2>
              
              <div className="settings-section">
                <h3>Şifre Değiştir</h3>
                <form className="settings-form" onSubmit={handlePasswordChange}>
                  <div className="form-group">
                    <label>Mevcut Şifre</label>
                    <input 
                      type="password" 
                      name="currentPassword"
                      placeholder="Mevcut şifrenizi girin" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Yeni Şifre</label>
                    <input 
                      type="password" 
                      name="newPassword"
                      placeholder="Yeni şifrenizi girin" 
                      required 
                      minLength="6"
                    />
                  </div>
                  <div className="form-group">
                    <label>Şifre Tekrar</label>
                    <input 
                      type="password" 
                      name="confirmPassword"
                      placeholder="Yeni şifrenizi tekrar girin" 
                      required 
                      minLength="6"
                    />
                  </div>
                  <button type="submit" className="dashboard-button">Şifreyi Güncelle</button>
                </form>
              </div>
              
              <div className="settings-section">
                <h3>Bildirim Ayarları</h3>
                <div className="settings-options">
                  <div className="setting-option">
                    <div>
                      <h4>Email Bildirimleri</h4>
                      <p>Önemli güncellemeler ve duyurular için email bildirimleri alın</p>
                    </div>
                    <label className="switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  
                  <div className="setting-option">
                    <div>
                      <h4>Tarayıcı Bildirimleri</h4>
                      <p>Tarayıcı üzerinden anlık bildirimler alın</p>
                    </div>
                    <label className="switch">
                      <input type="checkbox" />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="settings-section">
                <h3>Hesap İşlemleri</h3>
                <div className="account-actions">
                  <button className="dashboard-button danger" onClick={handleLogout}>
                    Çıkış Yap
                  </button>
                  <button className="dashboard-button warning">
                    Hesabımı Dondur
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'activity' && (
                    <div className="tab-content">
                    <div className="dashboard-card full-width">
                      <h2>Aktivite Geçmişi</h2>
                      
                      <div className="activity-list">
                        <div className="activity-item">
                          <div className="activity-icon">
                            <i className="fas fa-sign-in-alt"></i>
                          </div>
                          <div className="activity-details">
                            <h4>Giriş Yapıldı</h4>
                            <p>Bugün, {new Date().toLocaleTimeString()}</p>
                          </div>
                        </div>
                        
                        <div className="activity-item">
                          <div className="activity-icon">
                            <i className="fas fa-user-edit"></i>
                          </div>
                          <div className="activity-details">
                            <h4>Profil Güncellendi</h4>
                            <p>Dün, 15:30</p>
                          </div>
                        </div>
                        
                        <div className="activity-item">
                          <div className="activity-icon">
                            <i className="fas fa-sign-in-alt"></i>
                          </div>
                          <div className="activity-details">
                            <h4>Giriş Yapıldı</h4>
                            <p>Dün, 09:15</p>
                          </div>
                        </div>
                        
                        <div className="activity-item">
                          <div className="activity-icon">
                            <i className="fas fa-key"></i>
                          </div>
                          <div className="activity-details">
                            <h4>Şifre Değiştirildi</h4>
                            <p>3 gün önce, 14:20</p>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        className="dashboard-button"
                        onClick={() => {
                          // Aktivite geçmişini yenileme işlemi
                          setLoading(true);
                          setTimeout(() => {
                            setLoading(false);
                          }, 500);
                        }}
                      >
                        Aktivite Geçmişini Yenile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        };
        
        export default Dashboard;
        
