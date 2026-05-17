import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Send, ArrowLeft, MoreHorizontal, Smile, CornerUpLeft, Copy, Trash2, X } from 'lucide-react';
import { networkApi } from '../network.api';

const chatCache = {};

// Helper to parse private reply patterns formatted as: ↳ "quotedText"\nactualMessage
const parseReplyMessage = (content) => {
  if (content && content.startsWith('↳ "')) {
    const newlineIndex = content.indexOf('\n');
    if (newlineIndex !== -1) {
      const replyHeader = content.substring(0, newlineIndex).trim();
      const actualMessage = content.substring(newlineIndex + 1).trim();
      const quotedText = replyHeader.substring(3, replyHeader.length - 1);
      return { isReply: true, quotedText, actualMessage };
    }
  }
  return { isReply: false, actualMessage: content };
};

// ⚡ HIGH-PERFORMANCE MEMOIZED MESSAGE BUBBLE
const MessageItem = memo(({ 
  msg, 
  isMe, 
  currentUser, 
  friend,
  isActive, 
  isEmojiActive, 
  isDropdownActive, 
  isMobile,
  onToggleOptions,
  onAddReaction,
  onRemoveReaction,
  onReply,
  onCopy,
  onDelete
}) => {
  const { isReply, quotedText, actualMessage } = parseReplyMessage(msg.content);

  return (
    <div 
      style={{ 
        alignSelf: isMe ? 'flex-end' : 'flex-start', 
        maxWidth: isActive ? 'calc(85% - 80px)' : '85%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: isMe ? 'flex-end' : 'flex-start',
        position: 'relative',
        transition: 'max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Bubble and Actions Flex Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
        
        {/* Message Bubble Container */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggleOptions(msg._id);
          }}
          style={{ 
            padding: '0.7rem 1rem', 
            borderRadius: '18px', 
            fontSize: '0.92rem', 
            background: isMe ? 'var(--accent-primary)' : 'var(--bg-tertiary)', 
            color: isMe ? 'white' : 'var(--text-primary)', 
            borderBottomRightRadius: isMe ? '4px' : '18px', 
            borderBottomLeftRadius: isMe ? '18px' : '4px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            userSelect: 'none',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            maxWidth: '100%'
          }}
        >
          {isReply && (
            <div style={{
              background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--bg-secondary)',
              color: isMe ? 'rgba(255,255,255,0.9)' : 'var(--text-secondary)',
              padding: '6px 10px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              borderLeft: `3px solid ${isMe ? 'white' : 'var(--accent-primary)'}`,
              marginBottom: '4px',
              fontStyle: 'italic',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '240px'
            }}>
              {quotedText}
            </div>
          )}
          
          <div style={{ wordBreak: 'break-word' }}>{actualMessage}</div>
          
          {/* Floating Instagram Reaction Badge */}
          {msg.reactions && msg.reactions.length > 0 && (
            <div 
              style={{
                position: 'absolute',
                bottom: '-10px',
                [isMe ? 'right' : 'left']: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '2px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '0.75rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                zIndex: 2,
                userSelect: 'none'
              }}
            >
              {msg.reactions.map((react, rIdx) => {
                const isMine = react.user === (currentUser.id || currentUser._id);
                return (
                  <span 
                    key={rIdx}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMine) onRemoveReaction(msg._id);
                    }}
                    title={isMine ? "Click to remove your reaction" : "Reacted by friend"}
                  >
                    {react.emoji}
                  </span>
                );
              })}
            </div>
          )}

          {/* Emoji Reaction Tray Overlays for Mobile */}
          {isMobile && isEmojiActive && (
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: '100%',
                [isMe ? 'right' : 'left']: 0,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '24px',
                padding: '4px 8px',
                display: 'flex',
                gap: '6px',
                boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                zIndex: 10,
                marginBottom: '8px'
              }}
            >
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => onAddReaction(msg._id, emoji)}
                  style={{ background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '2px' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Options Tray (Smile, Arrow, Dots) next to bubble */}
        {isActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
            
            {/* Smile Reaction button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleOptions(msg._id, 'emoji');
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="React"
            >
              <Smile size={16} />
            </button>

            {/* Reply arrow button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onReply(msg);
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="Reply"
            >
              <CornerUpLeft size={16} />
            </button>

            {/* Three dots button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleOptions(msg._id, 'dropdown');
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              title="More options"
            >
              <MoreHorizontal size={16} />
            </button>

            {/* Emoji Reaction Tray Overlays for Desktop */}
            {!isMobile && isEmojiActive && (
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  [isMe ? 'right' : 'left']: 0,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '24px',
                  padding: '4px 8px',
                  display: 'flex',
                  gap: '6px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  marginBottom: '6px'
                }}
              >
                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => onAddReaction(msg._id, emoji)}
                    style={{ background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '2px' }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Action Dropdown Overlays (Copy & Delete) */}
            {isDropdownActive && (
              <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '100%',
                  [isMe ? 'right' : 'left']: 0,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  marginTop: '6px',
                  minWidth: '100px'
                }}
              >
                <button 
                  onClick={() => onCopy(msg.content)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '8px 12px', fontSize: '0.85rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px', width: '100%' }}
                >
                  <Copy size={14} /> Copy
                </button>
                {isMe && (
                  <button 
                    onClick={() => onDelete(msg._id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--error)', padding: '8px 12px', fontSize: '0.85rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '4px', width: '100%' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Timestamp */}
      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem', opacity: 0.8, [isMe ? 'marginRight' : 'marginLeft']: '4px' }}>
        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg === nextProps.msg &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isEmojiActive === nextProps.isEmojiActive &&
    prevProps.isDropdownActive === nextProps.isDropdownActive &&
    prevProps.isMobile === nextProps.isMobile
  );
});

const ChatPanel = ({ friend, onClose, currentUser, isOnline, socket, isMobile }) => {
  const [messages, setMessages] = useState(chatCache[friend._id] || []);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(!chatCache[friend._id]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollRef = useRef();

  // Premium Custom States for Options Drawer, Emoji Picker & Dropdowns
  const [activeMsgOptions, setActiveMsgOptions] = useState(null);
  const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    const fetchHistory = async () => {
      if (!chatCache[friend._id]) setIsLoading(true);
      try {
        const response = await networkApi.getChatHistory(friend._id, 1);
        if (response.success) {
          setMessages(response.data);
          chatCache[friend._id] = response.data;
          if (response.data.length < 50) {
            setHasMore(false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
    
    // Close overlays on chat switch
    setActiveMsgOptions(null);
    setActiveEmojiPicker(null);
    setActiveDropdown(null);
    setReplyingTo(null);
  }, [friend._id]);

  useEffect(() => {
    if (page === 1) {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, page]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const response = await networkApi.getChatHistory(friend._id, nextPage);
      if (response.success) {
        const olderMessages = response.data;
        if (olderMessages.length < 50) {
          setHasMore(false);
        }
        setMessages(prev => [...olderMessages, ...prev]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    
    let content = newMessage.trim();
    if (replyingTo) {
      // Quoted text representation
      const replyingToText = replyingTo.content.startsWith('↳ "') 
        ? parseReplyMessage(replyingTo.content).actualMessage
        : replyingTo.content;
      
      content = `↳ "${replyingToText.substring(0, 50)}"\n${content}`;
    }

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
    setReplyingTo(null);
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

  useEffect(() => {
    if (!socket) return;
    const handleReceiveReaction = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    };
    socket.on('receive-message-reaction', handleReceiveReaction);
    return () => socket.off('receive-message-reaction', handleReceiveReaction);
  }, [socket]);

  // Emojis handlers (optimised with useCallback)
  const handleAddReaction = useCallback((msgId, emoji) => {
    if (socket) {
      socket.emit('message-reaction', { 
        messageId: msgId, 
        recipientId: friend._id, 
        emoji: emoji 
      });
    }
    setActiveEmojiPicker(null);
    setActiveMsgOptions(null);
  }, [socket, friend._id]);

  const handleRemoveReaction = useCallback((msgId) => {
    if (socket) {
      socket.emit('message-reaction', { 
        messageId: msgId, 
        recipientId: friend._id, 
        emoji: null 
      });
    }
  }, [socket, friend._id]);

  // Copy handler (optimised with useCallback)
  const handleCopyMessage = useCallback((content) => {
    const { actualMessage } = parseReplyMessage(content);
    navigator.clipboard.writeText(actualMessage);
    setActiveDropdown(null);
    setActiveMsgOptions(null);
  }, []);

  // Delete handler (optimised with useCallback)
  const handleDeleteMessage = useCallback((msgId) => {
    setMessages(prev => prev.filter(m => m._id !== msgId));
    setActiveDropdown(null);
    setActiveMsgOptions(null);
  }, []);

  // Toggle handlers (optimised with useCallback)
  const handleToggleOptions = useCallback((msgId, type = null) => {
    setActiveMsgOptions(prev => prev === msgId && !type ? null : msgId);
    if (type === 'emoji') {
      setActiveEmojiPicker(prev => prev === msgId ? null : msgId);
      setActiveDropdown(null);
    } else if (type === 'dropdown') {
      setActiveDropdown(prev => prev === msgId ? null : msgId);
      setActiveEmojiPicker(null);
    } else {
      setActiveEmojiPicker(null);
      setActiveDropdown(null);
    }
  }, []);

  return (
    <div 
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', position: 'relative' }}
      onClick={() => {
        setActiveMsgOptions(null);
        setActiveEmojiPicker(null);
        setActiveDropdown(null);
      }}
    >
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
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--bg-secondary)', background: isOnline ? '#10b981' : '#6b7280' }} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>{friend.name}</h4>
            <span style={{ fontSize: '0.75rem', color: isOnline ? '#10b981' : 'var(--text-muted)' }}>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Loading messages...</div>
        ) : (
          <>
            {hasMore && (
              <button 
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                style={{
                  alignSelf: 'center',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--accent-primary)',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  marginBottom: '1rem',
                  outline: 'none'
                }}
              >
                {isLoadingMore ? 'Loading older messages...' : 'Load Older Messages'}
              </button>
            )}

            {messages.map((msg, index) => {
              const isMe = (msg.sender._id || msg.sender).toString() === (currentUser.id || currentUser._id).toString();

              return (
                <MessageItem
                  key={msg._id || index}
                  msg={msg}
                  isMe={isMe}
                  currentUser={currentUser}
                  friend={friend}
                  isActive={activeMsgOptions === msg._id}
                  isEmojiActive={activeEmojiPicker === msg._id}
                  isDropdownActive={activeDropdown === msg._id}
                  isMobile={isMobile}
                  onToggleOptions={handleToggleOptions}
                  onAddReaction={handleAddReaction}
                  onRemoveReaction={handleRemoveReaction}
                  onReply={setReplyingTo}
                  onCopy={handleCopyMessage}
                  onDelete={handleDeleteMessage}
                />
              );
            })}
          </>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Reply Preview Bar above Input Box */}
      {replyingTo && (
        <div style={{
          padding: '0.6rem 1.25rem',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '3px solid var(--accent-primary)', paddingLeft: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
              Replying to {replyingTo.sender === (currentUser.id || currentUser._id) ? 'yourself' : friend.name}
            </span>
            <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {replyingTo.content.startsWith('↳ "') ? parseReplyMessage(replyingTo.content).actualMessage : replyingTo.content}
            </span>
          </div>
          <button 
            onClick={() => setReplyingTo(null)} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* CHAT INPUT FORM */}
      <form onSubmit={handleSend} style={{ padding: '1.25rem', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '24px', padding: '0.4rem 0.5rem 0.4rem 1.25rem', border: '1px solid var(--border-color)' }}>
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem', padding: '0.4rem 0' }}
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
