import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Share2, Edit2, Trash2 } from 'lucide-react';
import { ROUTES } from '../../../utils/constants';
import ShareModal from './ShareModal';
import RenameModal from './RenameModal';
import DeleteModal from './DeleteModal';
import './DocumentUI.css';

/**
 * @component DocCard
 * @description A premium glassmorphic card representing a single document.
 * Wrapped in React.memo for high-performance rendering (prevents re-renders 
 * unless 'doc' prop explicitly changes).
 */
const DocCard = memo(({ doc, onDelete, onRename }) => {
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

  // ==========================================
  // RENDER LOGIC
  // ==========================================
  return (
    <>
      <div className="doc-card glass-panel group">
        <Link to={ROUTES.EDITOR(doc._id || doc.id)} className="doc-card-link">
          
          {/* Document Preview Area */}
          <div className="doc-card-preview">
            <div className="doc-card-preview-pattern"></div>
            <div className="doc-card-icon-wrapper">
              <FileText size={32} className="doc-icon" />
            </div>
          </div>
          
          {/* Document Meta Info */}
          <div className="doc-card-content">
            <h3 className="doc-card-title">{doc.title || 'Untitled Document'}</h3>
            <div className="doc-card-meta-row">
              <p className="doc-card-meta">Updated {formatDate(doc.updatedAt)}</p>
            </div>
          </div>
        </Link>
        
        {/* Quick Actions (Visible on Hover) */}
        <div className="doc-card-actions">
          <button 
            className="icon-btn action-btn" 
            title="Rename" 
            onClick={handleRenameClick}
          >
            <Edit2 size={16} />
          </button>
          <button 
            className="icon-btn action-btn" 
            title="Delete" 
            onClick={handleDeleteClick}
          >
            <Trash2 size={16} />
          </button>
          <button 
            className="icon-btn action-btn" 
            title="Share Document" 
            onClick={handleShareClick}
          >
            <Share2 size={16} />
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
