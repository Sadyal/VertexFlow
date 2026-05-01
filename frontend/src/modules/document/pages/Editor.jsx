import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, Save, ChevronLeft, Trash2 } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Link as LinkExtension } from '@tiptap/extension-link';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Superscript } from '@tiptap/extension-superscript';
import { Subscript } from '@tiptap/extension-subscript';
import { FontFamily } from '@tiptap/extension-font-family';
import { Image } from '@tiptap/extension-image';
import { io } from 'socket.io-client';
import { documentApi } from '../doc.api';
import Button from '../../../components/common/Button';
import Loader from '../../../components/common/Loader';
import ShareModal from '../components/ShareModal';
import DeleteModal from '../components/DeleteModal';
import EditorToolbar from '../components/EditorToolbar';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import html2pdf from 'html2pdf.js';
import { Download } from 'lucide-react';
import './EditorUI.css';

// Socket server URL
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * @component Editor
 * @description Advanced Rich Text Editor powering the core application.
 * Utilizes Tiptap with 20+ extensions for a true MS Word/Google Docs experience.
 */
const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [doc, setDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [socket, setSocket] = useState(null);



  // ==========================================
  // TIPTAP EDITOR INITIALIZATION
  // ==========================================
  const extensions = useMemo(() => [
    StarterKit.configure({
      // Explicitly disable any potential overlaps to stop console warnings
      dropCursor: false,
      history: true,
      // Some versions of StarterKit might try to include these
      link: false,
      underline: false,
    }),
    Underline.configure(),
    Highlight.configure({ multicolor: true }),
    TextStyle.configure(),
    Color.configure(),
    FontFamily.configure(),
    Superscript.configure(),
    Subscript.configure(),
    Image.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          width: {
            default: '100%',
            renderHTML: attributes => ({
              width: attributes.width,
              style: `width: ${attributes.width}; max-width: 100%; height: auto;`,
            }),
          },
        };
      },
    }).configure({
      inline: true,
      allowBase64: true,
      HTMLAttributes: {
        class: 'resizable-image',
      },
    }),
    LinkExtension.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
    }),
    TaskList.configure(),
    TaskItem.configure({
      nested: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow.configure(),
    TableHeader.configure(),
    TableCell.configure(),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
  ], []);

  // Debounce ref to store the timer
  const saveTimeoutRef = useRef(null);

  const editor = useEditor({
    extensions,
    content: '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setIsSyncing(true);
      
      setDoc(prev => {
        if (!prev) return prev;
        const updated = { ...prev, content: html };
        localStorage.setItem(`doc_draft_${id}`, JSON.stringify(updated));
        return updated;
      });

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // 📡 Debounced Sync
      saveTimeoutRef.current = setTimeout(() => {
        if (socket) {
          // Broadcast to other users (immediate is better for collaboration)
          socket.emit('send-changes', html);
          // Persist to database (debounced to save DB cycles)
          socket.emit('save-document', html);
        }
        setIsSyncing(false);
      }, 500); // 500ms pause before saving
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content',
      },
    },
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // ==========================================
  // SOCKET CONNECTION & SYNC LOGIC
  // ==========================================
  useEffect(() => {
    const s = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket']
    });
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket == null || editor == null || !id) return;

    socket.emit('get-document', id);

    socket.on('load-document', (content) => {
      // Prioritize local draft if it exists, otherwise load from server
      const localDraft = localStorage.getItem(`doc_draft_${id}`);
      if (localDraft) {
        const parsed = JSON.parse(localDraft);
        editor.commands.setContent(parsed.content || '');
      } else {
        editor.commands.setContent(content || '');
      }
      setIsLoading(false);
    });

    socket.on('receive-changes', (content) => {
      // Update editor content from another user
      if (!editor.isFocused) {
        editor.commands.setContent(content, false);
      }
    });

    return () => {
      socket.off('load-document');
      socket.off('receive-changes');
    };
  }, [socket, editor, id]);

  // ==========================================
  // DOCUMENT FETCHING & SYNC LOGIC
  // ==========================================
  const fetchDoc = useCallback(async () => {
    try {
      const response = await documentApi.getDocById(id);
      if (response.success) {
        setDoc(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch document.');
    }
  }, [id]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const handleTitleChange = (e) => {
    setDoc(prev => ({ ...prev, title: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Always save content locally since the backend only updates the title
    if (doc) {
      localStorage.setItem(`doc_draft_${id}`, JSON.stringify(doc));
    }

    try {
      if (isOnline) {
        await documentApi.updateDoc(id, { title: doc?.title, content: doc?.content });
      } else {
        setError('Cannot save title while offline (content saved locally).');
      }
    } catch (err) {
      setError(err.message || 'Failed to save document.');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

  // ==========================================
  // EXPORT LOGIC
  // ==========================================
  const exportPDF = () => {
    if (!editor) return;
    const content = editor.getHTML();
    const element = document.createElement('div');
    element.innerHTML = content;
    element.className = 'tiptap-editor-content'; // Apply same styles
    
    const opt = {
      margin: [15, 15],
      filename: `${doc?.title || 'Document'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const exportDOCX = () => {
    if (!editor) return;
    const content = editor.getHTML();
    
    // Professional Word XML Wrapper
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${doc?.title || 'Document'}</title>
        <style>
          body { font-family: 'Arial', sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #000; padding: 5px; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', header], {
      type: 'application/msword'
    });

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
    <div className="editor-container animate-fade-in">
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '50%' }}>
          <button className="icon-btn" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <ChevronLeft size={20} />
          </button>
          <input 
            type="text" 
            className="editor-title-input" 
            value={doc?.title || ''} 
            onChange={handleTitleChange}
            placeholder="Document Title"
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          <div className="active-users-stack">
            {activeUsers.map((user, index) => (
              <div 
                key={user.id} 
                className="user-avatar-small" 
                style={{ backgroundColor: user.color, zIndex: 10 - index }}
                title={`${user.name} is editing`}
              >
                {getInitials(user.name)}
              </div>
            ))}
          </div>

          {!isOnline && <span className="save-status" style={{color: 'var(--warning)'}}>Offline Mode</span>}
          {error && <span className="save-status" style={{color: 'var(--warning)'}}>{error}</span>}
          
          <span className="save-status" style={{ opacity: 0.8, fontSize: '0.85rem', color: isSyncing ? 'var(--accent-primary)' : 'inherit' }}>
            {isSaving ? 'Syncing...' : isSyncing ? 'Syncing...' : 'Synced'}
          </span>
          
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

          <Button variant="secondary" onClick={() => setIsShareModalOpen(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Share2 size={16} /> Share
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setIsDeleteModalOpen(true)} 
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--warning)' }}
          >
            <Trash2 size={16} /> Delete
          </Button>
          <Button onClick={handleSave} isLoading={isSaving} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Save size={16} /> Save
          </Button>
        </div>
      </div>

      {/* Advanced Tiptap Editor Wrapper */}
      <div className="tiptap-wrapper glass-panel">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>

      {isShareModalOpen && (
        <ShareModal 
          docId={id} 
          onClose={() => setIsShareModalOpen(false)} 
        />
      )}
      
      {isDeleteModalOpen && (
        <DeleteModal 
          title={doc?.title} 
          onClose={() => setIsDeleteModalOpen(false)} 
          onDelete={async () => {
            try {
              await documentApi.deleteDoc(id);
              navigate('/dashboard');
            } catch (err) {
              setError('Failed to delete document');
            }
          }} 
        />
      )}
    </div>
  );
};

export default Editor;
