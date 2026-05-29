import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { adminApi } from '../admin.api';
import { useAdminData } from '../admin.hooks';
import { Search, ChevronLeft, ChevronRight, X, MoreVertical, Shield, Trash2, Mail, UserCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import Skeleton from '../../../components/common/Skeleton';
import DeleteModal from '../../document/components/DeleteModal';
import '../admin.css';

const getAvatarUrl = (avatar) => {
  if (!avatar) return '';
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
  return `${import.meta.env.VITE_API_URL}${avatar}`;
};

// 🚀 PERFORMANCE: Memoized Table Row to prevent re-renders during search
const UserRow = memo(({ user, activeMenu, setActiveMenu, isProcessing, handleToggleRole, setShowDeleteModal }) => (
  <tr>
    <td>
      <div className="user-cell">
        <div className="user-avatar-mini" style={{ background: user.role === 'admin' ? 'var(--accent-primary)' : 'var(--bg-tertiary)', overflow: 'hidden' }}>
          {user.avatar ? (
            <img 
              src={getAvatarUrl(user.avatar)} 
              alt={user.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            user.name.charAt(0)
          )}
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
        aria-label={`Actions for ${user.name}`}
        aria-expanded={activeMenu === user._id}
      >
        <MoreVertical size={18} />
      </button>

      {activeMenu === user._id && (
        <div className="admin-dropdown glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleToggleRole(user._id, user.role)} aria-label={user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}>
            {user.role === 'admin' ? <><ShieldAlert size={16} /> Demote to User</> : <><Shield size={16} /> Promote to Admin</>}
          </button>
          <button onClick={() => window.location.href = `mailto:${user.email}`} aria-label="Contact User">
            <Mail size={16} /> Contact User
          </button>
          <div className="dropdown-divider"></div>
          <button className="danger" onClick={() => setShowDeleteModal(user)} aria-label="Delete Account">
            <Trash2 size={16} /> Delete Account
          </button>
        </div>
      )}
    </td>
  </tr>
));

// 🦴 PERFORMANCE: Skeleton Loader for Table
const TableSkeleton = () => (
  <>
    {[...Array(5)].map((_, i) => (
      <tr key={`skeleton-${i}`}>
        <td>
          <div className="user-cell">
            <Skeleton width="36px" height="36px" borderRadius="50%" />
            <div>
              <Skeleton width="120px" height="14px" />
              <Skeleton width="180px" height="12px" className="mt-1" />
            </div>
          </div>
        </td>
        <td><Skeleton width="60px" height="24px" borderRadius="20px" /></td>
        <td><Skeleton width="30px" height="20px" /></td>
        <td><Skeleton width="100px" height="20px" /></td>
        <td><Skeleton width="30px" height="30px" /></td>
      </tr>
    ))}
  </>
);

const AdminUsers = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [isProcessing, setIsProcessing] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  // 🌍 SEO & Title
  useEffect(() => {
    document.title = 'User Management | VertexFlow Admin';
  }, []);

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
    return adminApi.getUsersList(page, 10, debouncedSearch, roleFilter);
  }, [debouncedSearch, roleFilter]);
  
  const cacheKey = useMemo(() => ({ 
    type: 'list', 
    store: 'usersList', 
    id: `page_${currentPage}_${debouncedSearch}_${roleFilter}` 
  }), [currentPage, debouncedSearch, roleFilter]);

  const { 
    data: users, 
    isLoading, 
    fetchData, 
    pagination, 
    setData 
  } = useAdminData(fetcher, cacheKey);

  useEffect(() => {
    fetchData(currentPage);
  }, [debouncedSearch, currentPage, roleFilter, fetchData]);

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
      console.error('Update role failed', err);
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
      console.error('Delete user failed', err);
    } finally {
      setIsProcessing(null);
      setShowDeleteModal(null);
    }
  };

  return (
    <div className="admin-page animate-fade-in" onClick={() => setActiveMenu(null)}>
      <header className="admin-header">
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
              aria-label="Filter by role"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="user">Users</option>
            </select>
          </div>

          <div className="admin-search-box glass-panel">
            <Search size={18} className="search-icon" aria-hidden="true" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
              aria-label="Search users"
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="admin-table-container glass-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Role</th>
              <th scope="col">Docs</th>
              <th scope="col">Joined</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !users ? (
              <TableSkeleton />
            ) : users?.length === 0 ? (
              <tr><td colSpan="5" style={{textAlign:'center', padding: '3rem'}}>No users found.</td></tr>
            ) : (
              users?.map(user => (
                <UserRow 
                  key={user._id}
                  user={user}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  isProcessing={isProcessing}
                  handleToggleRole={handleToggleRole}
                  setShowDeleteModal={setShowDeleteModal}
                />
              ))
            )}
          </tbody>
        </table>

        {pagination?.pages > 1 && (
          <div className="admin-pagination">
            <span className="pagination-info">Page {pagination.page} of {pagination.pages}</span>
            <div className="pagination-buttons">
              <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1} className="pagination-btn" aria-label="Previous page"><ChevronLeft size={18} /></button>
              <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.pages} className="pagination-btn" aria-label="Next page"><ChevronRight size={18} /></button>
            </div>
          </div>
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
