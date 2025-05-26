import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatList from '../components/ChatList';
import MessageWindow from '../components/MessageWindow';
import MessageInput from '../components/MessageInput';
import { useAuth } from '../context/AuthContext';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import {
  connectSocket,
  sendMessage,
  disconnectSocket,
  onMessageReceived,
  onTypingReceived,
  sendTyping
} from '../utils/socket';
import './ChatPage.css';

const ChatPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const db = getFirestore();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobil cihaz kontrolü
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
      
      // iOS için viewport düzeltmesi
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        if (isMobileDevice) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
        } else {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
        }
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Viewport meta tag kontrolü ve düzeltmesi
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const newViewport = document.createElement('meta');
      newViewport.name = 'viewport';
      newViewport.content = isMobile 
        ? 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        : 'width=device-width, initial-scale=1.0';
      document.head.appendChild(newViewport);
    }
  }, [isMobile]);

  // Mevcut kullanıcının bilgilerini getir
  useEffect(() => {
    const fetchCurrentUserInfo = async () => {
      if (!currentUser) return;
                      
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
                              
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setCurrentUserInfo({
            uid: currentUser.uid,
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            fullName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
          });
                            
          setIsAdmin(userData.isAdmin || false);
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri getirilirken hata oluştu:', error);
      }
    };

    fetchCurrentUserInfo();
  }, [currentUser, db]);

  // Kullanıcıları getir
  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'), where('community_member', '==', true));
      const snapshot = await getDocs(q);
      const userList = [];
          
      snapshot.forEach(doc => {
        if (doc.id !== currentUser.uid) {
          const userData = doc.data();
          userList.push({
            uid: doc.id,
            ...userData,
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            fullName: `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
          });
        }
      });
          
      setUsers(userList);
      setFilteredUsers(userList);
    };

    if (currentUser) fetchUsers();
  }, [currentUser, db]);

  // Sabit grup verisi
  useEffect(() => {
    if (!currentUser) return;
      
    const defaultGroup = {
      id: 'intellica_group',
      name: 'İntellica Seminer Grubu',
      members: [currentUser.uid]
    };
      
    setGroups([defaultGroup]);
  }, [currentUser]);

  // Arama işlemi
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
      
    if (!query) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  };

  // Socket bağlantısı
  useEffect(() => {
    if (!currentUser) return;

    connectSocket(currentUser.uid);

    onMessageReceived((received) => {
      const isPrivate =
        selectedUser && (received.from === selectedUser.uid || received.to === selectedUser.uid);
      const isGroup =
        selectedGroup && received.groupId === selectedGroup.id;

      if (isPrivate || isGroup) {
        setMessages(prev => [...prev, received]);
      }
    });

    onTypingReceived(({ roomId, senderId }) => {
      if (senderId === selectedUser?.uid) {
        setTypingUser(senderId);
        setTimeout(() => setTypingUser(null), 3000);
      }
    });

    return () => {
      disconnectSocket();
    };
  }, [currentUser, selectedUser, selectedGroup]);

  // Mesajları getir ve kullanıcı bilgilerini ekle
  useEffect(() => {
    const fetchMessages = async () => {
      if (!currentUser) return;

      let q;
      if (selectedUser) {
        const roomId = [currentUser.uid, selectedUser.uid].sort().join('_');
        q = query(collection(db, 'messages'), where('roomId', '==', roomId));
      } else if (selectedGroup) {
        q = query(collection(db, 'messages'), where('groupId', '==', selectedGroup.id));
      } else {
        return;
      }
                      
      const snapshot = await getDocs(q);
      const messagesData = [];
                      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        let senderInfo = null;
                              
        if (data.senderId === currentUser.uid) {
          senderInfo = currentUserInfo;
        } else {
          const senderRef = doc(db, 'users', data.senderId);
          const senderSnap = await getDoc(senderRef);
                                      
          if (senderSnap.exists()) {
            const senderData = senderSnap.data();
            senderInfo = {
              uid: data.senderId,
              firstName: senderData.first_name || '',
              lastName: senderData.last_name || '',
              fullName: `${senderData.first_name || ''} ${senderData.last_name || ''}`.trim()
            };
          }
        }
                              
        messagesData.push({
          from: data.senderId,
          to: data.groupId || data.receiverId,
          text: data.message,
          timestamp: data.timestamp,
          senderInfo: senderInfo
        });
      }
                      
      messagesData.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(messagesData);
    };

    fetchMessages();
  }, [currentUser, selectedUser, selectedGroup, currentUserInfo, db]);

  // Mesaj gönder
  const handleSendMessage = async (text) => {
    if (!text.trim() || !currentUserInfo) return;
              
    let newMessage;
    if (selectedUser) {
      const roomId = [currentUser.uid, selectedUser.uid].sort().join('_');
      newMessage = {
        roomId,
        senderId: currentUser.uid,
        receiverId: selectedUser.uid,
        message: text,
        timestamp: Date.now(),
        senderFirstName: currentUserInfo.firstName,
        senderLastName: currentUserInfo.lastName
      };
    } else if (selectedGroup) {
      newMessage = {
        groupId: selectedGroup.id,
        senderId: currentUser.uid,
        message: text,
        timestamp: Date.now(),
        senderFirstName: currentUserInfo.firstName,
        senderLastName: currentUserInfo.lastName
      };
    } else {
      return;
    }

    try {
      await addDoc(collection(db, 'messages'), newMessage);
    } catch (err) {
      console.error('Mesaj veritabanına kaydedilemedi:', err);
    }

    setMessages(prev => [
      ...prev,
      {
        ...newMessage,
        from: currentUser.uid,
        to: selectedUser?.uid || selectedGroup?.id,
        text,
        senderInfo: currentUserInfo
      }
    ]);
              
    sendMessage(newMessage);
  };

  const handleTyping = () => {
    if (!selectedUser) return;
    const roomId = [currentUser.uid, selectedUser.uid].sort().join('_');
    sendTyping(roomId, currentUser.uid);
  };

  // Seminer oluşturma sayfasına yönlendirme (Admin için)
  const handleStartSeminar = (e) => {
    e.preventDefault(); // Buton tıklama olayını engelle
    if (isAdmin) {
      navigate('/seminar/create');
    } else {
      navigate('/seminar');
    }
  };

  // Seminere katılma sayfasına yönlendirme
  const handleJoinSeminar = (e) => {
    e.preventDefault(); // Buton tıklama olayını engelle
    navigate('/seminar');
  };

  return (
    <div 
      className={`chat-page ${isMobile ? 'mobile' : ''}`}
      style={{ 
        height: isMobile ? '100%' : '100vh',
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <ChatList
        users={filteredUsers}
        groups={groups}
        selectedUser={selectedUser}
        selectedGroup={selectedGroup}
        onSelectUser={(user) => {
          setSelectedUser(user);
          setSelectedGroup(null);
        }}
        onSelectGroup={() => {
          setSelectedGroup({ id: 'intellica_group', name: 'İntellica Seminer Grubu' });
          setSelectedUser(null);
        }}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        isAcademic={isAdmin}
      />
          
      <div className="chat-section">
        {selectedGroup && selectedGroup.id === 'intellica_group' && (
          <div className="seminar-banner">
            <h3>İntellica Seminer Grubu</h3>
            {isAdmin && (
              <button 
                className="start-seminar-button" 
                onClick={handleStartSeminar}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Görüntülü Seminer Başlat
              </button>
            )}
            <button 
              className="join-seminar-button" 
              onClick={handleJoinSeminar}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              Görüntülü Seminere Katıl
            </button>
          </div>
        )}
                      
        {(selectedUser || selectedGroup) ? (
          <>
            <MessageWindow
              messages={messages}
              selectedUser={selectedUser}
              selectedGroup={selectedGroup}
              currentUser={currentUser}
            />
            {typingUser && selectedUser && (
              <p>{selectedUser.fullName} yazıyor...</p>
            )}
            <MessageInput
              onSend={handleSendMessage}
              onTyping={handleTyping}
              isGroup={!!selectedGroup}
              groupId={selectedGroup?.id}
              isMobile={isMobile}
            />
          </>
        ) : (
          <p className="no-user-text">Bir kullanıcı ya da grup seçin.</p>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
