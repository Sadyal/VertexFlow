import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Users } from 'lucide-react';
import { useDocuments } from '../doc.hooks';
import { useAuth } from '../../../context/AuthContext';
import DocList from '../components/DocList';
import Button from '../../../components/common/Button';
import Loader from '../../../components/common/Loader';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import '../components/DocumentUI.css';

const Dashboard = () => {
  // ==========================================
  // STATE MANAGEMENT & HOOKS
  // ==========================================
  const navigate = useNavigate();
  const { user } = useAuth();
  const { docs, isLoading, createDoc, fetchDocs, removeDoc, renameDoc, error } = useDocuments();
  const { isOnline } = useNetworkStatus();
  const [isCreating, setIsCreating] = useState(false);

  // Fetch documents when the dashboard mounts
  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // ==========================================
  // FILTERING LOGIC
  // ==========================================
  const currentUserId = user?.id || user?._id;
  
  const ownedDocs = docs.filter(doc => 
    doc.owner === currentUserId || doc.owner?._id === currentUserId
  );
  
  const sharedDocs = docs.filter(doc => 
    doc.owner !== currentUserId && doc.owner?._id !== currentUserId
  );

  // ==========================================
  // EVENT HANDLERS
  // ==========================================
  const handleCreateNew = async () => {
    setIsCreating(true);
    try {
      const newDoc = await createDoc({ 
        title: 'Untitled Document', 
        content: '<p></p>' 
      });
      if (newDoc && newDoc.id) {
        navigate(`/docs/${newDoc.id}`);
      }
    } catch (err) {
      console.error('Failed to create document:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================
  if (isLoading) return <Loader fullScreen />;

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Your Documents</h1>
          <p className="dashboard-subtitle">Manage, edit, and share your workspace.</p>
        </div>
        <Button 
          onClick={handleCreateNew} 
          isLoading={isCreating}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={20} />
          <span>New Document</span>
        </Button>
      </div>

      {error && isOnline && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="dashboard-content">
        {/* SECTION: OWNED DOCUMENTS */}
        <div className="dashboard-section">
          <h2 className="section-title">
            <FileText size={20} className="section-icon" />
            My Documents
            <span className="section-count">{ownedDocs.length}</span>
          </h2>
          <DocList 
            docs={ownedDocs} 
            onDelete={removeDoc} 
            onRename={renameDoc} 
          />
        </div>

        {/* SECTION: SHARED DOCUMENTS */}
        {(sharedDocs.length > 0 || isLoading) && (
          <div className="dashboard-section">
            <h2 className="section-title">
              <Users size={20} className="section-icon" />
              Shared with Me
              <span className="section-count">{sharedDocs.length}</span>
            </h2>
            <DocList 
              docs={sharedDocs} 
              onDelete={removeDoc} 
              onRename={renameDoc} 
            />
          </div>
        )}
      </div>
    </div>
  );
};


export default Dashboard;
