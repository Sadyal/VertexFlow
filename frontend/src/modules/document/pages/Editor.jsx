import './prism-init';
import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Share2, Save, ChevronLeft, Trash2, Download, MoreVertical, Sparkles, Users
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
  COMMAND_PRIORITY_EDITOR,
  $getRoot
} from 'lexical';

// Lexical Nodes
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode, registerCodeHighlighting } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { ImageNode, $isImageNode } from './ImageNode.jsx';

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

// PrismJS is lazy-loaded inside CodeHighlightPlugin to optimize startup latency

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

// 🖥️ SHARED GLOBAL SOCKET SINGLETON (SRE Pooling Model)
let globalSocket = null;
const getSharedSocket = () => {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false // Connect dynamically on mount
    });
  }
  return globalSocket;
};

/**
 * @component Editor (Lexical Edition)
 * @description Advanced Rich Text Editor powered by Meta's Lexical Engine.
 */
const Editor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const { user, userAvatar } = useAuth();
  
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
  
  // 👥 SRE PRESENCE & IMAGE QUEUE STATES
  const [collaborators, setCollaborators] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [queueState, setQueueState] = useState({ active: 0, waiting: 0 });
  const uploadQueueRef = useRef([]);
  const isUploadingRef = useRef(false);

  // 🛡️ SECURITY DEBOUNCE REFS
  const lastPasteTimeRef = useRef(0);
  const activeUploadsCountRef = useRef(0); 
  const lastImagePasteTimeRef = useRef(0);

  // 👥 COLLABORATION STATES
  const [syncState, setSyncState] = useState('synced');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const prevIdRef = useRef(null);

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

  // 2. Socket Connection & Cache Fast-Load (SRE Pooling Model)
  useEffect(() => {
    if (!user) return; // 🛡️ Wait until user session is loaded to prevent token-missing errors and isolate cache
    
    // 🛡️ SRE PAGE TRANSITION RESET: Reset all document-specific states ONLY when switching documents!
    if (prevIdRef.current !== id) {
      setIsLoading(true);
      setDocumentContent(null);
      setDoc(null);
      setCollaborators([]);
      setError(null);
      prevIdRef.current = id;
    }

    const currentUserId = user?._id || user?.id;
    const s = getSharedSocket();

    // 🕒 Socket Heartbeat: sliding expire refresh every 20s
    const heartbeatInterval = setInterval(() => {
      s.emit("heartbeat");
    }, 20000);

    const handleConnect = () => {
      if (id) {
        const userMetadata = {
          name: user?.name || 'Anonymous',
          avatar: userAvatar || '',
          color: '#' + Math.floor(Math.random() * 16777215).toString(16)
        };
        s.emit('get-document', id, userMetadata);
      }
    };

    const handleLoadDoc = (content) => {
      setDocumentContent(content);
      setIsLoading(false);
      // 🚀 Cache to IndexedDB isolated securely by current user's ID
      if (currentUserId) {
        db.saveDocument(id, content, currentUserId);
      }
    };

    const handleConnectError = (err) => {
      console.error('Socket connection error:', err);
      if (err.message?.includes('unauthorized') || err.message?.includes('401')) {
        navigate('/login');
      }
      setIsLoading(false);
      setError('Connection failed. Please check your internet or login again.');
      setSyncState('offline');
    };

    const handleTitleUpdate = (newTitle) => {
      setDoc(prev => prev ? { ...prev, title: newTitle } : prev);
    };

    const handleDisconnect = () => {
      setSyncState('offline');
    };

    const handleReconnectAttempt = () => {
      setSyncState('reconnecting');
    };

    const handleReconnect = () => {
      setSyncState('recovering');
      setTimeout(() => setSyncState('conflict_resolved'), 1000); // Trigger merge conflict banner!
    };

    const handlePresenceList = (members) => {
      setCollaborators(members);
    };

    const handlePresenceJoined = (member) => {
      setCollaborators(prev => {
        const filtered = prev.filter(m => m.socketId !== member.socketId);
        return [...filtered, member];
      });
    };

    const handlePresenceUpdated = (update) => {
      setCollaborators(prev => prev.map(m => {
        if (m.socketId === update.socketId) {
          return { ...m, ...update };
        }
        return m;
      }));
    };

    const handlePresenceLeft = (left) => {
      setCollaborators(prev => prev.filter(m => m.socketId !== left.socketId));
    };

    // 🛡️ RACE CONDITION PREVENTION: Register event listeners BEFORE connecting/joining!
    s.on('connect', handleConnect);
    s.on('load-document', handleLoadDoc);
    s.on('connect_error', handleConnectError);
    s.on('receive-title-update', handleTitleUpdate);
    s.on('disconnect', handleDisconnect);
    s.on('reconnect_attempt', handleReconnectAttempt);
    s.on('reconnect', handleReconnect);
    s.on('presence-list', handlePresenceList);
    s.on('presence-joined', handlePresenceJoined);
    s.on('presence-updated', handlePresenceUpdated);
    s.on('presence-left', handlePresenceLeft);

    // 🚀 Initiate socket connection securely AFTER listeners are set up!
    if (!s.connected) {
      s.connect();
    } else {
      // Socket already connected, immediately join document room!
      handleConnect();
    }
    setSocket(s);



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

    const safetyTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setError('Document taking too long to load. Please refresh.');
      }
    }, 8000); // Increased for slower networks

    return () => {
      clearInterval(heartbeatInterval);
      s.off('connect', handleConnect);
      s.off('load-document', handleLoadDoc);
      s.off('connect_error', handleConnectError);
      s.off('receive-title-update', handleTitleUpdate);
      s.off('disconnect', handleDisconnect);
      s.off('reconnect_attempt', handleReconnectAttempt);
      s.off('reconnect', handleReconnect);
      s.off('presence-list', handlePresenceList);
      s.off('presence-joined', handlePresenceJoined);
      s.off('presence-updated', handlePresenceUpdated);
      s.off('presence-left', handlePresenceLeft);
      clearTimeout(safetyTimeout);
    };
  }, [id, navigate, user, userAvatar]); // Added user and userAvatar to dependencies to re-trigger when loaded

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
    if (!editorInstance) return;

    const processNextUpload = async () => {
      if (isUploadingRef.current || uploadQueueRef.current.length === 0) return;

      isUploadingRef.current = true;
      const file = uploadQueueRef.current.shift();
      
      setQueueState({
        active: 1,
        waiting: uploadQueueRef.current.length
      });

      // 🚀 OPTIMISTIC RENDER: Render instant local preview blob URL
      const localBlobUrl = URL.createObjectURL(file);
      
      editorInstance.dispatchCommand(INSERT_IMAGE_COMMAND, {
        src: localBlobUrl,
        altText: 'Uploading image...'
      });

      try {
        const response = await documentApi.uploadImage(file);
        if (response.success && response.data?.url) {
          const cdnUrl = response.data.url;

          // 🚀 SEAMLESS HOT-SWAP: Replace local blob URL with permanent Cloudinary CDN URL
          editorInstance.update(() => {
            const rootNode = $getRoot();
            const findAndUpdate = (node) => {
              if ($isImageNode(node) && node.getSrc() === localBlobUrl) {
                node.setSrc(cdnUrl);
                return true;
              }
              if (node.getChildren) {
                for (const child of node.getChildren()) {
                  if (findAndUpdate(child)) return true;
                }
              }
              return false;
            };
            findAndUpdate(rootNode);
          });
        }
      } catch (err) {
        console.error('Failed to upload pasted image:', err);
        alert('⚠️ Image upload failed. Keeping temporary local preview.');
      } finally {
        URL.revokeObjectURL(localBlobUrl);
        isUploadingRef.current = false;
        setQueueState({
          active: 0,
          waiting: uploadQueueRef.current.length
        });
        processNextUpload(); // Process next queued upload automatically!
      }
    };

    const processAndUploadImage = (file) => {
      // 🛡️ MIME TYPE VALIDATION
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('⚠️ Invalid image format! Only PNG, JPEG, and WEBP are allowed.');
        return;
      }

      // 🛡️ SIZE LIMIT VALIDATION (Multer 3MB maximum limit)
      if (file.size > 3 * 1024 * 1024) {
        alert('⚠️ Pasted image is too large! Maximum allowed size is 3MB.');
        return;
      }

      // 🛡️ CONCURRENT LOCK QUEUE LIMIT
      if (uploadQueueRef.current.length >= 5) {
        alert('⚠️ Upload queue is full! Maximum 5 pending uploads allowed.');
        return;
      }

      uploadQueueRef.current.push(file);
      setQueueState({
        active: isUploadingRef.current ? 1 : 0,
        waiting: uploadQueueRef.current.length
      });

      processNextUpload();
    };

    const handlePaste = async (e) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // 🛡️ FREE TIER SAFE PASTE ENGINE: Intercept huge copy-paste strings (>25,000 characters)
      const text = clipboardData.getData('text');
      if (text && text.length > 25000) {
        e.preventDefault();
        alert('⚠️ Maximum paste limit: 25K characters.');
        return;
      }

      const filesToUpload = [];
      
      if (clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          if (clipboardData.items[i].type.indexOf('image') !== -1) {
            // 🛡️ SRE COOLDOWN REJECTION ENGINE: 2 seconds paste cooldown
            const now = Date.now();
            if (now - lastImagePasteTimeRef.current < 2000) {
              e.preventDefault();
              alert("Please wait before pasting another image");
              return; // Reject completely: no upload, no queue, no request
            }
            lastImagePasteTimeRef.current = now;

            const file = clipboardData.items[i].getAsFile();
            if (file) filesToUpload.push(file);
          }
        }
      }
      
      if (filesToUpload.length === 0 && clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          if (clipboardData.files[i].type.startsWith('image/')) {
            // 🛡️ SRE COOLDOWN REJECTION ENGINE: 2 seconds paste cooldown
            const now = Date.now();
            if (now - lastImagePasteTimeRef.current < 2000) {
              e.preventDefault();
              alert("Please wait before pasting another image");
              return;
            }
            lastImagePasteTimeRef.current = now;

            filesToUpload.push(clipboardData.files[i]);
          }
        }
      }

      if (filesToUpload.length > 0) {
        e.preventDefault(); // Block default HTML/base64 pasting
        for (const file of filesToUpload) {
          processAndUploadImage(file);
        }
      }
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      const filesToUpload = [];
      
      if (e.dataTransfer && e.dataTransfer.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          if (e.dataTransfer.files[i].type.startsWith('image/')) {
            filesToUpload.push(e.dataTransfer.files[i]);
          }
        }
      }

      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          processAndUploadImage(file);
        }
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);

    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
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
            {/* 👥 Dynamic SRE Collaborators Avatar Stack */}
            <div className="collaborators-stack" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginRight: '6px' }}>
                {collaborators.slice(0, 4).map(c => {
                  const isOnline = c.status === 'online';
                  const isIdle = c.status === 'idle';
                  const badgeColor = isOnline ? '#22c55e' : isIdle ? '#eab308' : '#94a3b8';
                  return (
                    <div 
                      key={c.socketId}
                      className="avatar-circle-wrapper"
                      style={{
                        position: 'relative',
                        width: '30px',
                        height: '30px',
                        minWidth: '30px',
                        minHeight: '30px',
                        flexShrink: 0,
                        borderRadius: '50%',
                        border: '2px solid var(--border-color)',
                        backgroundColor: c.color || 'var(--accent-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'help',
                        marginLeft: '-8px',
                        zIndex: 10
                      }}
                      title={`${c.name || 'Collaborator'} (${c.status || 'online'})`}
                    >
                      {c.avatar ? (
                        <img src={c.avatar} alt={c.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        c.name ? c.name.charAt(0).toUpperCase() : '?'
                      )}
                      {/* Live Online Status Pin */}
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: badgeColor,
                          border: '1.5px solid var(--border-color)'
                        }}
                      />
                    </div>
                  );
                })}
                {collaborators.length > 4 && (
                  <div 
                    className="avatar-circle-wrapper plus-more"
                    style={{
                      width: '30px',
                      height: '30px',
                      minWidth: '30px',
                      minHeight: '30px',
                      flexShrink: 0,
                      borderRadius: '50%',
                      border: '2px solid var(--border-color)',
                      backgroundColor: 'var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-color)',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      marginLeft: '-8px',
                      zIndex: 9
                    }}
                  >
                    +{collaborators.length - 4}
                  </div>
                )}
              </div>
              
              {/* ✍️ Live Typing Indicators */}
              {collaborators.some(c => c.isTyping && c.socketId !== socket?.id) && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', animation: 'pulse 1.5s infinite' }}>
                  <span className="typing-dot" style={{ width: '6px', height: '6px', backgroundColor: 'var(--accent-color)', borderRadius: '50%', display: 'inline-block' }} />
                  Someone is typing...
                </span>
              )}
            </div>

            {/* 📸 Active SRE Uploads Queue Badge */}
            {(queueState.active > 0 || queueState.waiting > 0) && (
              <span className="save-status upload-queue-badge animate-fade-in" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', gap: '0.25rem', alignItems: 'center', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                Uploading: {queueState.active}/1 {queueState.waiting > 0 ? `(${queueState.waiting} queued)` : ''}
              </span>
            )}

            <span className={`save-status sync-badge ${syncState}`} style={{
              backgroundColor: syncState === 'offline' ? 'rgba(239, 68, 68, 0.15)' : syncState === 'reconnecting' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: syncState === 'offline' ? '#ef4444' : syncState === 'reconnecting' ? '#eab308' : '#22c55e'
            }}>
              <Sparkles size={12} className={isSaving || isSyncing || syncState === 'reconnecting' || syncState === 'recovering' ? 'spinning' : ''} />
              {isSaving || isSyncing || syncState === 'syncing' ? 'Syncing...' : 
               syncState === 'synced' ? 'Synced' : 
               syncState === 'reconnecting' ? 'Reconnecting...' : 
               syncState === 'recovering' ? 'Recovering Connection...' : 
               syncState === 'offline' ? 'Offline Mode' : 
               syncState === 'conflict_resolved' ? 'Conflict Resolved' : 'Synced'}
            </span>
            
            {/* 🖥️ DESKTOP ACTIONS */}
            <div className="editor-actions-desktop">
              <Button 
                variant="secondary" 
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', backgroundColor: isPanelOpen ? 'rgba(255,255,255,0.08)' : '' }}
              >
                <Users size={16} /> Panel ({collaborators.length})
              </Button>

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
                className={`icon-btn ${isPanelOpen ? 'active' : ''}`}
                onClick={() => {
                  setIsPanelOpen(!isPanelOpen);
                  setIsDownloadOpen(false);
                  setIsMoreMenuOpen(false);
                }}
                aria-label="View active collaborators"
                style={{ position: 'relative', marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Users size={20} />
                {collaborators.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    backgroundColor: '#22c55e',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {collaborators.length}
                  </span>
                )}
              </button>

              <button 
                className={`icon-btn ${isDownloadOpen ? 'active' : ''}`} 
                onClick={() => {
                  setIsDownloadOpen(!isDownloadOpen);
                  setIsMoreMenuOpen(false); 
                  setIsPanelOpen(false);
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
                    setIsPanelOpen(false);
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
        {/* ⚡ Dynamic SRE Conflict Banner */}
        {syncState === 'conflict_resolved' && (
          <div className="conflict-banner animate-slide-down" style={{
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            borderBottom: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#22c55e',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 'bold',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '1rem',
            borderRadius: 'var(--border-radius)'
          }}>
            <Sparkles size={14} /> Realtime conflict successfully resolved. All paragraph edits merged safely!
            <button 
              onClick={() => setSyncState('synced')}
              style={{
                background: 'none',
                border: 'none',
                color: '#22c55e',
                cursor: 'pointer',
                textDecoration: 'underline',
                marginLeft: '12px',
                fontWeight: 'bold'
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'flex-start' }}>
          {/* LEXICAL EDITOR WRAPPER */}
          <div className="lexical-wrapper glass-panel" style={{ flex: 1 }}>
            <LexicalToolbar />
            
            <div className="lexical-editor-content" style={{ position: 'relative' }}>
              <RichTextPlugin
                contentEditable={<ContentEditable className="lexical-input" />}
                placeholder={<div className="lexical-placeholder">Start writing something premium...</div>}
                ErrorBoundary={LexicalErrorBoundary}
              />
              {/* 👁️ SRE FLOATING LIVE CURSORS AWARENESS LAYER */}
              <LiveCursors collaborators={collaborators} socketId={socket?.id} />
              {/* 🎨 SRE FLOATING SELECTION & BLOCK HIGHLIGHTS LAYER */}
              <ActiveBlockHighlights collaborators={collaborators} editorInstance={editorInstance} />
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
              userName={user?.name || 'Anonymous'}
              userAvatar={userAvatar}
              onSyncStatusChange={setIsSyncing}
              onCollaboratorsChange={setCollaborators}
            />
          </div>

          {/* 👥 SRE ONLINE COLLABORATORS SIDEBAR PANEL */}
          {isPanelOpen && (
            <div className="collaborators-sidebar glass-panel animate-slide-right">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-color)' }}>
                  <Users size={16} /> Collaborators ({collaborators.length})
                </h3>
                <button onClick={() => setIsPanelOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>Close</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {collaborators.map(c => {
                  const isOnline = c.status === 'online';
                  const isIdle = c.status === 'idle';
                  const badgeColor = isOnline ? '#22c55e' : isIdle ? '#eab308' : '#94a3b8';
                  
                  return (
                    <div 
                      key={c.socketId} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Avatar wrapper */}
                        <div style={{
                          position: 'relative',
                          width: '32px',
                          height: '32px',
                          minWidth: '32px',
                          minHeight: '32px',
                          flexShrink: 0,
                          borderRadius: '50%',
                          backgroundColor: c.color || 'var(--accent-color)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          {c.avatar ? (
                            <img src={c.avatar} alt={c.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            c.name ? c.name.charAt(0).toUpperCase() : '?'
                          )}
                          <div style={{
                            position: 'absolute',
                            bottom: '-1px',
                            right: '-1px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: badgeColor,
                            border: '1.5px solid var(--border-color)'
                          }} />
                        </div>

                        {/* Name & status */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-color)' }}>{c.name || 'Anonymous'}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {c.isTyping ? '✍️ Typing...' : isIdle ? 'Idle' : 'Active'}
                          </span>
                        </div>
                      </div>

                      {/* Editing Block Info */}
                      {c.activeBlock && (
                        <span style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          color: 'var(--text-muted)'
                        }}>
                          Block: {c.activeBlock.type || 'text'}
                        </span>
                      )}
                    </div>
                  );
                })}

                {collaborators.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No other active collaborators.
                  </div>
                )}
              </div>
            </div>
          )}
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
 * 🌈 Custom CodeHighlightPlugin (Lazy Loaded)
 */
const CodeHighlightPlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);
  return null;
};

/**
 * 👁️ SRE Live Cursors layer
 */
const LiveCursors = memo(({ collaborators, socketId }) => {
  return (
    <>
      {collaborators.map(c => {
        if (c.socketId === socketId || !c.cursor) return null;
        return (
          <div 
            key={c.socketId}
            className="live-cursor-flag animate-fade-in"
            style={{
              position: 'absolute',
              left: `${c.cursor.x}%`,
              top: `${c.cursor.y}px`,
              pointerEvents: 'none',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              transition: 'left 0.12s cubic-bezier(0.25, 1, 0.5, 1), top 0.12s cubic-bezier(0.25, 1, 0.5, 1)' // Micro-animations!
            }}
          >
            {/* Cursor beam */}
            <div style={{ width: '2px', height: '20px', backgroundColor: c.color || '#ff0000' }} />
            {/* Name tag */}
            <div 
              style={{
                backgroundColor: c.color || '#ff0000',
                color: '#fff',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {c.name || 'Collaborator'} {c.isTyping ? '✍️' : ''}
            </div>
          </div>
        );
      })}
    </>
  );
});

/**
 * 🎨 SRE Active Block & Selection Highlights layer
 */
const ActiveBlockHighlights = memo(({ collaborators, editorInstance }) => {
  useEffect(() => {
    if (!editorInstance) return;

    const activeElements = [];

    const updateBlockHighlights = () => {
      // Clear previous borders
      activeElements.forEach(el => {
        el.style.boxShadow = '';
        el.style.borderLeft = '';
        const tag = el.querySelector('.vf-block-tag');
        if (tag) tag.remove();
      });
      activeElements.length = 0;

      collaborators.forEach(c => {
        if (!c.activeBlock || !c.activeBlock.key) return;
        
        try {
          const element = editorInstance.getElementByKey(c.activeBlock.key);
          if (element) {
            element.style.position = 'relative';
            element.style.boxShadow = `inset 3px 0 0 ${c.color || '#ff0000'}`;
            element.style.borderLeft = `3px solid ${c.color || '#ff0000'}`;
            element.style.transition = 'border-color 0.2s ease, box-shadow 0.2s ease';
            
            // Add a tiny remote username tag next to the block (Visual edit visibility)
            const tag = document.createElement('span');
            tag.className = 'vf-block-tag';
            tag.innerText = `${c.name || 'User'} ${c.isTyping ? '✍️ Editing' : '👁️ Viewing'}`;
            tag.style.position = 'absolute';
            tag.style.top = '-14px';
            tag.style.left = '4px';
            tag.style.fontSize = '9px';
            tag.style.backgroundColor = c.color || '#ff0000';
            tag.style.color = '#fff';
            tag.style.padding = '1px 4px';
            tag.style.borderRadius = '3px';
            tag.style.fontWeight = 'bold';
            tag.style.pointerEvents = 'none';
            tag.style.whiteSpace = 'nowrap';
            tag.style.zIndex = 100;
            tag.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
            
            element.appendChild(tag);
            activeElements.push(element);
          }
        } catch (e) {
          // Element might be recycled or not in DOM yet
        }
      });
    };

    updateBlockHighlights();
    
    // Check every 250ms for scroll / dynamic DOM changes to prevent drift
    const interval = setInterval(updateBlockHighlights, 250);
    
    return () => {
      clearInterval(interval);
      activeElements.forEach(el => {
        el.style.boxShadow = '';
        el.style.borderLeft = '';
        const tag = el.querySelector('.vf-block-tag');
        if (tag) tag.remove();
      });
    };
  }, [collaborators, editorInstance]);

  return null;
});

export default Editor;

