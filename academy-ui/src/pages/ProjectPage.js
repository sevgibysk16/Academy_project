import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import TaskManager from '../components/TaskManager';
import TeamManager from '../components/TeamManager';
import CommentSection from '../components/CommentSection';
import { useAuth } from '../context/AuthContext';
import '../styles.css';

const ProjectPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [applying, setApplying] = useState(false);
  const [userApplication, setUserApplication] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const projectData = { id: docSnap.id, ...docSnap.data() };
          setProject(projectData);
          
          // Kullanıcının başvuru durumunu kontrol et
          if (currentUser && projectData.applications) {
            const userApp = projectData.applications.find(app => app.userId === currentUser.uid);
            setUserApplication(userApp);
          }
        } else {
          setError('Proje bulunamadı');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, currentUser]);

  const handleApplyToProject = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setApplying(true);
    try {
      const application = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        appliedAt: new Date(),
        status: 'pending'
      };

      await updateDoc(doc(db, 'projects', id), {
        applications: arrayUnion(application)
      });

      setUserApplication(application);
      setError('');
    } catch (err) {
      setError('Başvuru gönderilirken hata oluştu: ' + err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!userApplication) return;

    setApplying(true);
    try {
      await updateDoc(doc(db, 'projects', id), {
        applications: arrayRemove(userApplication)
      });

      setUserApplication(null);
      setError('');
    } catch (err) {
      setError('Başvuru geri çekilirken hata oluştu: ' + err.message);
    } finally {
      setApplying(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'recruiting': return 'status-recruiting';
      case 'in_progress': return 'status-progress';
      case 'completed': return 'status-completed';
      case 'paused': return 'status-paused';
      default: return 'status-default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'recruiting': return 'Üye Arıyor';
      case 'in_progress': return 'Devam Ediyor';
      case 'completed': return 'Tamamlandı';
      case 'paused': return 'Duraklatıldı';
      default: return status;
    }
  };

  const isProjectOwner = currentUser && project && project.createdBy === currentUser.uid;
  const canApply = currentUser && project && 
                   project.status === 'recruiting' && 
                   !isProjectOwner && 
                   !userApplication &&
                   (project.currentMembers || 1) < project.maxMembers;

  if (loading) {
    return (
      <div className="container">
        <div className="loading-spinner">Proje yükleniyor...</div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="container">
        <div className="notification notification-error">{error}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="notification notification-error">Proje bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Proje Başlığı ve Durum */}
      <div className="project-header-section">
        <div className="project-title-area">
          <h1 className="project-title">{project.title}</h1>
          <div className={`project-status-badge ${getStatusColor(project.status)}`}>
            {getStatusText(project.status)}
          </div>
        </div>
        
        <div className="project-actions">
          {canApply && (
            <button 
              className="btn btn-primary"
              onClick={handleApplyToProject}
              disabled={applying}
            >
              {applying ? 'Başvuruluyor...' : 'Projeye Başvur'}
            </button>
          )}
          
          {userApplication && (
            <div className="application-status">
              <span className={`application-badge ${userApplication.status}`}>
                Başvuru: {userApplication.status === 'pending' ? 'Beklemede' : 
                         userApplication.status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}
              </span>
              {userApplication.status === 'pending' && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={handleWithdrawApplication}
                  disabled={applying}
                >
                  Başvuruyu Geri Çek
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="notification notification-error">{error}</div>
      )}

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Genel Bakış
        </button>
        <button
          className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Görevler
        </button>
        <button
          className={`tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Takım
        </button>
        <button
          className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Yorumlar
        </button>
        {isProjectOwner && (
          <button
            className={`tab ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            Başvurular ({project.applications?.length || 0})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="project-overview">
            <div className="project-details-grid">
              <div className="project-main-info">
                <div className="card">
                  <h3>Proje Açıklaması</h3>
                  <p className="project-description">{project.description}</p>
                </div>

                {project.requirements && (
                  <div className="card">
                    <h3>Gereksinimler</h3>
                    <p>{project.requirements}</p>
                  </div>
                )}

                {project.tags && project.tags.length > 0 && (
                  <div className="card">
                    <h3>Etiketler</h3>
                    <div className="tags-container">
                      {project.tags.map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {project.skillsRequired && project.skillsRequired.length > 0 && (
                  <div className="card">
                    <h3>Aranan Yetenekler</h3>
                    <div className="skills-container">
                      {project.skillsRequired.map((skill, index) => (
                        <span key={index} className="skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="project-sidebar">
                <div className="card">
                  <h3>Proje Bilgileri</h3>
                  <div className="project-info-list">
                    <div className="info-item">
                      <strong>Tür:</strong>
                      <span>{project.projectType}</span>
                    </div>
                    {project.category && (
                      <div className="info-item">
                        <strong>Kategori:</strong>
                        <span>{project.category}</span>
                      </div>
                    )}
                    {project.duration && (
                      <div className="info-item">
                        <strong>Süre:</strong>
                        <span>{project.duration}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <strong>Üye Sayısı:</strong>
                      <span>{project.currentMembers || 1}/{project.maxMembers}</span>
                    </div>
                    <div className="info-item">
                      <strong>Oluşturan:</strong>
                      <span>{project.ownerEmail}</span>
                    </div>
                    <div className="info-item">
                      <strong>Oluşturulma:</strong>
                      <span>
                        {project.createdAt && new Date(project.createdAt.toDate()).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>
                </div>

                {project.applications && project.applications.length > 0 && !isProjectOwner && (
                  <div className="card">
                    <h3>Başvuru İstatistikleri</h3>
                    <p>{project.applications.length} kişi başvurdu</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && <TaskManager projectId={id} />}
        {activeTab === 'team' && <TeamManager projectId={id} />}
        {activeTab === 'comments' && <CommentSection projectId={id} />}
        
        {activeTab === 'applications' && isProjectOwner && (
          <div className="applications-section">
            <div className="card">
              <h3>Proje Başvuruları</h3>
              {project.applications && project.applications.length > 0 ? (
                <div className="applications-list">
                  {project.applications.map((application, index) => (
                    <div key={index} className="application-item">
                      <div className="application-info">
                        <strong>{application.userEmail}</strong>
                        <small>
                          Başvuru Tarihi: {new Date(application.appliedAt.toDate()).toLocaleDateString('tr-TR')}
                        </small>
                      </div>
                      <div className="application-actions">
                        <span className={`status-badge ${application.status}`}>
                          {application.status === 'pending' ? 'Beklemede' :
                           application.status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}
                        </span>
                        {application.status === 'pending' && (
                          <div className="action-buttons">
                            <button className="btn btn-success btn-sm">Kabul Et</button>
                            <button className="btn btn-danger btn-sm">Reddet</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Henüz başvuru bulunmuyor.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectPage;
