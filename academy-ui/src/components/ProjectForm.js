import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import '../styles.css';

const ProjectForm = ({ onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [requirements, setRequirements] = useState('');
  const [duration, setDuration] = useState('');
  const [maxMembers, setMaxMembers] = useState(5);
  const [skillsRequired, setSkillsRequired] = useState('');
  const [projectType, setProjectType] = useState('academic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { currentUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      setError('Başlık ve açıklama alanları zorunludur.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!currentUser) {
        throw new Error('Kullanıcı girişi yapılmamış');
      }

      const tagsArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const skillsArray = skillsRequired.split(',').map(skill => skill.trim()).filter(skill => skill);

      await addDoc(collection(db, 'projects'), {
        title: title.trim(),
        description: description.trim(),
        category,
        tags: tagsArray,
        requirements: requirements.trim(),
        duration,
        maxMembers: parseInt(maxMembers),
        skillsRequired: skillsArray,
        projectType,
        createdBy: currentUser.uid,
        ownerEmail: currentUser.email,
        createdAt: new Date(),
        status: 'recruiting',
        currentMembers: 1,
        applications: [],
        featured: false
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setTags('');
      setRequirements('');
      setDuration('');
      setMaxMembers(5);
      setSkillsRequired('');
      setProjectType('academic');
      
      setSuccess('Proje başarıyla oluşturuldu!');
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Yeni Proje İlanı Oluştur</h2>
      
      {error && <div className="notification notification-error">{error}</div>}
      {success && <div className="notification notification-success">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">Proje Başlığı *</label>
            <input
              type="text"
              id="title"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Projenizin başlığını girin"
              maxLength={100}
            />
            <small className="form-text">{title.length}/100 karakter</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="projectType">Proje Türü *</label>
            <select
              id="projectType"
              className="form-control"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
              required
            >
              <option value="academic">Akademik Proje</option>
              <option value="research">Araştırma Projesi</option>
              <option value="startup">Startup Projesi</option>
              <option value="competition">Yarışma Projesi</option>
              <option value="thesis">Tez Projesi</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Proje Açıklaması *</label>
          <textarea
            id="description"
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows="4"
            placeholder="Projenizi detaylı olarak açıklayın"
            maxLength={1000}
          />
          <small className="form-text">{description.length}/1000 karakter</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Kategori</label>
            <select
              id="category"
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Kategori Seçin</option>
              <option value="computer-science">Bilgisayar Bilimleri</option>
              <option value="engineering">Mühendislik</option>
              <option value="business">İşletme</option>
              <option value="design">Tasarım</option>
              <option value="science">Fen Bilimleri</option>
              <option value="social-sciences">Sosyal Bilimler</option>
              <option value="arts">Sanat</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="duration">Proje Süresi</label>
            <select
              id="duration"
              className="form-control"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="">Süre Seçin</option>
              <option value="1-month">1 Ay</option>
              <option value="3-months">3 Ay</option>
              <option value="6-months">6 Ay</option>
              <option value="1-year">1 Yıl</option>
              <option value="ongoing">Devam Eden</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="requirements">Gereksinimler</label>
          <textarea
            id="requirements"
            className="form-control"
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows="3"
            placeholder="Proje için gerekli koşulları belirtin"
            maxLength={500}
          />
          <small className="form-text">{requirements.length}/500 karakter</small>
        </div>

        <div className="form-group">
          <label htmlFor="skillsRequired">Aranan Yetenekler</label>
          <input
            type="text"
            id="skillsRequired"
            className="form-control"
            value={skillsRequired}
            onChange={(e) => setSkillsRequired(e.target.value)}
            placeholder="React, Python, UI/UX, Veri Analizi (virgülle ayırın)"
          />
          <small className="form-text">Yetenekleri virgülle ayırarak yazın</small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="maxMembers">Maksimum Üye Sayısı</label>
            <input
              type="number"
              id="maxMembers"
              className="form-control"
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              min="2"
              max="20"
            />
            <small className="form-text">2-20 arası bir sayı girin</small>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Etiketler</label>
            <input
              type="text"
              id="tags"
              className="form-control"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="web, mobile, ai, blockchain (virgülle ayırın)"
            />
            <small className="form-text">Etiketleri virgülle ayırarak yazın</small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Oluşturuluyor...' : 'Proje İlanı Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
