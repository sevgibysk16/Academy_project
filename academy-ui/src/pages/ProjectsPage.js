import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import ProjectForm from '../components/ProjectForm';
import { useAuth } from '../context/AuthContext';
import '../styles.css';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const q = query(
      collection(db, 'projects'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectList);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.tags && project.tags.some(tag => 
                           tag.toLowerCase().includes(searchTerm.toLowerCase())
                         ));
    
    const matchesCategory = !filterCategory || project.category === filterCategory;
    const matchesType = !filterType || project.projectType === filterType;
    const matchesStatus = !filterStatus || project.status === filterStatus;

    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

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

  if (loading) {
    return (
      <div className="container">
        <div className="loading-spinner">Projeler yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="notification notification-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Projeler</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Formu Gizle' : 'Yeni Proje Oluştur'}
        </button>
      </div>

      {/* Arama ve Filtreler */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            className="form-control"
            placeholder="Proje ara... (başlık, açıklama, etiketler)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filters-row">
          <select
            className="form-control"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">Tüm Kategoriler</option>
            <option value="computer-science">Bilgisayar Bilimleri</option>
            <option value="engineering">Mühendislik</option>
            <option value="business">İşletme</option>
            <option value="design">Tasarım</option>
            <option value="science">Fen Bilimleri</option>
            <option value="social-sciences">Sosyal Bilimler</option>
            <option value="arts">Sanat</option>
          </select>

          <select
            className="form-control"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Tüm Türler</option>
            <option value="academic">Akademik Proje</option>
            <option value="research">Araştırma Projesi</option>
            <option value="startup">Startup Projesi</option>
            <option value="competition">Yarışma Projesi</option>
            <option value="thesis">Tez Projesi</option>
          </select>

          <select
            className="form-control"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Tüm Durumlar</option>
            <option value="recruiting">Üye Arıyor</option>
            <option value="in_progress">Devam Ediyor</option>
            <option value="completed">Tamamlandı</option>
            <option value="paused">Duraklatıldı</option>
          </select>
        </div>
      </div>

      {/* Proje Oluşturma Formu */}
      {showCreateForm && (
        <div className="form-section">
          <ProjectForm onSuccess={() => setShowCreateForm(false)} />
        </div>
      )}

      {/* Projeler Listesi */}
      <div className="projects-stats">
        <p>{filteredProjects.length} proje bulundu</p>
      </div>

      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          <div className="no-projects">
            <h3>Henüz proje bulunmuyor</h3>
            <p>İlk projeyi sen oluştur!</p>
          </div>
        ) : (
          filteredProjects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-header">
                <h3 className="project-title">
                  <Link to={`/project/${project.id}`}>
                    {project.title}
                  </Link>
                </h3>
                <div className={`project-status ${getStatusColor(project.status)}`}>
                  {getStatusText(project.status)}
                </div>
              </div>
              
              <p className="project-description">
                {project.description.length > 150 
                  ? `${project.description.substring(0, 150)}...` 
                  : project.description
                }
              </p>

              <div className="project-meta">
                <div className="project-info">
                  <span className="project-type">{project.projectType}</span>
                  {project.category && (
                    <span className="project-category">{project.category}</span>
                  )}
                </div>
                
                <div className="project-members">
                  <span>{project.currentMembers || 1}/{project.maxMembers} üye</span>
                </div>
              </div>

              {project.tags && project.tags.length > 0 && (
                <div className="project-tags">
                  {project.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                  {project.tags.length > 3 && (
                    <span className="tag">+{project.tags.length - 3}</span>
                  )}
                </div>
              )}

              <div className="project-footer">
                <div className="project-owner">
                  <small>Oluşturan: {project.ownerEmail}</small>
                </div>
                <div className="project-date">
                  <small>
                    {project.createdAt && new Date(project.createdAt.toDate()).toLocaleDateString('tr-TR')}
                  </small>
                </div>
              </div>

              <Link to={`/project/${project.id}`} className="btn btn-outline">
                Detayları Gör
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
