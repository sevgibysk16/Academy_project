import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import '../styles/BlogPost.css';

const BlogPost = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    console.log('BlogPost bileşeni yüklendi, postId:', postId);
    fetchBlogPost();
  }, [postId]);

  const fetchBlogPost = async () => {
    try {
      console.log('Blog yazısı getiriliyor, ID:', postId);
      const docRef = doc(db, 'blogPosts', postId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log('Blog yazısı bulundu:', docSnap.data());
        setPost({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate()
        });
      } else {
        console.log('Blog yazısı bulunamadı');
        setError('Blog yazısı bulunamadı.');
      }
    } catch (err) {
      console.error('Blog yazısı getirilirken hata:', err);
      setError('Blog yazısı yüklenirken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Bu blog yazısını silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'blogPosts', postId));
        navigate('/blog');
      } catch (err) {
        setError('Blog yazısı silinirken bir hata oluştu: ' + err.message);
      }
    }
  };

  // Sadece yazar kontrolü yapıyoruz
  const isAuthor = currentUser && post?.authorId === currentUser.uid;

  if (loading) return <div className="loading">Yükleniyor...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!post) return <div className="error-message">Blog yazısı bulunamadı.</div>;

  return (
    <motion.div 
      className="blog-post-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button 
        className="back-button"
        onClick={() => navigate('/blog')}
      >
        ← Blog Listesine Dön
      </button>

      <div className="blog-post-header">
        <h1>{post.title}</h1>
        <div className="blog-post-meta">
          <div className="author-info">
            <span className="author-name">{post.authorName}</span>
            {post.authorData && (
              <div className="author-details">
                <span>{post.authorData.department}</span>
                <span>{post.authorData.institution}</span>
              </div>
            )}
          </div>
          <div className="post-meta">
            <span className="date">{post.createdAt?.toLocaleDateString('tr-TR')}</span>
            <span className="read-time">{post.readTime} dk okuma</span>
          </div>
        </div>
      </div>

      {post.imageUrl && (
        <div className="blog-post-image">
          <img src={post.imageUrl} alt={post.title} />
        </div>
      )}

      <div className="blog-post-content">
        {post.content.split('\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {/* Sadece yazar için butonları göster */}
      {isAuthor && (
        <div className="blog-post-actions">
          <button 
            className="edit-btn"
            onClick={() => navigate(`/blog/edit/${postId}`)}
          >
            Düzenle
          </button>
          <button 
            className="delete-btn"
            onClick={handleDelete}
          >
            Sil
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default BlogPost; 