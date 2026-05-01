import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { networkApi } from '../network.api';

const chatCache = {};

const ChatPanel = ({ friend, onClose, currentUser, isOnline, socket, isMobile }) => {
  const [messages, setMessages] = useState(chatCache[friend._id] || []);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(!chatCache[friend._id]);
  const [localOnline, setLocalOnline] = useState(isOnline);
  const scrollRef = useRef();

  useEffect(() => { setLocalOnline(isOnline); }, [isOnline]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!chatCache[friend._id]) setIsLoading(true);
      try {
        const response = await networkApi.getChatHistory(friend._id);
        if (response.success) {
          setMessages(response.data);
          chatCache[friend._id] = response.data;
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [friend._id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    const content = newMessage.trim();
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
    socket.emit('private-message', { recipientId: friend._id, content: content });
  };

  useEffect(() => {
    if (!socket) return;
    const handleReceive = (message) => {
      const msgSenderId = (message.sender._id || message.sender).toString();
      const currentId = (currentUser.id || currentUser._id).toString();
      setMessages(prev => {
        if (msgSenderId === currentId) {
          const tempIndex = prev.findIndex(m => m.isTemp && m.content === message.content);
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = message;
            return updated;
          }
        }
        if (prev.some(m => m._id === message._id)) return prev;
        const isThisConversation = msgSenderId === friend._id.toString() || (message.recipient._id || message.recipient).toString() === friend._id.toString();
        return isThisConversation ? [...prev, message] : prev;
      });
    };
    socket.on('receive-message', handleReceive);
    return () => socket.off('receive-message', handleReceive);
  }, [socket, friend._id, currentUser]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* HEADER */}
      <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isMobile && (
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.5rem', marginLeft: '-0.5rem' }}>
              <ArrowLeft size={24} />
            </button>
          )}
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', position: 'relative' }}>
            {friend.avatar ? <img src={friend.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : friend.name.charAt(0).toUpperCase()}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--bg-secondary)', background: localOnline ? '#10b981' : '#6b7280' }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>{friend.name}</h4>
            <span style={{ fontSize: '0.75rem', color: localOnline ? '#10b981' : 'var(--text-muted)' }}>{localOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Loading messages...</div>
        ) : (
          messages.map((msg, index) => {
            const isMe = (msg.sender._id || msg.sender).toString() === (currentUser.id || currentUser._id).toString();
            return (
              <div key={msg._id || index} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ padding: '0.7rem 1rem', borderRadius: '18px', fontSize: '0.92rem', background: isMe ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: isMe ? 'white' : 'var(--text-primary)', borderBottomRightRadius: isMe ? '4px' : '18px', borderBottomLeftRadius: isMe ? '18px' : '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {msg.content}
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem', opacity: 0.8 }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* INPUT */}
      <form onSubmit={handleSend} style={{ padding: '1.25rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '24px', padding: '0.4rem 0.5rem 0.4rem 1.25rem', border: '1px solid var(--border-color)' }}>
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem', padding: '0.4rem 0' }}
            autoFocus
          />
          <button type="submit" disabled={!newMessage.trim()} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: !newMessage.trim() ? 0.5 : 1 }}>
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
