import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minus, Sparkles, MessageSquare } from 'lucide-react';
import { 
  $getSelection, 
  $isRangeSelection, 
  $getRoot, 
  $createParagraphNode, 
  $createTextNode,
  $createLineBreakNode 
} from 'lexical';
import api from '../../utils/axios';
import AIMessage from './AIMessage';
import AIInput from './AIInput';

const AIChatPanel = ({ editorInstance, isOpen, isMinimized, onClose, onMinimize }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);
  const panelRef = useRef(null);

  // Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-scroll
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, isMinimized]);

  const getContext = useCallback(() => {
    if (!editorInstance) return '';
    let text = '';
    editorInstance.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        text = selection.getTextContent();
      }
      if (!text) {
        const root = editorInstance.getEditorState()._nodeMap.get('root');
        if (root) text = root.getTextContent();
      }
    });
    return text.slice(0, 10000); // Max 10k chars for performance
  }, [editorInstance]);

  const insertText = useCallback((text) => {
    if (!editorInstance) return;
    
    editorInstance.focus();

    editorInstance.update(() => {
      const selection = $getSelection();
      const root = $getRoot();
      
      // Parse markdown-like syntax into Lexical nodes
      const createNodesFromMarkdown = (rawText) => {
        const paragraphs = rawText.split('\n\n');
        return paragraphs.map(p => {
          const paragraphNode = $createParagraphNode();
          
          // Handle Bold (Simple regex based parsing)
          const parts = p.split(/(\*\*.*?\*\*)/g);
          parts.forEach(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const boldText = part.slice(2, -2);
              const textNode = $createTextNode(boldText);
              textNode.setFormat('bold');
              paragraphNode.append(textNode);
            } else {
              // Handle newlines within paragraphs
              const lines = part.split('\n');
              lines.forEach((line, idx) => {
                if (line) paragraphNode.append($createTextNode(line));
                if (idx < lines.length - 1) paragraphNode.append($createLineBreakNode());
              });
            }
          });
          return paragraphNode;
        });
      };

      const nodes = createNodesFromMarkdown(text);

      if ($isRangeSelection(selection)) {
        selection.insertNodes(nodes);
      } else {
        nodes.forEach(node => root.append(node));
      }
    }, { tag: 'ai-insert' });
  }, [editorInstance]);

  const detectContextIntent = (query) => {
    const q = query.toLowerCase();
    // Keywords that strongly imply document context is needed
    const contextKeywords = [
      'this', 'document', 'doc', 'text', 'selected', 'paragraph', 'here', 
      'summarize', 'rewrite', 'improve', 'grammar', 'fix', 'conclusion', 
      'intro', 'formal', 'professional', 'tone'
    ];
    return contextKeywords.some(word => q.includes(word));
  };

  const [abortController, setAbortController] = useState(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // Cancel previous request if any
    if (abortController) abortController.abort();
    const controller = new AbortController();
    setAbortController(controller);

    const userMessage = { id: Date.now(), role: 'user', content: input.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Placeholder for AI response
    const aiMessageId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    }]);

    try {
      const hasIntent = detectContextIntent(userMessage.content);
      let context = '';
      
      if (hasIntent && editorInstance) {
        editorInstance.getEditorState().read(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            context = selection.getTextContent();
          }
          if (!context) {
            const root = editorInstance.getEditorState()._nodeMap.get('root');
            if (root) context = root.getTextContent();
          }
        });
        context = context.slice(0, 15000);
      }

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // 🚀 CRITICAL for cookie-based auth
        body: JSON.stringify({ context, query: userMessage.content, stream: true }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                fullContent += data.content;
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId ? { ...msg, content: fullContent } : msg
                ));
              }
              if (data.error) throw new Error(data.error);
            } catch (e) {
              console.error("Parse error", e);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: `Error: ${err.message || "Could not connect to AI service."}` } 
          : msg
      ));
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setIsLoading(false);
    }
  };

  return (
    <>
      <div 
        className={`ai-chat-panel-overlay ${isOpen && !isMinimized ? 'is-visible' : ''}`} 
        onClick={onClose} 
      />
      
      <div 
        ref={panelRef}
        className={`ai-chat-panel ${isOpen ? 'is-open' : ''} ${isMinimized ? 'is-minimized' : ''}`}
      >
        <div className="ai-panel-header">
          <div className="ai-panel-title">
            <Sparkles size={18} className="text-accent" />
            <span>VertexFlow AI</span>
          </div>
          <div className="ai-panel-controls">
            {isLoading && (
              <button className="ai-icon-btn text-warning" onClick={handleStop} title="Stop Generation">
                <div style={{ width: 12, height: 12, background: 'currentColor', borderRadius: 2 }} />
              </button>
            )}
            <button className="ai-icon-btn" onClick={onMinimize} title="Minimize">
              <Minus size={18} />
            </button>
            <button className="ai-icon-btn" onClick={onClose} title="Close (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="ai-chat-messages">
          {messages.length === 0 ? (
            <div className="ai-chat-empty">
              <div className="ai-chat-empty-icon">
                <MessageSquare size={24} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>How can I help?</p>
                <p style={{ fontSize: '0.85rem' }}>Select text in your editor to give me context, or just ask a question.</p>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <AIMessage key={msg.id} message={msg} onInsert={insertText} />
            ))
          )}
          
          {isLoading && (
            <div className="ai-typing-indicator">
              <div className="ai-typing-dot"></div>
              <div className="ai-typing-dot"></div>
              <div className="ai-typing-dot"></div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <AIInput 
          value={input}
          onChange={setInput}
          onSend={handleSend}
          isLoading={isLoading}
        />
      </div>
    </>
  );
};

export default AIChatPanel;
