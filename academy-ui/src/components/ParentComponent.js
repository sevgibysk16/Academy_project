import React, { useState, useEffect } from 'react';
import ChatList from './ChatList';
import { auth, firestore } from './firebase'; // Adjust import based on your setup

const ParentComponent = () => {
  // Other state and logic...
  const [currentUser, setCurrentUser] = useState(null);
  const [isAcademic, setIsAcademic] = useState(false);
  
  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Get user data from Firestore (adjust path as needed)
          const userDoc = await firestore.collection('users').doc(user.uid).get();
          const userData = userDoc.data();
          console.log("User data from Firestore:", userData);
          
          // Check if user is academic - adjust field names based on your database structure
          const academic = 
            userData?.role === 'academic' || 
            userData?.userType === 'academic' ||
            userData?.isAcademic === true;
          
          setCurrentUser(userData);
          setIsAcademic(academic);
          console.log("Is academic:", academic);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setCurrentUser(null);
        setIsAcademic(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  return (
    <div className="app-container">
      {/* Display debug info */}
      <div style={{padding: '10px', background: '#f0f0f0', margin: '10px 0'}}>
        Debug: User: {currentUser ? JSON.stringify(currentUser) : 'Not logged in'} | 
        Is Academic: {isAcademic ? 'Yes' : 'No'}
      </div>
      
      <ChatList
        users={users}
        selectedUser={selectedUser}
        selectedGroup={selectedGroup}
        onSelectUser={handleSelectUser}
        onSelectGroup={handleSelectGroup}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        activeSeminars={activeSeminars}
        isAcademic={isAcademic} // Pass the determined academic status
      />
      {/* Other components */}
    </div>
  );
};

export default ParentComponent;
