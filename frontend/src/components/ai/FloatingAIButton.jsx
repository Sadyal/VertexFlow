import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import './ai.css';

// Lazy load the chat panel to keep initial bundle size small and prevent editor lag
const AIChatPanel = lazy(() => import('./AIChatPanel'));

const FloatingAIButton = ({ editorInstance }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Ctrl+J shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Mac: Cmd+J, Win: Ctrl+J
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen(prev => {
          if (!prev) setIsMinimized(false);
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  return (
    <>
      {(!isOpen || isMinimized) && (
        <button 
          className={`ai-floating-btn ${!isOpen ? 'idle-pulse' : ''}`} 
          onClick={handleOpen}
          title="Ask AI Assistant (Ctrl+J)"
        >
          <Sparkles size={24} />
        </button>
      )}

      {isOpen && createPortal(
        <Suspense fallback={null}>
          <AIChatPanel 
            editorInstance={editorInstance}
            isOpen={isOpen}
            isMinimized={isMinimized}
            onClose={handleClose}
            onMinimize={handleMinimize}
          />
        </Suspense>,
        document.body
      )}
    </>
  );
};

export default FloatingAIButton;
