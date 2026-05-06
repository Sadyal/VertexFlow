import React, { memo, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

const AIInput = memo(({ value, onChange, onSend, isLoading }) => {
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  return (
    <div className="ai-chat-input-area">
      <div className="ai-input-wrapper">
        <textarea
          ref={textareaRef}
          className="ai-textarea"
          placeholder="Ask AI anything..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={1}
        />
        <button 
          className="ai-send-btn" 
          onClick={onSend}
          disabled={!value.trim() || isLoading}
          title="Send (Enter)"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
});

export default AIInput;
