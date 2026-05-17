import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../admin.api';
import { Search, ChevronLeft, ChevronRight, FileText, Lock, Globe, MoreVertical, Trash2, Eye, EyeOff } from 'lucide-react';
import Loader from '../../../components/common/Loader';
import '../admin.css';

const getAvatarUrl = (avatar) => {
  if (!avatar) return '';
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
  return `${import.meta.env.VITE_API_URL}${avatar}`;
};

const AdminDocs = () => {
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [isProcessing, setIsProcessing] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDocs = useCallback(async (page, search) => {
    setIsLoading(true);
    try {
      const data = await adminApi.getDocsList(page, 10, search);
      if (data.success) {
        setDocuments(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs(pagination.page, debouncedSearch);
  }, [pagination.page, debouncedSearch, fetchDocs]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // ACTIONS
  const toggleVisibility = async (docId, currentStatus) => {
    const newStatus = !currentStatus;
    setIsProcessing(docId);
    try {
      const res = await adminApi.updateDocument(docId, { isPublic: newStatus });
      if (res.success) {
        setDocuments(prev => prev.map(d => d._id === docId ? { ...d, isPublic: newStatus } : d));
      }
    } catch (err) {
      alert('Failed to update document visibility');
    } finally {
      setIsProcessing(null);
      setActiveMenu(null);
    }
  };

  const deleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document? This cannot be undone.')) return;
    
    setIsProcessing(docId);
    try {
      const res = await adminApi.deleteDocument(docId);
      if (res.success) {
        setDocuments(prev => prev.filter(d => d._id !== docId));
      }
    } catch (err) {
      alert('Failed to delete document');
    } finally {
      setIsProcessing(null);
      setActiveMenu(null);
    }
  };

  return (
    <div className="admin-page animate-fade-in" onClick={() => setActiveMenu(null)}>
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Document Oversight</h1>
          <p>Monitor platform documents and collaboration.</p>
        </div>
        
        <div className="admin-search-box glass-panel">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by title..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-input"
          />
        </div>
      </div>

      <div className="admin-table-container glass-panel">
        {isLoading ? (
          <div className="admin-page-loading">
            <Loader />
            <p>Scanning document repository...</p>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Owner</th>
                  <th>Last Updated</th>
                  <th>Visibility</th>
                  <th>Collabs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No documents found.
                    </td>
                  </tr>
                ) : (
                  documents.map(doc => (
                    <tr key={doc._id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-mini" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="user-name">{doc.title}</div>
                            <div className="user-email" style={{ fontSize: '0.75rem' }}>ID: {doc._id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>
                            {doc.owner?.avatar ? <img src={getAvatarUrl(doc.owner.avatar)} alt="Owner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (doc.owner?.name?.charAt(0) || '?')}
                          </div>
                          <span style={{ fontSize: '0.85rem' }}>{doc.owner?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>{new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td>
                        <div className="status-cell">
                          {doc.isPublic ? (
                            <><Globe size={14} color="var(--success)" /> <span style={{ fontSize: '0.75rem' }}>Public</span></>
                          ) : (
                            <><Lock size={14} color="var(--text-muted)" /> <span style={{ fontSize: '0.75rem' }}>Private</span></>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: '600' }}>{doc.collaborators?.length || 0}</td>
                      <td style={{ position: 'relative' }}>
                        <button 
                          className={`icon-action-btn ${activeMenu === doc._id ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === doc._id ? null : doc._id);
                          }}
                          disabled={isProcessing === doc._id}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {/* DROPDOWN MENU */}
                        {activeMenu === doc._id && (
                          <div className="admin-dropdown glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => toggleVisibility(doc._id, doc.isPublic)}>
                              {doc.isPublic ? (
                                <><EyeOff size={16} /> Set Private</>
                              ) : (
                                <><Eye size={16} /> Set Public</>
                              )}
                            </button>
                            <div className="dropdown-divider"></div>
                            <button className="danger" onClick={() => deleteDoc(doc._id)}>
                              <Trash2 size={16} /> Delete Document
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {pagination.pages > 1 && (
              <div className="admin-pagination">
                <span className="pagination-info">
                  Showing page {pagination.page} of {pagination.pages} ({pagination.total} documents)
                </span>
                <div className="pagination-buttons">
                  <button 
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="pagination-btn"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="pagination-btn"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDocs;
