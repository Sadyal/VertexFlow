import React, { memo } from 'react';
import { Copy, ArrowRight } from 'lucide-react';

const AIMessage = memo(({ message, onInsert }) => {
  const isUser = message.role === 'user';
  const timeStr = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  // Helper to escape raw HTML tags before custom markdown rendering to block XSS attacks
  const escapeHtml = (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  // Simple Markdown Formatter (Lightweight regex based)
  const formatContent = (text) => {
    if (!text) return null;
    
    // Handle Code Blocks
    const parts = text.split(/```/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) { // Inside code block
        const lines = part.split('\n');
        const lang = lines[0].trim();
        const code = lines.slice(1).join('\n').trim();
        return (
          <pre key={i} style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', overflowX: 'auto', margin: '8px 0', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
            <code style={{ color: 'var(--accent-primary)' }}>{code}</code>
          </pre>
        );
      }
      
      // Handle Inline Code and Bold in regular text safely by escaping raw HTML tags first
      const escapedPart = escapeHtml(part);
      return (
        <span key={i} dangerouslySetInnerHTML={{ 
          __html: escapedPart
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code style="background: rgba(99, 102, 241, 0.1); color: var(--accent-primary); padding: 2px 4px; border-radius: 4px;">$1</code>')
            .replace(/\n/g, '<br/>')
        }} />
      );
    });
  };

  return (
    <div className={`ai-message ${isUser ? 'user' : 'assistant'}`}>
      <div className="ai-message-bubble">
        <div className="ai-message-text">
          {formatContent(message.content)}
        </div>
        {!isUser && (
          <div className="ai-result-actions" style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
            {onInsert && (
              <button 
                onClick={() => onInsert(message.content)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: 0 }}
              >
                <ArrowRight size={14} /> Insert
              </button>
            )}
            <button 
              onClick={() => navigator.clipboard.writeText(message.content)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: 0 }}
            >
              <Copy size={14} /> Copy
            </button>
          </div>
        )}
      </div>
      <span className="ai-message-time">{timeStr}</span>
    </div>
  );
});

export default AIMessage;
