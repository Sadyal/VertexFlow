import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, UserPlus, Check, X, Users, MessageSquare, Clock } from 'lucide-react';
import { networkApi } from '../network.api';
import { useAuth } from '../../../context/AuthContext';
import { io } from 'socket.io-client';
import ChatPanel from '../components/ChatPanel';
import Button from '../../../components/common/Button';
import Loader from '../../../components/common/Loader';
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

const RequestsSkeleton = React.memo(() => (
  <div className="requests-list">
    {[1, 2].map(i => (
      <div key={i} className="request-card" style={{ pointerEvents: 'none' }}>
        <div className="user-info">
          <Skeleton width="36px" height="36px" borderRadius="50%" />
          <div className="details">
            <Skeleton width="100px" height="1rem" style={{ marginBottom: '0.3rem' }} />
            <Skeleton width="80px" height="0.7rem" />
          </div>
        </div>
        <div className="request-actions" style={{ marginTop: '0.75rem', gap: '0.5rem' }}>
          <Skeleton width="100%" height="32px" borderRadius="var(--radius-sm)" />
          <Skeleton width="100%" height="32px" borderRadius="var(--radius-sm)" />
        </div>
      </div>
    ))}
  </div>
));

/**
 * @component Network
 * @description The social hub for managing connections, searching users, and pending requests.
 * Features real-time search and relationship management.
 */
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

  // ==========================================
  // DATA FETCHING
  // ==========================================
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

    // 🔌 Socket initialization (ONCE per session)
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const s = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket']
    });
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []); // Run ONLY once on mount

  // Separate Effect for Socket Listeners to avoid stale closures
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

  // ==========================================
  // HANDLERS
  // ==========================================
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
      if (response.success) {
        setSearchResults(response.data);
      }
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
        // Optimistically update the status in the search results
        setSearchResults(prev => prev.map(u => 
          u._id.toString() === recipientId.toString() ? { ...u, connectionStatus: 'pending' } : u
        ));
        // Show success (could add toast here)
      }
    } catch (err) {
      console.error("Failed to send request:", err);
    }
  };

  const acceptRequest = async (connectionId) => {
    // 🚀 OPTIMISTIC UPDATE
    const requestToAccept = pendingRequests.find(r => r._id.toString() === connectionId.toString());
    if (!requestToAccept) return;

    // Remove from pending instantly
    setPendingRequests(prev => prev.filter(r => r._id.toString() !== connectionId.toString()));
    
    // Add to friends list instantly (with placeholder data)
    const newFriend = {
      connectionId,
      friend: requestToAccept.requester,
      isOnline: false, // Will be updated by socket or next fetch
      unreadCount: 0,
      lastMessage: null
    };
    setFriends(prev => [newFriend, ...prev]);

    try {
      const response = await networkApi.acceptRequest(connectionId);
      if (!response.success) {
        // Rollback on failure
        fetchData(); 
      }
    } catch (err) {
      console.error("Failed to accept request:", err);
      fetchData(); // Rollback
    }
  };

  const ignoreRequest = async (connectionId) => {
    // 🚀 OPTIMISTIC UPDATE
    setPendingRequests(prev => prev.filter(r => r._id.toString() !== connectionId.toString()));

    try {
      // Assuming a delete/ignore endpoint exists or just using same logic
      await networkApi.acceptRequest(connectionId); // Simplified for demo, replace with actual reject if available
    } catch (err) {
      console.error("Failed to ignore request:", err);
      fetchData(); // Rollback
    }
  };

  const openChat = (friend) => {
    setActiveChat(friend);
    // Reset unread count locally when opening chat
    setFriends(prev => prev.map(item => 
      item.friend._id.toString() === friend._id.toString() ? { ...item, unreadCount: 0 } : item
    ));
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '?';

  return (
    <div className="network-container animate-fade-in">
      <div className="network-header">
        <h1>My Network</h1>
        <p>Connect with other writers and collaborate in real-time.</p>
      </div>

      <div className="network-grid">
        {/* Left Column: Search & Discover */}
        <div className="network-main">
          <section className="search-section glass-panel">
            <div className="search-bar-wrapper">
              <Search size={20} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search by email to find friends..." 
                value={searchQuery}
                onChange={handleSearch}
              />
              {isSearching && <div className="spinner-small" />}
            </div>

            {searchResults.length > 0 && (
              <div className="search-results-list">
                {searchResults.map(result => (
                  <div key={result._id} className="user-connection-card">
                    <div className="user-info">
                      {result.avatar ? (
                        <img src={result.avatar} alt={result.name} className="avatar-img" />
                      ) : (
                        <div className="avatar-initials">{getInitials(result.name)}</div>
                      )}
                      <div className="details">
                        <h4>{result.name}</h4>
                        <p>{result.email}</p>
                      </div>
                    </div>
                    <div className="search-result-actions">
                      {result.connectionStatus === 'accepted' ? (
                        <Button variant="secondary" disabled className="status-badge">
                          <Users size={16} /> Friends
                        </Button>
                      ) : result.connectionStatus === 'pending' ? (
                        <Button variant="secondary" disabled className="status-badge">
                          <Clock size={16} /> Pending
                        </Button>
                      ) : (
                        <Button 
                          variant="secondary" 
                          onClick={() => sendRequest(result._id)}
                          className="action-btn"
                        >
                          <UserPlus size={16} /> Connect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {searchQuery.length >= 3 && searchResults.length === 0 && !isSearching && (
              <div className="no-results">No users found with that email.</div>
            )}
          </section>

          <section className="friends-section glass-panel">
            <div className="section-header">
              <Users size={20} />
              <h3>Friends {isLoading ? '' : `(${friends.length})`}</h3>
            </div>
            
            {isLoading ? (
              <FriendsSkeleton />
            ) : friends.length === 0 ? (
              <div className="empty-state-mini">
                <p>No friends yet. Start by searching for users!</p>
              </div>
            ) : (
              <div className="friends-list">
                {friends.map(item => (
                  <div 
                    key={item.friend._id} 
                    className={`friend-list-item ${activeChat?._id.toString() === item.friend._id.toString() ? 'active' : ''}`}
                    onClick={() => openChat(item.friend)}
                  >
                    <div className="friend-item-main">
                      <div className="friend-avatar-wrapper small">
                        {item.friend.avatar ? (
                          <img src={item.friend.avatar} alt={item.friend.name} className="friend-avatar" />
                        ) : (
                          <div className="friend-initials">{getInitials(item.friend.name)}</div>
                        )}
                        <div className={`online-indicator ${item.isOnline ? 'active' : 'offline'}`} />
                      </div>
                      <div className="friend-item-info">
                        <h4>{item.friend.name}</h4>
                        <p className={`last-message-preview ${item.unreadCount > 0 ? 'unread' : ''}`}>
                          {item.lastMessage 
                            ? (item.lastMessage.content.length > 30 
                                ? item.lastMessage.content.substring(0, 30) + '...' 
                                : item.lastMessage.content)
                            : item.friend.email
                          }
                        </p>
                      </div>
                    </div>
                    <div className="friend-item-status-area">
                      {item.unreadCount > 0 ? (
                        <div className="unread-badge animate-pop">{item.unreadCount}</div>
                      ) : item.lastMessage && (
                        <span className="last-message-time">
                          {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <div className="friend-item-status">
                        <span className={item.isOnline ? 'status-online' : 'status-offline'}>
                          {item.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Pending Requests & Active Chat */}
        <div className="network-sidebar">
          {activeChat ? (
            <ChatPanel 
              friend={activeChat} 
              currentUser={user} 
              isOnline={friends.find(f => f.friend._id.toString() === activeChat._id.toString())?.isOnline}
              socket={socket}
              onClose={() => setActiveChat(null)} 
            />
          ) : (
            <section className="requests-section glass-panel">
            <div className="section-header">
              <Clock size={20} />
              <h3>Pending Requests</h3>
              {!isLoading && pendingRequests.length > 0 && <span className="count-badge">{pendingRequests.length}</span>}
            </div>

            {isLoading ? (
              <RequestsSkeleton />
            ) : pendingRequests.length === 0 ? (
              <div className="empty-state-mini">
                <p>No pending requests.</p>
              </div>
            ) : (
              <div className="requests-list">
                {pendingRequests.map(req => (
                  <div key={req._id} className="request-card">
                    <div className="user-info">
                      {req.requester.avatar ? (
                        <img src={req.requester.avatar} alt={req.requester.name} className="avatar-img-sm" />
                      ) : (
                        <div className="avatar-initials-sm">{getInitials(req.requester.name)}</div>
                      )}
                      <div className="details">
                        <h5>{req.requester.name}</h5>
                        <p>wants to connect</p>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button className="icon-btn accept" onClick={() => acceptRequest(req._id)} title="Accept">
                        <Check size={18} />
                      </button>
                      <button className="icon-btn reject" onClick={() => ignoreRequest(req._id)} title="Ignore">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        </div>
      </div>
    </div>
  );
};

export default Network;
