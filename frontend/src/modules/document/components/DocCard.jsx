import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Share2, Edit2, Trash2 } from 'lucide-react';
import { ROUTES } from '../../../utils/constants';
import ShareModal from './ShareModal';
import RenameModal from './RenameModal';
import DeleteModal from './DeleteModal';
import { documentApi } from '../doc.api';
import { db } from '../../../utils/db';
import { useAuth } from '../../../context/AuthContext';
import './DocumentUI.css';

/**
 * @component DocCard
 * @description A premium glassmorphic card representing a single document.
 * Wrapped in React.memo for high-performance rendering (prevents re-renders 
 * unless 'doc' prop explicitly changes).
 */
const DocCard = memo(({ doc, onDelete, onRename }) => {
  const { user } = useAuth();
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ==========================================
  // HELPERS
  // ==========================================
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleShareClick = (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  const handleRenameClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRenameModalOpen(true);
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  // 🚀 SRE Warm Hover Prefetching Handler
  const handleMouseEnter = async () => {
    const docId = doc._id || doc.id;
    const currentUserId = user?._id || user?.id;
    if (!docId || !currentUserId) return;

    // Warm-prefetch the Editor route javascript chunk in the background!
    import('../pages/Editor').catch(() => {});

    try {
      // Avoid redundant API requests if local cache already exists
      const cached = await db.getDocument(docId, currentUserId);
      if (cached) return;

      const res = await documentApi.getDocById(docId);
      if (res.success && res.data?.content) {
        await db.saveDocument(docId, res.data.content, currentUserId);
      }
    } catch (err) {
      console.warn(`[Prefetch] Skipping warm load for doc ${docId}:`, err);
    }
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================
  return (
    <>
      <div 
        className="doc-card glass-panel animate-fade-in"
        onMouseEnter={handleMouseEnter}
      >
        <Link to={ROUTES.EDITOR(doc._id || doc.id)} className="doc-card-link" viewTransition>
          
          {/* Document Preview Area */}
          <div className="doc-card-preview">
            <div className="doc-card-preview-pattern"></div>
            <div className="doc-card-icon-wrapper">
              <FileText size={32} strokeWidth={1.5} className="doc-icon" />
            </div>
          </div>
          
          {/* Document Meta Info */}
          <div className="doc-card-content">
            <h3 className="doc-card-title">{doc.title || 'Untitled Document'}</h3>
            <div className="doc-card-meta-row">
              <div className="doc-card-meta">
                <span>Updated {formatDate(doc.updatedAt)}</span>
              </div>
            </div>
          </div>
        </Link>
        
        {/* Quick Actions (Visible on Hover) */}
        <div className="doc-card-actions">
          <button 
            className="action-btn" 
            title="Rename" 
            onClick={handleRenameClick}
          >
            <Edit2 size={16} />
          </button>
          <button 
            className="action-btn" 
            title="Share Document" 
            onClick={handleShareClick}
          >
            <Share2 size={16} />
          </button>
          <button 
            className="action-btn delete" 
            title="Delete" 
            onClick={handleDeleteClick}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Modals */}
      {isShareModalOpen && (
        <ShareModal 
          docId={doc._id || doc.id} 
          onClose={() => setIsShareModalOpen(false)} 
        />
      )}
      
      {isRenameModalOpen && (
        <RenameModal 
          currentTitle={doc.title} 
          onClose={() => setIsRenameModalOpen(false)} 
          onRename={(newTitle) => onRename(doc._id || doc.id, newTitle)} 
        />
      )}
      
      {isDeleteModalOpen && (
        <DeleteModal 
          title={doc.title} 
          onClose={() => setIsDeleteModalOpen(false)} 
          onDelete={() => onDelete(doc._id || doc.id)} 
        />
      )}
    </>
  );
});

DocCard.displayName = 'DocCard';
export default DocCard;
