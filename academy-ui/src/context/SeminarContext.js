import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  getSeminars,
  getUpcomingSeminars,
  getPastSeminars
} from '../components/services/seminarService';
import { auth } from '../components/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const SeminarContext = createContext();

export const useSeminarContext = () => useContext(SeminarContext);

export const SeminarProvider = ({ children }) => {
  const [seminars, setSeminars] = useState([]);
  const [upcomingSeminars, setUpcomingSeminars] = useState([]);
  const [pastSeminars, setPastSeminars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchSeminars = async () => {
    try {
      setLoading(true);
      
      // Tüm sorguları paralel olarak çalıştır
      const [allSeminarsData, upcomingSeminarsData, pastSeminarsData] = await Promise.all([
        getSeminars(),
        getUpcomingSeminars(),
        getPastSeminars()
      ]);
      
      console.log("Tüm seminerler:", allSeminarsData);
      console.log("Yaklaşan seminerler:", upcomingSeminarsData);
      console.log("Geçmiş seminerler:", pastSeminarsData);
      
      setSeminars(allSeminarsData || []);
      setUpcomingSeminars(upcomingSeminarsData || []);
      setPastSeminars(pastSeminarsData || []);
      setError(null);
    } catch (err) {
      console.error("Seminerler yüklenirken hata:", err);
      setError('Seminerler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeminars();
  }, []);

  const refreshSeminars = async () => {
    console.log("Seminerler yenileniyor...");
    await fetchSeminars();
    console.log("Seminerler yenilendi. Yeni durumlar:", {
      tümSeminerler: seminars.length,
      yaklaşanSeminerler: upcomingSeminars.length,
      geçmişSeminerler: pastSeminars.length
    });
  };

  const value = {
    seminars,
    upcomingSeminars,
    pastSeminars,
    loading,
    error,
    currentUser,
    refreshSeminars
  };

  return (
    <SeminarContext.Provider value={value}>
      {children}
    </SeminarContext.Provider>
  );
};
