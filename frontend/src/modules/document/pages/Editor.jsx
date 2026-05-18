import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Share2, Save, ChevronLeft, Trash2, Download, MoreVertical, Sparkles
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
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { ImageNode } from './ImageNode.jsx';

// Custom Lexical Components
import LexicalTheme from './LexicalTheme';
import LexicalToolbar from './LexicalToolbar';
import SocketSyncPlugin from './SocketSyncPlugin';
import { useAuth } from '../../../context/AuthContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $generateHtmlFromNodes } from '@lexical/html';
import { INSERT_IMAGE_COMMAND, $createImageNode } from './ImageNode.jsx';

// VertexFlow Components & Utils
import { documentApi } from '../doc.api';
import { userApi } from '../../user/user.api';
import Button from '../../../components/common/Button';
import Skeleton from '../../../components/common/Skeleton';
import FloatingAIButton from '../../../components/ai/FloatingAIButton';
import ShareModal from '../components/ShareModal';
import DeleteModal from '../components/DeleteModal';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import { db } from '../../../utils/db';
import './EditorUI.css';

// 🌈 PrismJS for Code Highlighting
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';

// Fix for Prism not being defined globally in production builds
if (typeof window !== 'undefined') {
  window.Prism = Prism;
}

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ==========================================
// SKELETON COMPONENT
// ==========================================
const EditorSkeleton = memo(() => (
  <div className="editor-container animate-fade-in">
    <div className="editor-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '50%' }}>
        <Skeleton width="40px" height="40px" borderRadius="50%" />
        <Skeleton width="250px" height="2rem" />
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Skeleton width="80px" height="1rem" />
        <Skeleton width="100px" height="2.5rem" borderRadius="var(--radius-md)" />
        <Skeleton width="100px" height="2.5rem" borderRadius="var(--radius-md)" />
      </div>
    </div>
    
    <div className="lexical-wrapper glass-panel" style={{ overflow: 'hidden' }}>
      <div className="toolbar" style={{ borderBottom: '1px solid var(--border-color)', padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} width="32px" height="32px" borderRadius="4px" />)}
      </div>
      <div className="lexical-editor-content" style={{ padding: '2rem' }}>
        <Skeleton width="60%" height="2rem" style={{ marginBottom: '2rem' }} />
        <Skeleton width="100%" height="1rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="1rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="90%" height="1rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="100%" height="1rem" style={{ marginBottom: '1rem' }} />
        <Skeleton width="40%" height="1rem" />
      </div>
    </div>
  </div>
));

/**
 * @component Editor (Lexical Edition)
 * @description Advanced Rich Text Editor powered by Meta's Lexical Engine.
 */
const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const { user } = useAuth();
  
  const [doc, setDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const titleTimeoutRef = useRef(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [documentContent, setDocumentContent] = useState(null); 
  const [editorInstance, setEditorInstance] = useState(null); 
  
  // 🛡️ SECURITY DEBOUNCE REFS
  const lastPasteTimeRef = useRef(0);
  const activeUploadsCountRef = useRef(0); 

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

  const handleEditorReady = useCallback((editor) => {
    setEditorInstance(editor);
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
  }, []);

  // 2. Socket Connection & Cache Fast-Load
  useEffect(() => {
    if (!user) return; // 🛡️ Wait until user session is loaded to prevent token-missing errors and isolate cache
    
    const currentUserId = user?._id || user?.id;

    const s = io(SOCKET_URL, {
      withCredentials: true
    });
    setSocket(s);

    // 🕒 Socket Heartbeat: sliding expire refresh every 20s
    const heartbeatInterval = setInterval(() => {
      s.emit("heartbeat");
    }, 20000);

    s.on('connect', () => {
      if (id) s.emit('get-document', id);
    });

    s.on('load-document', (content) => {
      setDocumentContent(content);
      setIsLoading(false);
      // 🚀 Cache to IndexedDB isolated securely by current user's ID
      if (currentUserId) {
        db.saveDocument(id, content, currentUserId);
      }
    });

    // 🚀 INDEXEDDB FAST-LOAD: Try to load from cache immediately (Tenant-Isolated)
    const loadFromCache = async () => {
      if (currentUserId) {
        const cachedContent = await db.getDocument(id, currentUserId);
        if (cachedContent) {
          setDocumentContent(cachedContent);
          setIsLoading(false); // Render immediately if cache exists
        }
      }
    };
    loadFromCache();

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      if (err.message?.includes('unauthorized') || err.message?.includes('401')) {
        navigate('/login');
      }
      setIsLoading(false);
      setError('Connection failed. Please check your internet or login again.');
    });

    s.on('receive-title-update', (newTitle) => {
      setDoc(prev => prev ? { ...prev, title: newTitle } : prev);
    });

    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setError('Document taking too long to load. Please refresh.');
      }
    }, 8000); // Increased for slower networks

    return () => {
      clearInterval(heartbeatInterval);
      s.disconnect();
      clearTimeout(safetyTimeout);
    };
  }, [id, navigate, user]); // Added user to dependencies to re-trigger when loaded

  const fetchDoc = useCallback(async () => {
    try {
      const response = await documentApi.getDocById(id);
      if (response.success) setDoc(response.data);
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.status === 401 || err.message?.includes('401')) {
        navigate('/login');
        return;
      }
      setError('Failed to fetch document metadata.');
    }
  }, [id, navigate]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const handleSave = async () => {
    if (isSaving || !editorInstance) return;
    setIsSaving(true);
    
    try {
      const stateJSON = editorInstance.getEditorState().toJSON();
      const stateString = JSON.stringify(stateJSON);

      await documentApi.updateDoc(id, { 
        title: doc?.title,
        content: stateString 
      });
      setError(null);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Manual save failed. Auto-sync is still active.');
    } finally {
      setIsSaving(false);
    }
  };

  const exportPDF = async () => {
    if (!editorInstance) return;

    // 🚀 Dynamic Import: Only load the heavy PDF library when needed
    const html2pdf = (await import('html2pdf.js')).default;

    editorInstance.read(() => {
      const htmlContent = $generateHtmlFromNodes(editorInstance, null);
      const tempElement = document.createElement('div');
      
      // 🚀 Force high-fidelity print styles for PDF
      tempElement.innerHTML = `
        <div class="pdf-export-wrapper" style="color: #000; background: #fff; padding: 40px; font-family: 'Arial', sans-serif;">
          ${htmlContent}
        </div>
      `;
      
      const opt = {
        margin: [10, 10],
        filename: `${doc?.title || 'Document'}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(tempElement).save();
      
      // 🚀 Log Activity
      userApi.logActivity("DOC_DOWNLOADED", `Downloaded document as PDF: ${doc?.title || 'Untitled'}`);
    });
  };

  const exportDOCX = () => {
    if (!editorInstance) return;

    editorInstance.read(() => {
      const content = $generateHtmlFromNodes(editorInstance, null);
      const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${doc?.title || 'Document'}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #000; }
            h1 { color: #1a1a1a; font-size: 24pt; font-weight: bold; margin-bottom: 15pt; }
            h2 { color: #333; font-size: 18pt; font-weight: bold; margin-top: 20pt; margin-bottom: 10pt; }
            
            /* 🚀 Force Word to recognize Lexical paragraphs */
            p, div, .editor-paragraph { 
              margin: 0 0 12pt 0; 
              display: block;
              mso-para-margin-bottom: 12pt;
              mso-line-height-rule: exactly;
            }
            
            strong, .editor-text-bold { font-weight: bold; }
            em, .editor-text-italic { font-style: italic; }
            u, .editor-text-underline { text-decoration: underline; }
            
            table { border-collapse: collapse; width: 100%; margin: 15pt 0; }
            th, td { border: 1px solid #ddd; padding: 8pt; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; }
            
            .editor-image { max-width: 100%; height: auto; margin: 15pt auto; display: block; }
          </style>
        </head>
        <body>${content}</body>
        </html>
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

      // 🚀 Log Activity
      userApi.logActivity("DOC_DOWNLOADED", `Downloaded document as DOCX: ${doc?.title || 'Untitled'}`);
    });
  };

  useEffect(() => {
    const handlePaste = async (e) => {
      if (!editorInstance) return;
      
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // 1. Gather all files (handles both items.getAsFile() and File Explorer copies)
      const filesToUpload = [];
      
      // Try items first (screenshots / web snippets)
      if (clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          if (clipboardData.items[i].type.indexOf('image') !== -1) {
            const file = clipboardData.items[i].getAsFile();
            if (file) filesToUpload.push(file);
          }
        }
      }
      
      // Fallback/Supplement with files (handles copy-paste of files directly from folders)
      if (filesToUpload.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          if (clipboardData.files[i].type.startsWith('image/')) {
            filesToUpload.push(clipboardData.files[i]);
          }
        }
      }

      if (filesToUpload.length > 0) {
        e.preventDefault(); // Block default HTML/base64 pasting
        
        for (const file of filesToUpload) {
          // 🛡️ SECURITY DEBOUNCE: Enforce strict rate-limiting to prevent memory exhaustion
          const now = Date.now();
          if (now - lastPasteTimeRef.current < 1500) {
            console.warn('⚠️ Image paste rate-limited. Please wait 1.5 seconds between pastes.');
            continue;
          }
          if (activeUploadsCountRef.current >= 3) {
            console.warn('⚠️ Too many concurrent uploads. Please wait.');
            continue;
          }

          // 🛡️ SIZE LIMIT VALIDATION (Multer 5MB maximum limit)
          if (file.size > 5 * 1024 * 1024) {
            alert('⚠️ Pasted image is too large! Maximum allowed size is 5MB.');
            continue;
          }

          lastPasteTimeRef.current = now;
          activeUploadsCountRef.current += 1;

          try {
            const response = await documentApi.uploadImage(file);
            if (response.success && response.data?.url) {
              editorInstance.dispatchCommand(INSERT_IMAGE_COMMAND, {
                src: response.data.url,
                altText: 'Pasted Image'
              });
            }
          } catch (err) {
            console.error('Failed to upload pasted image:', err);
          } finally {
            activeUploadsCountRef.current = Math.max(0, activeUploadsCountRef.current - 1);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editorInstance]);

  if (isLoading) return <EditorSkeleton />;

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container animate-fade-in">
        {/* HEADER SECTION */}
        <div className="editor-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '50%' }}>
            <button className="icon-btn" onClick={() => navigate('/dashboard')} aria-label="Go back to dashboard">
              <ChevronLeft size={20} />
            </button>
            <input 
              type="text" 
              className="editor-title-input" 
              value={doc?.title || ''} 
              onChange={(e) => {
                const newTitle = e.target.value;
                setDoc({...doc, title: newTitle});
                
                if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
                titleTimeoutRef.current = setTimeout(() => {
                  if (socket) socket.emit('update-title', newTitle);
                }, 1000);
              }}
              placeholder="Document Title"
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="save-status sync-badge">
              <Sparkles size={12} className={isSaving || isSyncing ? 'spinning' : ''} />
              {isSaving || isSyncing ? 'Syncing...' : 'Synced'}
            </span>
            
            {/* 🖥️ DESKTOP ACTIONS */}
            <div className="editor-actions-desktop">
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
              <Button onClick={handleSave} isLoading={isSaving} className="glow-on-hover">
                <Save size={16} /> Save
              </Button>
            </div>

            {/* 📱 MOBILE ACTIONS (MODERN COMPACT) */}
            <div className="editor-actions-mobile">
              <button 
                className={`icon-btn ${isDownloadOpen ? 'active' : ''}`} 
                onClick={() => {
                  setIsDownloadOpen(!isDownloadOpen);
                  setIsMoreMenuOpen(false); 
                }}
                aria-label="Download document"
              >
                <Download size={20} />
              </button>
              
              <div style={{ position: 'relative' }}>
                <button 
                  className={`icon-btn ${isMoreMenuOpen ? 'active' : ''}`} 
                  onClick={() => {
                    setIsMoreMenuOpen(!isMoreMenuOpen);
                    setIsDownloadOpen(false);
                  }}
                  aria-label="More options"
                >
                  <MoreVertical size={20} />
                </button>
                
                {isMoreMenuOpen && (
                  <div className="more-menu glass-panel animate-slide-up">
                    <button className="more-menu-item" onClick={() => { handleSave(); setIsMoreMenuOpen(false); }}>
                      <Save size={18} /> Save Changes
                    </button>
                    <button className="more-menu-item" onClick={() => { setIsShareModalOpen(true); setIsMoreMenuOpen(false); }}>
                      <Share2 size={18} /> Share Doc
                    </button>
                    <button className="more-menu-item delete" onClick={() => { setIsMoreMenuOpen(false); setIsDeleteModalOpen(true); }}>
                      <Trash2 size={18} /> Delete Doc
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Download Menu Portal-style */}
              {isDownloadOpen && (
                <div className="download-menu mobile-download glass-panel animate-slide-up">
                  <button className="download-menu-item" onClick={() => { exportPDF(); setIsDownloadOpen(false); }}>
                    <span className="format-icon pdf">PDF</span>
                    <span>PDF Document</span>
                  </button>
                  <button className="download-menu-item" onClick={() => { exportDOCX(); setIsDownloadOpen(false); }}>
                    <span className="format-icon docx">DOC</span>
                    <span>Word Document</span>
                  </button>
                </div>
              )}
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

          <EditorCapturePlugin onEditorReady={handleEditorReady} />

          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <TablePlugin />
          <HorizontalRulePlugin />
          <CodeHighlightPlugin />
          <SocketSyncPlugin 
            socket={socket} 
            docId={id} 
            initialContent={documentContent} 
            isOnline={isOnline}
            userId={user?._id || user?.id}
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

      {/* Floating AI Assistant (Lazy Loaded + Portal) */}
      <FloatingAIButton editorInstance={editorInstance} />
    </LexicalComposer>
  );
};

const EditorCapturePlugin = ({ onEditorReady }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);
  return null;
};

/**
 * 🌈 Custom CodeHighlightPlugin
 * Since Lexical v0.44.0 doesn't export this from @lexical/react, we implement it here.
 */
const CodeHighlightPlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);
  return null;
};

export default Editor;

