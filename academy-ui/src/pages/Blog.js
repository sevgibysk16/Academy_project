import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CreateBlogPost from '../components/CreateBlogPost';
import '../styles/Blog.css';

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const navigate = useNavigate();

  const categories = [
    { id: 'all', name: 'Tümü' },
    { id: 'research', name: 'Araştırmalar' },
    { id: 'publications', name: 'Yayınlar' },
    { id: 'conferences', name: 'Konferanslar' }
  ];

  useEffect(() => {
    fetchBlogPosts();
  }, [selectedCategory]);

  const fetchBlogPosts = async () => {
    try {
      setLoading(true);
      let q;
      
      if (selectedCategory === 'all') {
        q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
      } else {
        q = query(
          collection(db, 'blogPosts'),
          where('category', '==', selectedCategory),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      setBlogPosts(posts);
    } catch (err) {
      setError('Blog yazıları yüklenirken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchBlogPosts();
  };

  const filteredPosts = selectedCategory === 'all' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  const handleReadMore = (postId) => {
    console.log('Yönlendiriliyor:', postId); // Debug için
    navigate(`/blog/${postId}`);
  };

  return (
    <div className="blog-container">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="blog-header"
      >
        <h1>Akademik Blog</h1>
        <p>Bilim ve araştırma dünyasından en güncel gelişmeler</p>
        
        {currentUser && (
          <button 
            className="create-post-btn"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'İptal' : 'Yeni Yazı Oluştur'}
          </button>
        )}
      </motion.div>

      {showCreateForm && (
        <CreateBlogPost onSuccess={handleCreateSuccess} />
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="category-filter">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Yükleniyor...</div>
      ) : (
        <div className="blog-grid">
          {filteredPosts.map(post => (
            <motion.article 
              key={post.id}
              className="blog-card"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="blog-content">
                <div className="blog-meta">
                  <span>{post.createdAt?.toLocaleDateString('tr-TR')}</span>
                  <span>{post.readTime} dk okuma</span>
                </div>
                <h2>{post.title}</h2>
                <p>{post.content.substring(0, 150)}...</p>
                <div className="blog-footer">
                  <div className="author-info">
                    <span className="author-name">{post.authorName}</span>
                    {post.authorData && (
                      <span className="author-details">
                        {post.authorData.department} - {post.authorData.institution}
                      </span>
                    )}
                  </div>
                  <button 
                    className="read-more"
                    onClick={() => handleReadMore(post.id)}
                  >
                    Devamını Oku
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blog; 