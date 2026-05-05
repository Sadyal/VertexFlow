import { memo } from 'react';
import DocCard from './DocCard';
import Loader from '../../../components/common/Loader';
import { FileQuestion } from 'lucide-react';
import './DocumentUI.css';

/**
 * @component DocList
 * @description Renders a responsive CSS grid of document cards. 
 * Optimized with React.memo to prevent expensive re-renders across the entire list.
 */
const DocList = memo(({ docs, isLoading, error, onDelete, onRename }) => {
  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  if (!docs || docs.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        <div className="empty-state-icon-wrapper">
          <FileQuestion size={64} strokeWidth={1} className="text-muted" />
        </div>
        <h3>No documents found</h3>
        <p>Your workspace is empty. Create your first document to start collaborating!</p>
      </div>
    );
  }

  return (
    <div className="doc-grid">
      {docs.map((doc) => (
        <DocCard 
          key={doc._id || doc.id} 
          doc={doc} 
          onDelete={onDelete} 
          onRename={onRename} 
        />
      ))}
    </div>
  );
});

DocList.displayName = 'DocList';
export default DocList;
