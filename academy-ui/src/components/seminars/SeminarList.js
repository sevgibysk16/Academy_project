import React, { useState, useEffect } from 'react';
import { useSeminarContext } from '../../context/SeminarContext';
import SeminarCard from './SeminarCard';
import '../../styles/seminars.css';

const SeminarList = () => {
  const { upcomingSeminars, pastSeminars, loading, error, refreshSeminars } = useSeminarContext();
  const [activeTab, setActiveTab] = useState('upcoming');
  
  useEffect(() => {
    console.log("SeminarList bileşeni yüklendi");
    console.log("Yaklaşan seminerler:", upcomingSeminars);
    console.log("Geçmiş seminerler:", pastSeminars);
    
    // Bileşen yüklendiğinde seminerleri yenile
    refreshSeminars();
  }, []);

  if (loading) {
    return <div className="loading-container">Seminerler yükleniyor...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  return (
    <div className="seminar-list-container">
      <div className="seminar-tabs">
        <button 
          className={`tab-button ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Yaklaşan Seminerler ({upcomingSeminars.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Geçmiş Seminerler ({pastSeminars.length})
        </button>
      </div>
      <div className="seminar-grid">
        {activeTab === 'upcoming' && upcomingSeminars.length === 0 && (
          <p className="no-seminars">Yaklaşan seminer bulunmamaktadır.</p>
        )}
        
        {activeTab === 'past' && pastSeminars.length === 0 && (
          <p className="no-seminars">Geçmiş seminer bulunmamaktadır.</p>
        )}
        
        {activeTab === 'upcoming' && 
          upcomingSeminars.map(seminar => (
            <SeminarCard key={seminar.id} seminar={seminar} />
          ))
        }
        
        {activeTab === 'past' && 
          pastSeminars.map(seminar => (
            <SeminarCard key={seminar.id} seminar={seminar} />
          ))
        }
      </div>
    </div>
  );
};

export default SeminarList;
