import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Copy, RefreshCw, Send, ArrowRight } from 'lucide-react';
import { $getSelection, $isRangeSelection } from 'lexical';
import './AICopilot.css';
import api from '../../../utils/axios';

const AICopilot = ({ editorInstance }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [actionType, setActionType] = useState('chat'); // chat, summarize, improve
  
  const endRef = useRef(null);

  // Scroll to bottom when result changes
  useEffect(() => {
    if (result && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result, isLoading]);

  const getEditorText = () => {
    if (!editorInstance) return '';
    let text = '';
    editorInstance.getEditorState().read(() => {
      const root = editorInstance.getEditorState()._nodeMap.get('root');
      if (root) {
        text = root.getTextContent();
      }
    });
    return text;
  };

  const getSelectedText = () => {
    if (!editorInstance) return '';
    let text = '';
    editorInstance.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        text = selection.getTextContent();
      }
    });
    return text;
  };

  const executeAction = async (type, customPrompt = '') => {
    if (isLoading) return;
    setIsLoading(true);
    setResult(null);
    setActionType(type);
    
    try {
      const selected = getSelectedText();
      // Cap the context size aggressively to ensure ultra-fast API processing times
      const fullContext = selected || getEditorText();
      const context = fullContext.slice(0, 10000); // 10k chars max is about 1500 words (plenty for context)
      
      let endpoint = '/api/ai/chat';
      let payload = {};

      if (type === 'summarize') {
        endpoint = '/api/ai/summarize';
        payload = { text: context || "No text provided" };
      } else if (type === 'improve') {
        endpoint = '/api/ai/improve';
        payload = { text: selected || context || "No text provided" };
      } else if (type === 'chat') {
        endpoint = '/api/ai/chat';
        payload = { context, query: customPrompt || input || "Please help me with this document." };
      } else if (type === 'ideas') {
        endpoint = '/api/ai/ideas';
        payload = { topic: customPrompt || input || context.slice(0, 100) || "General document topics" };
      }

      // Use the global axios instance which automatically handles cookies/tokens
      const response = await api.post(endpoint, payload);

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        setResult("Error: " + (response.data.message || "Failed to generate response."));
      }
    } catch (err) {
      console.error('AI Action Error:', err);
      setResult("Error: Could not connect to AI service. Ensure you are logged in.");
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  const insertResult = () => {
    if (!editorInstance || !result) return;
    editorInstance.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertText(result);
      }
    });
  };

  const copyResult = () => {
    if (result) navigator.clipboard.writeText(result);
  };

  return (
    <>
      <button className={`ai-trigger-btn shadow-glow ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <Sparkles size={18} />
        <span>Ask AI</span>
      </button>

      {isOpen && createPortal(
        <div className="ai-panel-wrapper animate-slide-in">
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <Sparkles size={16} className="text-accent" />
              <span>Workspace Copilot</span>
            </div>
            <button className="icon-btn ai-close-btn" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="ai-panel-quick-actions">
            <button onClick={() => executeAction('summarize')} className="ai-chip">
              Summarize
            </button>
            <button onClick={() => executeAction('improve')} className="ai-chip">
              Improve Writing
            </button>
            <button onClick={() => executeAction('ideas')} className="ai-chip">
              Generate Ideas
            </button>
          </div>

          <div className="ai-panel-content">
            {!result && !isLoading && (
              <div className="ai-empty-state">
                <Sparkles size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p>How can I help you write today?</p>
                <span className="ai-hint">Select text in the editor to contextualize actions.</span>
              </div>
            )}

            {isLoading && (
              <div className="ai-loading-state">
                <div className="ai-shimmer-line" style={{ width: '90%' }}></div>
                <div className="ai-shimmer-line" style={{ width: '100%' }}></div>
                <div className="ai-shimmer-line" style={{ width: '80%' }}></div>
                <div className="ai-shimmer-line" style={{ width: '60%' }}></div>
              </div>
            )}

            {result && !isLoading && (
              <div className="ai-result-box animate-fade-in">
                <div className="ai-result-text">
                  {result}
                </div>
                <div className="ai-result-actions">
                  <button className="ai-action-btn" onClick={insertResult}>
                    <ArrowRight size={14} /> Insert
                  </button>
                  <button className="ai-action-btn" onClick={copyResult}>
                    <Copy size={14} /> Copy
                  </button>
                  <button className="ai-action-btn" onClick={() => executeAction(actionType, input)}>
                    <RefreshCw size={14} /> Retry
                  </button>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="ai-panel-footer">
            <div className="ai-input-wrapper">
              <input 
                type="text" 
                className="ai-chat-input" 
                placeholder="Ask AI anything..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && input && executeAction('chat')}
              />
              <button 
                className="ai-send-btn" 
                disabled={!input || isLoading}
                onClick={() => executeAction('chat')}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AICopilot;
