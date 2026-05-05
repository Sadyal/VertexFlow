import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Users, Sparkles } from 'lucide-react';
import { useDocuments } from '../doc.hooks';
import { useAuth } from '../../../context/AuthContext';
import DocList from '../components/DocList';
import Button from '../../../components/common/Button';
import Skeleton from '../../../components/common/Skeleton';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';
import '../components/DocumentUI.css';

// ==========================================
// SKELETON COMPONENT
// ==========================================
const DashboardSkeleton = memo(() => (
  <div className="dashboard-container animate-fade-in">
    <div className="dashboard-header">
      <div>
        <Skeleton width="250px" height="2.5rem" style={{ marginBottom: '0.5rem' }} />
        <Skeleton width="180px" height="1.2rem" />
      </div>
      <Skeleton width="140px" height="3rem" borderRadius="var(--radius-md)" />
    </div>
    
    <div className="dashboard-content">
      {[1, 2].map(section => (
        <div key={section} className="dashboard-section">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Skeleton width="24px" height="24px" />
            <Skeleton width="150px" height="24px" />
          </div>
          <div className="doc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card" style={{ padding: '1.5rem', height: '160px' }}>
                <Skeleton width="40px" height="40px" borderRadius="10px" style={{ marginBottom: '1rem' }} />
                <Skeleton width="70%" height="1.2rem" style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="40%" height="0.8rem" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
));

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
        content: '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}' 
      });
      if (newDoc && (newDoc.id || newDoc._id)) {
        navigate(`/docs/${newDoc.id || newDoc._id}`);
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
  if (isLoading && docs.length === 0) return <DashboardSkeleton />;

  return (
    <div className="dashboard-container animate-fade-in">
      {/* ==========================================
       * DASHBOARD HERO / HEADER
       * ========================================== */}
      <div className="dashboard-header">
        <div className="animate-slide-in">
          <h1 className="dashboard-title">
            <Sparkles size={24} className="accent-sparkle" />
            Welcome back, {user?.name?.split(' ')[0] || 'User'}
          </h1>
          <p className="dashboard-subtitle">
            {docs.length > 0 
              ? `You have ${ownedDocs.length} documents ready for editing.`
              : "Let's create your first premium document today."}
          </p>
        </div>
        
        <div className="dashboard-header-actions">
          <Button 
            onClick={handleCreateNew} 
            isLoading={isCreating}
            variant="primary"
            className="glass-button glow-on-hover"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              padding: '0.8rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: '600'
            }}
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>Create New</span>
          </Button>
        </div>
      </div>

      {error && isOnline && (
        <div className="error-banner glass animate-fade-in">
          {error}
        </div>
      )}

      {/* ==========================================
       * MAIN CONTENT AREA
       * ========================================== */}
      <div className="dashboard-content">
        
        {/* SECTION: MY DOCUMENTS */}
        <div className="dashboard-section animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="section-title">
            <FileText size={22} className="section-icon" />
            <span>My Workspace</span>
            <span className="section-count">{ownedDocs.length}</span>
          </h2>
          <DocList 
            docs={ownedDocs} 
            onDelete={removeDoc} 
            onRename={renameDoc} 
            isLoading={isLoading} // Optional: DocList could handle its own internal skeleton
          />
        </div>

        {/* SECTION: SHARED DOCUMENTS */}
        {(sharedDocs.length > 0 || (isLoading && docs.length > 0)) && (
          <div className="dashboard-section animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="section-title">
              <Users size={22} className="section-icon" />
              <span>Shared with Me</span>
              <span className="section-count">{sharedDocs.length}</span>
            </h2>
            <DocList 
              docs={sharedDocs} 
              onDelete={removeDoc} 
              onRename={renameDoc} 
            />
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && docs.length === 0 && (
          <div className="empty-state-container animate-scale-in">
            <div className="empty-state-icon">
              <FileText size={48} strokeWidth={1} />
            </div>
            <h3>No documents found</h3>
            <p>Get started by creating your first document above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

