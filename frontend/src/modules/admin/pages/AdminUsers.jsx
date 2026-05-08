import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../admin.api';
import { useAdminData } from '../admin.hooks';
import { Search, ChevronLeft, ChevronRight, X, MoreVertical, Shield, Trash2, Mail, UserCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import Loader from '../../../components/common/Loader';
import DeleteModal from '../../document/components/DeleteModal';
import '../admin.css';

const AdminUsers = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [isProcessing, setIsProcessing] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  // Search Debounce & Page Reset
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Unified Data Hook
  const fetcher = useCallback((page) => {
    // Note: Backend might need update to support role filter, but we'll prepare the UI
    return adminApi.getUsersList(page, 10, debouncedSearch);
  }, [debouncedSearch]);
  
  const cacheKey = useMemo(() => ({ 
    type: 'list', 
    store: 'usersList', 
    id: `page_${currentPage}_${debouncedSearch}_${roleFilter}` 
  }), [currentPage, debouncedSearch, roleFilter]);

  const { 
    data: rawUsers, 
    isLoading, 
    fetchData, 
    pagination, 
    setData 
  } = useAdminData(fetcher, cacheKey);

  // 🚀 Frontend Filtering for Role (until backend supports it)
  const users = useMemo(() => {
    if (!rawUsers) return null;
    if (roleFilter === 'all') return rawUsers;
    return rawUsers.filter(u => u.role === roleFilter);
  }, [rawUsers, roleFilter]);

  useEffect(() => {
    fetchData(currentPage);
  }, [debouncedSearch, currentPage, fetchData]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination?.pages || 1)) {
      setCurrentPage(newPage);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setIsProcessing(userId);
    try {
      const res = await adminApi.updateUser(userId, { role: newRole });
      if (res.success) {
        setData(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      }
    } catch (err) {
      alert('Failed to update user role');
    } finally {
      setIsProcessing(null);
      setActiveMenu(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    setIsProcessing(userId);
    try {
      const res = await adminApi.deleteUser(userId);
      if (res.success) {
        setData(prev => prev.filter(u => u._id !== userId));
      }
    } catch (err) {
      alert('Failed to delete user');
    } finally {
      setIsProcessing(null);
      setShowDeleteModal(null);
    }
  };

  return (
    <div className="admin-page animate-fade-in" onClick={() => setActiveMenu(null)}>
      <div className="admin-header">
        <div>
          <h1>User Management</h1>
          <p>Manage access, roles, and security for platform users.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="admin-filter-box glass-panel">
            <select 
              value={roleFilter} 
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="admin-select"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>
          </div>

          <div className="admin-search-box glass-panel">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="admin-table-container glass-panel">
        {isLoading && !users ? (
          <div className="admin-page-loading">
            <Loader />
            <p>Scanning user records...</p>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Docs</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.length === 0 ? (
                  <tr><td colSpan="5" style={{textAlign:'center', padding: '3rem'}}>No users found.</td></tr>
                ) : (
                  users?.map(user => (
                    <tr key={user._id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-mini" style={{ background: user.role === 'admin' ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="user-name">{user.name}</div>
                            <div className="user-email">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role === 'admin' ? <Shield size={12} /> : <UserCheck size={12} />}
                          {user.role}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>{user.totalDocuments || 0}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td style={{ position: 'relative' }}>
                        <button 
                          className={`icon-action-btn ${activeMenu === user._id ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenu(activeMenu === user._id ? null : user._id);
                          }}
                          disabled={isProcessing === user._id}
                        >
                          <MoreVertical size={18} />
                        </button>

                        {activeMenu === user._id && (
                          <div className="admin-dropdown glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleToggleRole(user._id, user.role)}>
                              {user.role === 'admin' ? <><ShieldAlert size={16} /> Demote to User</> : <><Shield size={16} /> Promote to Admin</>}
                            </button>
                            <button onClick={() => window.location.href = `mailto:${user.email}`}>
                              <Mail size={16} /> Contact User
                            </button>
                            <div className="dropdown-divider"></div>
                            <button className="danger" onClick={() => setShowDeleteModal(user)}>
                              <Trash2 size={16} /> Delete Account
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {pagination?.pages > 1 && (
              <div className="admin-pagination">
                <span className="pagination-info">Page {pagination.page} of {pagination.pages}</span>
                <div className="pagination-buttons">
                  <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="pagination-btn"><ChevronLeft size={18} /></button>
                  <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages} className="pagination-btn"><ChevronRight size={18} /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showDeleteModal && (
        <DeleteModal 
          title={`User: ${showDeleteModal.name}`}
          onClose={() => setShowDeleteModal(null)}
          onDelete={() => handleDeleteUser(showDeleteModal._id)}
        />
      )}
    </div>
  );
};

export default AdminUsers;
