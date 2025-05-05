import React, { useEffect, useState } from 'react';
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
  addDoc
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
  const db = getFirestore();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Kullanıcıları getir
  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'), where('community_member', '==', true));
      const snapshot = await getDocs(q);
      const userList = [];

      snapshot.forEach(doc => {
        if (doc.id !== currentUser.uid) {
          userList.push({ uid: doc.id, ...doc.data() });
        }
      });

      setUsers(userList);
      setFilteredUsers(userList);
    };

    if (currentUser) fetchUsers();
  }, [currentUser]);

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

  // Mesajları getir
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
      const messagesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          from: data.senderId,
          to: data.groupId || data.receiverId,
          text: data.message,
          timestamp: data.timestamp
        };
      });

      messagesData.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(messagesData);
    };

    fetchMessages();
  }, [currentUser, selectedUser, selectedGroup]);

  // Mesaj gönder
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    let newMessage;

    if (selectedUser) {
      const roomId = [currentUser.uid, selectedUser.uid].sort().join('_');
      newMessage = {
        roomId,
        senderId: currentUser.uid,
        message: text,
        timestamp: Date.now()
      };
    } else if (selectedGroup) {
      newMessage = {
        groupId: selectedGroup.id,
        senderId: currentUser.uid,
        message: text,
        timestamp: Date.now()
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
        text
      }
    ]);

    sendMessage(newMessage);
  };

  const handleTyping = () => {
    if (!selectedUser) return;

    const roomId = [currentUser.uid, selectedUser.uid].sort().join('_');
    sendTyping(roomId, currentUser.uid);
  };

  return (
    <div className="chat-page">
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
      />

      <div className="chat-section">
        {(selectedUser || selectedGroup) ? (
          <>
            <MessageWindow
              messages={messages}
              selectedUser={selectedUser}
              selectedGroup={selectedGroup}
            />
            {typingUser && selectedUser && (
              <p>{selectedUser.name} yazıyor...</p>
            )}
            <MessageInput
              onSend={handleSendMessage}
              onTyping={handleTyping}
              isGroup={!!selectedGroup}
              groupId={selectedGroup?.id}
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
