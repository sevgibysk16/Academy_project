import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import '../styles/CreateBlogPost.css';

const CreateBlogPost = ({ onSuccess }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('research');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, [currentUser]);

  const fetchUserData = async () => {
    if (currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (err) {
        console.error('Kullanıcı bilgileri alınırken hata:', err);
      }
    }
  };

  const categories = [
    { id: 'research', name: 'Araştırmalar' },
    { id: 'publications', name: 'Yayınlar' },
    { id: 'conferences', name: 'Konferanslar' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authorName = userData ? 
        `${userData.academicTitle || ''} ${userData.firstName} ${userData.lastName}`.trim() : 
        'Anonim';

      const blogData = {
        title,
        content,
        category,
        authorId: currentUser.uid,
        authorName,
        authorData: {
          academicTitle: userData?.academicTitle || '',
          department: userData?.department || '',
          institution: userData?.institution || '',
          userType: userData?.userType || ''
        },
        createdAt: serverTimestamp(),
        readTime: Math.ceil(content.split(' ').length / 200),
        likes: 0,
        comments: []
      };

      await addDoc(collection(db, 'blogPosts'), blogData);
      
      // Form temizleme
      setTitle('');
      setContent('');
      setCategory('research');
      
      alert('Blog yazınız başarıyla yayınlandı!');
      
      // Başarılı olduğunda onSuccess callback'ini çağır
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Blog yazısı yayınlanırken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-blog-container">
      <h2>Yeni Blog Yazısı</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="blog-form">
        <div className="form-group">
          <label>Başlık</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Blog yazınızın başlığını girin"
          />
        </div>

        <div className="form-group">
          <label>Kategori</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>İçerik</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            placeholder="Blog yazınızın içeriğini girin"
            rows="10"
          />
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={loading}
        >
          {loading ? 'Yayınlanıyor...' : 'Yayınla'}
        </button>
      </form>
    </div>
  );
};

export default CreateBlogPost; 