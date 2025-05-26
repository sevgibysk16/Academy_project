import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import '../styles.css';

const CommentSection = ({ projectId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchComments();
  }, [projectId]);

  const fetchComments = async () => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        setComments(projectData.comments || []);
      }
    } catch (err) {
      setError('Yorumlar yüklenirken hata oluştu: ' + err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      setError('Yorum boş olamaz.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        authorId: currentUser.uid,
        authorEmail: currentUser.email,
        createdAt: new Date(),
        replies: []
      };

      await updateDoc(doc(db, 'projects', projectId), {
        comments: arrayUnion(comment)
      });

      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      setError('Yorum eklenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim()) {
      setError('Yanıt boş olamaz.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reply = {
        id: Date.now().toString(),
        text: replyText.trim(),
        authorId: currentUser.uid,
        authorEmail: currentUser.email,
        createdAt: new Date()
      };

      // Eski yorumu bul
      const oldComment = comments.find(c => c.id === commentId);
      const updatedComment = {
        ...oldComment,
        replies: [...(oldComment.replies || []), reply]
      };

      // Eski yorumu kaldır ve yenisini ekle
      await updateDoc(doc(db, 'projects', projectId), {
        comments: arrayRemove(oldComment)
      });

      await updateDoc(doc(db, 'projects', projectId), {
        comments: arrayUnion(updatedComment)
      });

      // State'i güncelle
      setComments(prev => 
        prev.map(comment => 
          comment.id === commentId 
            ? updatedComment
            : comment
        )
      );

      setReplyText('');
      setReplyTo(null);
    } catch (err) {
      setError('Yanıt eklenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentToDelete) => {
    if (!window.confirm('Bu yorumu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'projects', projectId), {
        comments: arrayRemove(commentToDelete)
      });

      setComments(prev => prev.filter(comment => comment.id !== commentToDelete.id));
    } catch (err) {
      setError('Yorum silinirken hata oluştu: ' + err.message);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="comment-section">
      <div className="comment-section-header">
        <h3>Yorumlar ({comments.length})</h3>
      </div>

      {error && <div className="notification notification-error">{error}</div>}

      {/* Yeni Yorum Ekleme */}
      <div className="add-comment-form">
        <form onSubmit={handleAddComment}>
          <div className="comment-input-group">
            <div className="user-avatar">
              {currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            <textarea
              className="form-control comment-textarea"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Yorumunuzu yazın..."
              rows="3"
              maxLength={500}
            />
          </div>
          <div className="comment-form-actions">
            <small className="char-count">{newComment.length}/500</small>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !newComment.trim()}
            >
              {loading ? 'Gönderiliyor...' : 'Yorum Yap'}
            </button>
          </div>
        </form>
      </div>

      {/* Yorumlar Listesi */}
      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="empty-state">
            <p>Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
          </div>
        ) : (
          comments
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <div className="comment-author">
                    <div className="user-avatar">
                      {comment.authorEmail.charAt(0).toUpperCase()}
                    </div>
                    <div className="author-info">
                      <strong>{comment.authorEmail}</strong>
                      <small>{formatDate(comment.createdAt)}</small>
                    </div>
                  </div>
                  {comment.authorId === currentUser?.uid && (
                    <button
                      className="btn btn-danger btn-sm delete-comment"
                      onClick={() => handleDeleteComment(comment)}
                      title="Yorumu Sil"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                <div className="comment-content">
                  <p>{comment.text}</p>
                </div>

                <div className="comment-actions">
                  <button
                    className="btn btn-link btn-sm"
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  >
                    {replyTo === comment.id ? 'İptal' : 'Yanıtla'}
                  </button>
                  {comment.replies && comment.replies.length > 0 && (
                    <span className="replies-count">
                      {comment.replies.length} yanıt
                    </span>
                  )}
                </div>

                {/* Yanıt Ekleme Formu */}
                {replyTo === comment.id && (
                  <div className="reply-form">
                    <div className="comment-input-group">
                      <div className="user-avatar small">
                        {currentUser?.email?.charAt(0).toUpperCase()}
                      </div>
                      <textarea
                        className="form-control reply-textarea"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Yanıtınızı yazın..."
                        rows="2"
                        maxLength={300}
                      />
                    </div>
                    <div className="reply-form-actions">
                      <small className="char-count">{replyText.length}/300</small>
                      <div className="reply-buttons">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setReplyTo(null);
                            setReplyText('');
                          }}
                        >
                          İptal
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddReply(comment.id)}
                          disabled={loading || !replyText.trim()}
                        >
                          {loading ? 'Gönderiliyor...' : 'Yanıtla'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Yanıtlar */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="replies-list">
                    {comment.replies
                      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                      .map((reply) => (
                        <div key={reply.id} className="reply-item">
                          <div className="reply-header">
                            <div className="reply-author">
                              <div className="user-avatar small">
                                {reply.authorEmail.charAt(0).toUpperCase()}
                              </div>
                              <div className="author-info">
                                <strong>{reply.authorEmail}</strong>
                                <small>{formatDate(reply.createdAt)}</small>
                              </div>
                            </div>
                          </div>
                          <div className="reply-content">
                            <p>{reply.text}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;
