import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { documentApi } from '../doc.api';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import './DocumentUI.css';

const ShareModal = ({ docId, onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setStatus(null);
    try {
      await documentApi.shareDoc(docId, { email });
      setStatus({ type: 'success', message: `Document shared with ${email}` });
      setEmail('');
    } catch (error) {
      setStatus({ type: 'error', message: error.message || `Failed to share document with ${email}` });
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass animate-fade-in">
        <div className="modal-header">
          <h2>Share Document</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <form onSubmit={handleShare}>
            <Input 
              label="Invite people" 
              placeholder="Enter email address..." 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
            <Button type="submit" fullWidth isLoading={isLoading} disabled={!email}>
              Send Invite
            </Button>
          </form>

          {status && (
            <div className={`status-message ${status.type}`}>
              {status.message}
            </div>
          )}

          <div className="share-link-section">
            <label className="input-label">Copy Link</label>
            <div className="link-box">
              <input type="text" readOnly value={window.location.href} className="link-input" />
              <Button variant="secondary" onClick={copyLink} style={{ padding: '0.5rem' }}>
                {copied ? <Check size={18} color="var(--success)" /> : <Copy size={18} />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
