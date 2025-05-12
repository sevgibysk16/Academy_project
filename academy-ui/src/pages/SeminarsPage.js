import React from 'react';
import { Link } from 'react-router-dom';
import SeminarList from '../components/seminars/SeminarList';
import { useSeminarContext } from '../context/SeminarContext';
import '../styles/seminars.css';

const SeminarsPage = () => {
  const { currentUser } = useSeminarContext();

  return (
    <div className="seminars-page">
      <div className="seminars-header">
        <h1>Seminerler</h1>
        {currentUser && (
          <Link to="/create-seminar" className="create-seminar-button">
            Yeni Seminer Oluştur
          </Link>
        )}
      </div>
      
      <SeminarList />
    </div>
  );
};

export default SeminarsPage;
