import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

const ResetPassword = () => {
  const { resetPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const query = new URLSearchParams(useLocation().search);
  const oobCode = query.get('oobCode');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      await resetPassword.verifyCode(oobCode);
      await resetPassword.updatePassword(oobCode, newPassword);
      setMessage("Şifreniz başarıyla güncellendi.");
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <h2>Yeni Şifre Oluştur</h2>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      {!message && (
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Yeni şifrenizi girin"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;
