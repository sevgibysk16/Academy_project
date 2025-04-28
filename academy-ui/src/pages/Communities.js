import React, { useState, useEffect } from 'react';
import CommunityList from '../Community/CommunityList';
import CommunityDetail from '../Community/CommunityDetail';
import { getCommunities } from '../../services/communityService';

const Communities = () => {
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState(null);

  useEffect(() => {
    const fetchCommunities = async () => {
      const data = await getCommunities();
      setCommunities(data);
    };
    fetchCommunities();
  }, []);

  return (
    <div className="communities-page">
      {selectedCommunity ? (
        <CommunityDetail 
          community={selectedCommunity} 
          onBack={() => setSelectedCommunity(null)} 
        />
      ) : (
        <>
          <h1>Topluluklar</h1>
          <CommunityList 
            communities={communities} 
            onSelectCommunity={setSelectedCommunity} 
          />
        </>
      )}
    </div>
  );
};

export default Communities;
