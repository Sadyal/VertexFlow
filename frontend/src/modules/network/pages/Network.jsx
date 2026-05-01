import React, { useState, useEffect } from 'react';
import { Search, Check, X, Users, MessageSquare, Clock, UserPlus } from 'lucide-react';
import { networkApi } from '../network.api';
import { useAuth } from '../../../context/AuthContext';
import { io } from 'socket.io-client';
import ChatPanel from '../components/ChatPanel';
import Skeleton from '../../../components/common/Skeleton';
import '../NetworkUI.css';

const FriendsSkeleton = React.memo(() => (
  <div className="friends-list">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="friend-list-item" style={{ cursor: 'default', pointerEvents: 'none' }}>
        <div className="friend-item-main">
          <div className="friend-avatar-wrapper small">
            <Skeleton width="48px" height="48px" borderRadius="50%" />
          </div>
          <div className="friend-item-info">
            <Skeleton width="120px" height="1.1rem" style={{ marginBottom: '0.4rem' }} />
            <Skeleton width="180px" height="0.8rem" />
          </div>
        </div>
      </div>
    ))}
  </div>
));

const Network = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [socket, setSocket] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'discover' | 'requests'

  const fetchData = async () => {
    try {
      const [requestsRes, friendsRes] = await Promise.all([
        networkApi.getPendingRequests(),
        networkApi.getFriends()
      ]);
      if (requestsRes.success) setPendingRequests(requestsRes.data);
      if (friendsRes.success) setFriends(friendsRes.data);
    } catch (err) {
      console.error("Failed to fetch network data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const s = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket']
    });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('presence-update', ({ userId, isOnline }) => {
      setFriends(prev => prev.map(item => 
        item.friend._id.toString() === userId.toString() ? { ...item, isOnline } : item
      ));
    });

    socket.on('receive-message', (message) => {
      const senderId = (message.sender._id || message.sender).toString();
      const recipientId = (message.recipient._id || message.recipient).toString();
      const currentUserId = (user.id || user._id).toString();
      const otherPersonId = senderId === currentUserId ? recipientId : senderId;

      setFriends(prev => prev.map(item => {
        if (item.friend._id.toString() === otherPersonId.toString()) {
          const isNewIncoming = senderId !== currentUserId && (!activeChat || activeChat._id !== senderId);
          return { 
            ...item, 
            unreadCount: isNewIncoming ? (item.unreadCount || 0) + 1 : item.unreadCount,
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              sender: message.sender
            }
          };
        }
        return item;
      }));
    });

    return () => {
      socket.off('presence-update');
      socket.off('receive-message');
    };
  }, [socket, activeChat, user]);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await networkApi.searchUsers(query);
      if (response.success) setSearchResults(response.data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequest = async (recipientId) => {
    try {
      const response = await networkApi.sendRequest(recipientId);
      if (response.success) {
        setSearchResults(prev => prev.map(u => 
          u._id.toString() === recipientId.toString() ? { ...u, connectionStatus: 'pending' } : u
        ));
      }
    } catch (err) {
      console.error("Failed to send request:", err);
    }
  };

  const acceptRequest = async (connectionId) => {
    const requestToAccept = pendingRequests.find(r => r._id === connectionId);
    if (!requestToAccept) return;
    setPendingRequests(prev => prev.filter(r => r._id !== connectionId));
    setFriends(prev => [{ friend: requestToAccept.requester, isOnline: false, unreadCount: 0, lastMessage: null }, ...prev]);
    try {
      await networkApi.acceptRequest(connectionId);
    } catch (err) {
      fetchData();
    }
  };

  const ignoreRequest = async (connectionId) => {
    setPendingRequests(prev => prev.filter(r => r._id !== connectionId));
    try {
      await networkApi.acceptRequest(connectionId); 
    } catch (err) {
      fetchData();
    }
  };

  const openChat = (friend) => {
    setActiveChat(friend);
    setShowMobileChat(true);
    setFriends(prev => prev.map(item => 
      item.friend._id.toString() === friend._id.toString() ? { ...item, unreadCount: 0 } : item
    ));
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '?';

  return (
    <div className="network-container animate-fade-in">
      <div className="messenger-container" style={{ 
        '--sidebar-display': showMobileChat ? 'none' : 'flex',
        '--chat-display': showMobileChat ? 'flex' : 'none'
      }}>
        {/* SIDEBAR */}
        <div className="messenger-sidebar">

          {/* Sidebar Header with Tabs */}
          <div style={{ padding: '0.75rem 1rem 0 1rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>

            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>Network</h2>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '-1px' }}>
              <button 
                onClick={() => setActiveTab('chats')}
                style={{ 
                  flex: 1, padding: '0.75rem 0', border: 'none', background: 'transparent', cursor: 'pointer',
                  color: activeTab === 'chats' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${activeTab === 'chats' ? 'var(--accent-primary)' : 'transparent'}`,
                  fontWeight: activeTab === 'chats' ? '600' : '400', transition: 'all 0.2s'
                }}
              >
                Chats
              </button>
              <button 
                onClick={() => setActiveTab('discover')}
                style={{ 
                  flex: 1, padding: '0.75rem 0', border: 'none', background: 'transparent', cursor: 'pointer',
                  color: activeTab === 'discover' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${activeTab === 'discover' ? 'var(--accent-primary)' : 'transparent'}`,
                  fontWeight: activeTab === 'discover' ? '600' : '400', transition: 'all 0.2s'
                }}
              >
                Discover
              </button>
              <button 
                onClick={() => setActiveTab('requests')}
                style={{ 
                  flex: 1, padding: '0.75rem 0', border: 'none', background: 'transparent', cursor: 'pointer',
                  color: activeTab === 'requests' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${activeTab === 'requests' ? 'var(--accent-primary)' : 'transparent'}`,
                  fontWeight: activeTab === 'requests' ? '600' : '400', transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                Requests
                {pendingRequests.length > 0 && (
                  <span style={{ 
                    position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', 
                    background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '10px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {/* CHATS TAB */}
            {activeTab === 'chats' && (
              <div className="friends-list">
                {isLoading ? <FriendsSkeleton /> : friends.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)' }}>
                    <Users size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>No contacts yet.</p>
                  </div>
                ) : (
                  friends.map(item => (
                    <div key={item.friend._id} className={`friend-list-item ${activeChat?._id === item.friend._id ? 'active' : ''}`} onClick={() => openChat(item.friend)} style={{ padding: '0.75rem' }}>
                      <div className="friend-item-main">
                        <div className="friend-avatar-wrapper small" style={{ width: '40px', height: '40px' }}>
                          {item.friend.avatar ? <img src={item.friend.avatar} alt={item.friend.name} className="friend-avatar" /> : <div className="friend-initials" style={{ fontSize: '0.8rem' }}>{getInitials(item.friend.name)}</div>}
                          <div className={`online-indicator ${item.isOnline ? 'active' : 'offline'}`} />
                        </div>
                        <div className="friend-item-info">
                          <h4 style={{ fontSize: '0.9rem' }}>{item.friend.name}</h4>
                          <p className={`last-message-preview ${item.unreadCount > 0 ? 'unread' : ''}`} style={{ fontSize: '0.75rem' }}>
                            {item.lastMessage?.content || item.friend.email}
                          </p>
                        </div>
                      </div>
                      {item.unreadCount > 0 && <div className="unread-badge animate-pop">{item.unreadCount}</div>}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* DISCOVER TAB */}
            {activeTab === 'discover' && (
              <div>
                <div className="search-bar-wrapper" style={{ marginBottom: '1.5rem' }}>
                  <Search size={18} className="search-icon" />
                  <input type="text" placeholder="Search by email..." value={searchQuery} onChange={handleSearch} />
                </div>
                
                {isSearching ? <div style={{ textAlign: 'center', padding: '1rem' }}><div className="spinner-small" /></div> : (
                  <div className="search-results-list">
                    {searchResults.map(result => (
                      <div key={result._id} className="user-connection-card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                        <div className="user-info" style={{ gap: '0.75rem' }}>
                          <div className="avatar-initials-sm">{getInitials(result.name)}</div>
                          <div className="details">
                            <h4 style={{ fontSize: '0.9rem' }}>{result.name}</h4>
                            <p style={{ fontSize: '0.7rem' }}>{result.email}</p>
                          </div>
                        </div>
                        <div className="search-result-actions" style={{ marginLeft: 'auto' }}>
                          {result.connectionStatus === 'accepted' ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Friends</span>
                          ) : result.connectionStatus === 'pending' ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pending</span>
                          ) : (
                            <button className="icon-btn accept" onClick={() => sendRequest(result._id)} style={{ padding: '0.4rem' }}>
                              <UserPlus size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {searchQuery.length >= 3 && searchResults.length === 0 && (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No users found.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* REQUESTS TAB */}
            {activeTab === 'requests' && (
              <div className="requests-list">
                {pendingRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-muted)' }}>
                    <Clock size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>No pending requests.</p>
                  </div>
                ) : (
                  pendingRequests.map(req => (
                    <div key={req._id} className="request-card" style={{ padding: '0.75rem', marginBottom: '0.75rem' }}>
                      <div className="user-info" style={{ gap: '0.75rem' }}>
                        <div className="avatar-initials-sm">{getInitials(req.requester.name)}</div>
                        <div className="details">
                          <h5 style={{ fontSize: '0.9rem' }}>{req.requester.name}</h5>
                          <p style={{ fontSize: '0.7rem' }}>Wants to connect</p>
                        </div>
                      </div>
                      <div className="request-actions" style={{ margin: 0, marginLeft: 'auto', gap: '0.5rem' }}>
                        <button className="icon-btn accept" onClick={() => acceptRequest(req._id)}><Check size={14} /></button>
                        <button className="icon-btn reject" onClick={() => ignoreRequest(req._id)}><X size={14} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="messenger-chat-area">
          {activeChat ? (
            <ChatPanel 
              friend={activeChat} 
              currentUser={user} 
              isOnline={friends.find(f => f.friend._id === activeChat._id)?.isOnline}
              socket={socket}
              onClose={() => { setActiveChat(null); setShowMobileChat(false); }} 
              isMobile={showMobileChat}
            />
          ) : (
            <div className="chat-placeholder">
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', 
                background: 'rgba(255,255,255,0.03)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)'
              }}>
                <MessageSquare size={32} strokeWidth={1} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Select a Friend</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pick a contact from the left to start chatting.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};


export default Network;
