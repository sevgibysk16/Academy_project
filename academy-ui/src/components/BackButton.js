import React from 'react';
import { useNavigate } from 'react-router-dom';
import './BackButton.css';

const BackButton = ({ customPath }) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (customPath) {
      navigate(customPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <button 
      className="back-button"
      onClick={handleGoBack}
      aria-label="Geri git"
    >
      <span className="back-arrow">←</span>
      <span className="back-text">Geri</span>
    </button>
  );
};

export default BackButton; 