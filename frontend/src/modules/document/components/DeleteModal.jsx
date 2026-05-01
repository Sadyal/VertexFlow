import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Button from '../../../components/common/Button';
import './DocumentUI.css';

const DeleteModal = ({ title, onClose, onDelete }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass animate-fade-in" style={{ border: '1px solid rgba(255, 50, 50, 0.2)' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
            <AlertTriangle size={24} /> Delete Document
          </h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            Are you sure you want to delete <strong style={{ color: 'var(--text)' }}>"{title || 'Untitled Document'}"</strong>? 
            This action cannot be undone and will permanently remove the document for you and any collaborators.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirm} 
              fullWidth 
              isLoading={isLoading}
              style={{ backgroundColor: 'rgba(220, 38, 38, 0.9)', color: 'white' }}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
