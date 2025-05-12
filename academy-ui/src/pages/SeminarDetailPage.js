import React from 'react';
import { Link, useParams } from 'react-router-dom';
import SeminarDetail from '../components/seminars/SeminarDetail';
import '../styles/seminars.css';

const SeminarDetailPage = () => {
  const { id } = useParams();

  return (
    <div className="seminar-detail-page">
      <div className="page-header">
        <h1>Seminer Detayları</h1>
        <Link to="/seminars" className="back-button">
          Seminerlere Dön
        </Link>
      </div>
      
      <SeminarDetail />
    </div>
  );
};

export default SeminarDetailPage;
