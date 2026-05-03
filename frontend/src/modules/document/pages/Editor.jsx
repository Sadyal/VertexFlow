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
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';

// Lexical Nodes
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';

// Custom Lexical Components
import LexicalTheme from './LexicalTheme';
import LexicalToolbar from './LexicalToolbar';
import SocketSyncPlugin from './SocketSyncPlugin';

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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [documentContent, setDocumentContent] = useState(null); // 🚀 The "Holding Area"

  // 1. Lexical Configuration
  const initialConfig = useMemo(() => ({
    namespace: 'VertexFlowEditor',
    theme: LexicalTheme,
    onError: (error) => console.error('Lexical Error:', error),
    nodes: [
      HeadingNode, ListNode, ListItemNode, QuoteNode, CodeNode,
      CodeHighlightNode, TableNode, TableCellNode, TableRowNode,
      AutoLinkNode, LinkNode
    ]
  }), []);

  // 2. Socket Connection
  useEffect(() => {
    const s = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket']
    });
    setSocket(s);

    s.emit('get-document', id);
    
    s.on('load-document', (content) => {
      // 🚀 Senior Fix: Store in holding area and stop loading
      setDocumentContent(content);
      setIsLoading(false);
    });

    return () => s.disconnect();
  }, [id]);

  const fetchDoc = useCallback(async () => {
    try {
      const response = await documentApi.getDocById(id);
      if (response.success) setDoc(response.data);
    } catch (err) {
      setError('Failed to fetch document metadata.');
    }
  }, [id]);

  useEffect(() => { fetchDoc(); }, [fetchDoc]);

  const handleSave = async () => {
    setIsSaving(true);
    
    // 🚀 NEW: Extract content from Lexical directly before saving
    let htmlContent = '';
    const editorElement = document.querySelector('.lexical-input');
    if (editorElement) {
      htmlContent = editorElement.innerHTML;
    }

    try {
      await documentApi.updateDoc(id, { 
        title: doc?.title,
        content: htmlContent 
      });
      setError(null);
    } catch (err) {
      setError('Failed to save document.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // EXPORT LOGIC (RESTORED)
  // ==========================================
  const exportPDF = () => {
    const editorElement = document.querySelector('.lexical-input');
    if (!editorElement) return;

    const opt = {
      margin: [15, 15],
      filename: `${doc?.title || 'Document'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(editorElement).save();
  };

  const exportDOCX = () => {
    const editorElement = document.querySelector('.lexical-input');
    if (!editorElement) return;
    
    const content = editorElement.innerHTML;
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
  };

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
              onChange={(e) => setDoc({...doc, title: e.target.value})}
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
        <div className="tiptap-wrapper glass-panel">
          <LexicalToolbar />
          
          <div className="tiptap-editor-content">
            <RichTextPlugin
              contentEditable={<ContentEditable className="lexical-input" />}
              placeholder={<div className="lexical-placeholder">Start writing something premium...</div>}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>

          {/* PLUGINS */}
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <TablePlugin />
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

export default Editor;
