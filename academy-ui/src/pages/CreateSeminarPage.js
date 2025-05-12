import React from 'react';
import { Link } from 'react-router-dom';
import CreateSeminar from '../components/seminars/CreateSeminar';
import '../styles/seminars.css';

const CreateSeminarPage = () => {
  return (
    <div className="create-seminar-page">
      <div className="page-header">
        <h1>Yeni Seminer Oluştur</h1>
        <Link to="/seminars" className="back-button">
          Seminerlere Dön
        </Link>
      </div>
      
      <CreateSeminar />
    </div>
  );
};

export default CreateSeminarPage;
