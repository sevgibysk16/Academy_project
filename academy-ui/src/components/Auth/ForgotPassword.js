import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await resetPassword.sendVerificationCode(email);
      setMessage("Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <h2>Şifre Sıfırlama</h2>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="E-posta adresiniz"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
