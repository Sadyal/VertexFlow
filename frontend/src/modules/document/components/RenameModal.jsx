import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import './DocumentUI.css';

const RenameModal = ({ currentTitle, onClose, onRename }) => {
  const [title, setTitle] = useState(currentTitle || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || title === currentTitle) {
      onClose();
      return;
    }
    
    setIsLoading(true);
    try {
      await onRename(title.trim());
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass animate-fade-in">
        <div className="modal-header">
          <h2>Rename Document</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <Input 
              label="Document Name" 
              placeholder="Enter new name..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <Button type="button" variant="secondary" onClick={onClose} fullWidth>
                Cancel
              </Button>
              <Button type="submit" fullWidth isLoading={isLoading} disabled={!title.trim()}>
                Save Name
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RenameModal;
