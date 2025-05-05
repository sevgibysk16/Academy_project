import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getFirestore, doc, setDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import './CommunityStyles.css';

const CommunityPage = () => {
  const { currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const db = getFirestore();
  const navigate = useNavigate();

  const community = {
    _id: '1',
    name: 'Intellica Yazılım Topluluğu',
    description: 'Kodlama, teknoloji ve inovasyon üzerine birlikte öğreniyoruz!',
  };

  const handleJoinClick = () => {
    if (!currentUser) {
      alert('Topluluğa katılmak için giriş yapmalısınız.');
      return;
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      alert('Lütfen ad ve soyadınızı giriniz.');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        first_name: firstName,
        last_name: lastName,
        community_member: true,
      }, { merge: true });

      alert('Topluluğa başarıyla katıldınız!');
      setIsMember(true);
      fetchMembers();
      setShowForm(false);
      setFirstName('');
      setLastName('');
    } catch (error) {
      console.error('Topluluğa katılırken hata oluştu:', error);
      alert('Katılım sırasında bir hata oluştu.');
    }
  };

  const fetchMembers = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('community_member', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const membersList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const fullName = `${data.first_name || 'Bilinmeyen'} ${data.last_name || ''}`.trim();
        membersList.push(fullName);
      });

      setMembers(membersList);
    } catch (error) {
      console.error('Üyeler getirilirken hata oluştu:', error);
    }
  };

  const checkMembershipStatus = async () => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        setIsMember(userData.community_member === true);
      }
    } catch (error) {
      console.error('Üyelik durumu kontrol edilirken hata oluştu:', error);
    }
  };

  useEffect(() => {
    fetchMembers();
    checkMembershipStatus();
  }, [currentUser]);

  return (
    <div className="communities-page">
      <div className="container">
        <h2 className="page-title">Topluluğumuz</h2>

        <div className="single-community-card">
          <h3>{community.name}</h3>
          <p>{community.description}</p>

          {!isMember && (
            <>
              {!showForm ? (
                <button className="join-button" onClick={handleJoinClick}>
                  Katıl
                </button>
              ) : (
                <form className="join-form" onSubmit={handleSubmit}>
                  <input
                    type="text"
                    placeholder="Adınız"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Soyadınız"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                  <div className="form-buttons">
                    <button type="submit" className="submit-button">Gönder</button>
                    <button type="button" className="cancel-button" onClick={() => setShowForm(false)}>İptal</button>
                  </div>
                </form>
              )}
            </>
          )}

          {isMember && (
            <div style={{ marginTop: '20px' }}>
              <button
                className="join-button"
                onClick={() => navigate('/chat')}
              >
                Mesajlaşmaya Başla
              </button>
            </div>
          )}

          {members.length > 0 && (
            <div className="members-list">
              <h4>Katılanlar:</h4>
              <ul>
                {members.map((member, index) => (
                  <li key={index}>{member}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;
