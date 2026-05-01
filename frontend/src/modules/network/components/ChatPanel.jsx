import { useState, useEffect, useRef } from 'react';
import { Send, X, User } from 'lucide-react';
import { networkApi } from '../network.api';
// 🧠 Simple in-memory cache for instant switching
const chatCache = {};

const ChatPanel = ({ friend, onClose, currentUser, isOnline, socket }) => {
  const [messages, setMessages] = useState(chatCache[friend._id] || []);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(!chatCache[friend._id]);
  const [localOnline, setLocalOnline] = useState(isOnline);
  const scrollRef = useRef();

  // Handle prop changes for online status
  useEffect(() => {
    setLocalOnline(isOnline);
  }, [isOnline]);

  // ==========================================
  // INITIALIZATION & HISTORY
  // ==========================================
  useEffect(() => {
    const fetchHistory = async () => {
      // If we have cache, don't show full-page loader, just fetch silently
      if (!chatCache[friend._id]) {
        setIsLoading(true);
      }

      try {
        const response = await networkApi.getChatHistory(friend._id);
        if (response.success) {
          setMessages(response.data);
          chatCache[friend._id] = response.data; // Update cache
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [friend._id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const content = newMessage.trim();
    
    // 🚀 Optimistic Update: Add message instantly
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      content: content,
      sender: currentUser.id || currentUser._id,
      recipient: friend._id,
      createdAt: new Date().toISOString(),
      isTemp: true
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    socket.emit('private-message', {
      recipientId: friend._id,
      content: content
    });
  };

  // Update Socket Listener to handle optimistic sync
  useEffect(() => {
    if (!socket) return;

    socket.on('receive-message', (message) => {
      const msgSenderId = (message.sender._id || message.sender).toString();
      const currentId = (currentUser.id || currentUser._id).toString();
      const isFromMe = msgSenderId === currentId;

      setMessages(prev => {
        // 1. If it's my own message, try to replace a temp one
        if (isFromMe) {
          const tempIndex = prev.findIndex(m => m.isTemp && m.content === message.content);
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = message;
            return updated;
          }
        }

        // 2. Prevent duplicate by ID (if it's already there)
        if (prev.some(m => m._id === message._id)) {
          return prev;
        }

        // 3. Only append if it belongs to this conversation
        const isThisConversation = 
          msgSenderId.toString() === friend._id.toString() || 
          (message.recipient._id || message.recipient).toString() === friend._id.toString();

        if (isThisConversation) {
          return [...prev, message];
        }
        
        return prev;
      });
    });

    return () => socket.off('receive-message');
  }, [socket, friend._id, currentUser]);

  return (
    <div className="chat-panel glass-panel animate-slide-up">
      <div className="chat-header">
        <div className="chat-user">
          {friend.avatar ? (
            <img src={friend.avatar} alt={friend.name} className="chat-avatar" />
          ) : (
            <div className="chat-initials">{friend.name.charAt(0).toUpperCase()}</div>
          )}
          <div className="chat-user-info">
            <h4>{friend.name}</h4>
            <span className={localOnline ? 'online' : 'offline'}>
              {localOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <button className="close-chat" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="chat-messages">
        {isLoading ? (
          <div className="chat-loader">Loading conversation...</div>
        ) : (
          messages.map((msg, index) => {
            const isMe = (msg.sender._id || msg.sender).toString() === (currentUser.id || currentUser._id).toString();
            return (
              <div key={msg._id || index} className={`message-wrapper ${isMe ? 'me' : 'them'} ${msg.isTemp ? 'is-temp' : ''}`}>
                <div className="message-bubble">
                  {msg.content}
                </div>
                <span className="message-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" disabled={!newMessage.trim()} className="send-btn">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
