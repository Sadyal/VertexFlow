import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Share2, Save, ChevronLeft, Trash2, Download, MoreVertical 
} from 'lucide-react';
import { io } from 'socket.io-client';

// Lexical Core
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getSelection, 
  $isRangeSelection, 
  COMMAND_PRIORITY_EDITOR 
} from 'lexical';

// Lexical Nodes
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { ImageNode } from './ImageNode.jsx';

// Custom Lexical Components
import LexicalTheme from './LexicalTheme';
import LexicalToolbar from './LexicalToolbar';
import SocketSyncPlugin from './SocketSyncPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $generateHtmlFromNodes } from '@lexical/html';
import { INSERT_IMAGE_COMMAND, $createImageNode } from './ImageNode.jsx';

// VertexFlow Components & Utils
import { documentApi } from '../doc.api';
import Button from '../../../components/common/Button';
import Loader from '../../../components/common/Loader';
import ShareModal from '../components/ShareModal';
import DeleteModal from '../components/DeleteModal';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import html2pdf from 'html2pdf.js';
import './EditorUI.css';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * @component Editor (Lexical Edition)
 * @description Advanced Rich Text Editor powered by Meta's Lexical Engine.
 * Seamlessly integrates with the existing Socket.io backend logic.
 */
const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  
  const [doc, setDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentContent, setDocumentContent] = useState(null); 
  const [editorInstance, setEditorInstance] = useState(null); // 🚀 Capture instance for header actions

  // 1. Lexical Configuration
  const initialConfig = useMemo(() => ({
    namespace: 'VertexFlowEditor',
    theme: LexicalTheme,
    onError: (error) => console.error('Lexical Error:', error),
    nodes: [
      HeadingNode, ListNode, ListItemNode, QuoteNode, CodeNode,
      CodeHighlightNode, TableNode, TableCellNode, TableRowNode,
      AutoLinkNode, LinkNode, HorizontalRuleNode, ImageNode
    ]
  }), []);

  // 2. Socket Connection
  useEffect(() => {
    const s = io(SOCKET_URL, {
      withCredentials: true
    });
    setSocket(s);

    // 🚀 Handle Reconnection: Ensure user re-joins the room after a drop
    s.on('connect', () => {
      if (id) s.emit('get-document', id);
    });

    
    s.on('load-document', (content) => {
      // 🚀 Senior Fix: Store in holding area and stop loading
      setDocumentContent(content);
      setIsLoading(false);
    });

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      // If unauthorized, redirect to login
      if (err.message?.includes('unauthorized') || err.message?.includes('401')) {
        navigate('/login');
      }
      setIsLoading(false);
      setError('Connection failed. Please check your internet or login again.');
    });

    s.on('receive-title-update', (newTitle) => {
      setDoc(prev => prev ? { ...prev, title: newTitle } : prev);
    });

    // 🚀 SAFETY TIMEOUT: Don't stay in infinite loading
    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setError('Document taking too long to load. Please refresh.');
      }
    }, 5000);

    return () => {
      s.disconnect();
      clearTimeout(safetyTimeout);
    };
  }, [id]);

  const fetchDoc = useCallback(async () => {
    try {
      const response = await documentApi.getDocById(id);
      if (response.success) setDoc(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
      // If unauthorized, redirect to login
      if (err.status === 401 || err.message?.includes('401')) {
        navigate('/login');
        return;
      }
      setError('Failed to fetch document metadata.');
    }
  }, [id]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const handleSave = async () => {
    if (isSaving || !editorInstance) return;
    setIsSaving(true);
    
    try {
      const stateJSON = editorInstance.getEditorState().toJSON();
      const stateString = JSON.stringify(stateJSON);

      await documentApi.updateDoc(id, { 
        title: doc?.title,
        content: stateString // 🚀 Save as JSON String
      });
      setError(null);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Manual save failed. Auto-sync is still active.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // EXPORT LOGIC (RESTORED)
  // ==========================================
  const exportPDF = () => {
    if (!editorInstance) return;

    editorInstance.read(() => {
      const htmlContent = $generateHtmlFromNodes(editorInstance, null);
      const tempElement = document.createElement('div');
      tempElement.innerHTML = htmlContent;
      tempElement.className = 'lexical-export-container';

      const opt = {
        margin: [15, 15],
        filename: `${doc?.title || 'Document'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(tempElement).save();
    });
  };

  const exportDOCX = () => {
    if (!editorInstance) return;

    editorInstance.read(() => {
      const content = $generateHtmlFromNodes(editorInstance, null);
      const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${doc?.title || 'Document'}</title>
        <style>body { font-family: 'Arial', sans-serif; } table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #000; padding: 5px; }</style>
        </head><body>${content}</body></html>
      `;

      const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc?.title || 'Document'}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  useEffect(() => {
    const handlePaste = (e) => {
      if (!editorInstance) return;
      
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => {
              // 🚀 FIX: Use Lexical's command system for robust injection
              editorInstance.dispatchCommand(INSERT_IMAGE_COMMAND, {
                src: event.target.result,
                altText: 'Pasted Image'
              });
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editorInstance]);

  if (isLoading) return <Loader fullScreen />;

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container animate-fade-in">
        {/* HEADER SECTION (Same UI) */}
        <div className="editor-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '50%' }}>
            <button className="icon-btn" onClick={() => navigate('/dashboard')}>
              <ChevronLeft size={20} />
            </button>
            <input 
              type="text" 
              className="editor-title-input" 
              value={doc?.title || ''} 
              onChange={(e) => {
                const newTitle = e.target.value;
                setDoc({...doc, title: newTitle});
                // 🚀 Sync title in real-time
                if (socket) socket.emit('update-title', newTitle);
              }}
              placeholder="Document Title"
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="save-status sync-badge">
              {isSaving || isSyncing ? 'Syncing...' : 'Synced'}
            </span>
            
            <div className="editor-actions-desktop">
              {/* Download Dropdown */}
              <div className="download-dropdown-container">
                <Button 
                  variant="secondary" 
                  onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                >
                  <Download size={16} /> Download
                </Button>
                
                {isDownloadOpen && (
                  <div className="download-menu glass-panel animate-slide-up">
                    <button className="download-menu-item" onClick={() => { exportPDF(); setIsDownloadOpen(false); }}>
                      <span className="format-icon pdf">PDF</span>
                      <div className="format-info">
                        <span>Portable Document</span>
                        <small>Best for sharing & printing</small>
                      </div>
                    </button>
                    <button className="download-menu-item" onClick={() => { exportDOCX(); setIsDownloadOpen(false); }}>
                      <span className="format-icon docx">DOC</span>
                      <div className="format-info">
                        <span>Word Document</span>
                        <small>Editable in MS Word</small>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <Button variant="secondary" onClick={() => setIsShareModalOpen(true)}>
                <Share2 size={16} /> Share
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                <Save size={16} /> Save
              </Button>
            </div>
          </div>
        </div>

        {/* LEXICAL EDITOR WRAPPER */}
        <div className="lexical-wrapper glass-panel">
          <LexicalToolbar />
          
          <div className="lexical-editor-content">
            <RichTextPlugin
              contentEditable={<ContentEditable className="lexical-input" />}
              placeholder={<div className="lexical-placeholder">Start writing something premium...</div>}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>

          <EditorCapturePlugin 
            onEditorReady={(editor) => {
              setEditorInstance(editor);
              // 🚀 Register Image Command Listener
              editor.registerCommand(
                INSERT_IMAGE_COMMAND,
                (payload) => {
                  editor.update(() => {
                    const { src, altText } = payload;
                    const imageNode = $createImageNode({ src, altText });
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      selection.insertNodes([imageNode]);
                    }
                  });
                  return true;
                },
                COMMAND_PRIORITY_EDITOR
              );
            }} 
          />

          {/* PLUGINS */}
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <TablePlugin />
          <HorizontalRulePlugin />
          <SocketSyncPlugin 
            socket={socket} 
            docId={id} 
            initialContent={documentContent} // 🚀 Pass holding data to plugin
            isOnline={isOnline}
            onSyncStatusChange={setIsSyncing}
          />
        </div>

        {/* MODALS */}
        {isShareModalOpen && <ShareModal docId={id} onClose={() => setIsShareModalOpen(false)} />}
        {isDeleteModalOpen && (
          <DeleteModal 
            title={doc?.title} 
            onClose={() => setIsDeleteModalOpen(false)} 
            onDelete={async () => {
              await documentApi.deleteDoc(id);
              navigate('/dashboard');
            }} 
          />
        )}
      </div>
    </LexicalComposer>
  );
};

/**
 * 🚀 HELPER: Captures the editor instance from Lexical context
 */
const EditorCapturePlugin = ({ onEditorReady }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);
  return null;
};

export default Editor;
