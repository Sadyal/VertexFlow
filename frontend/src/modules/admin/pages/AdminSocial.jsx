import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { adminApi } from '../admin.api';
import { useAdminData } from '../admin.hooks';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  MoreVertical, 
  Trash2, 
  Eye, 
  Heart, 
  MessageSquare, 
  Globe, 
  Calendar, 
  Image as ImageIcon,
  User as UserIcon,
  MessageCircle
} from 'lucide-react';
import Skeleton from '../../../components/common/Skeleton';
import '../admin.css';

const getAvatarUrl = (avatar) => {
  if (!avatar) return '';
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
  return `${import.meta.env.VITE_API_URL}${avatar}`;
};

// 🚀 PERFORMANCE: Memoized Table Row to prevent unnecessary re-renders
const PostRow = memo(({ post, activeMenu, setActiveMenu, isProcessing, handleOpenModal, handleDeleteClick }) => {
  const truncatedContent = post.content.length > 80 
    ? post.content.substring(0, 80) + '...' 
    : post.content;

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'Unknown';
    }
  };

  return (
    <tr>
      <td>
        <div className="user-cell">
          <div className="user-avatar-mini" style={{ width: '32px', height: '32px' }}>
            {post.author?.avatar ? (
              <img 
                src={getAvatarUrl(post.author.avatar)} 
                alt={post.author?.name} 
              />
            ) : (
              post.author?.name?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <div className="user-name" style={{ fontSize: '0.9rem' }}>{post.author?.name || 'Anonymous'}</div>
            <div className="user-email" style={{ fontSize: '0.75rem' }}>{post.author?.email || 'No email'}</div>
          </div>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {post.image && <ImageIcon size={16} className="text-accent" style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {truncatedContent || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>[Image only]</span>}
          </span>
        </div>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
            <Heart size={14} /> {post.likesCount || 0}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
            <MessageSquare size={14} /> {post.commentsCount || post.comments?.length || 0}
          </span>
        </div>
      </td>
      <td style={{ fontSize: '0.85rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={14} color="var(--text-muted)" />
          {formatDate(post.createdAt)}
        </span>
      </td>
      <td style={{ position: 'relative' }}>
        <button 
          className={`icon-action-btn ${activeMenu === post._id ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenu(activeMenu === post._id ? null : post._id);
          }}
          disabled={isProcessing === post._id}
          aria-label="Actions"
        >
          <MoreVertical size={18} />
        </button>

        {activeMenu === post._id && (
          <div className="admin-dropdown glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setActiveMenu(null); handleOpenModal(post); }}>
              <Eye size={16} /> View Details
            </button>
            <div className="dropdown-divider"></div>
            <button className="danger" onClick={() => { setActiveMenu(null); handleDeleteClick(post); }}>
              <Trash2 size={16} /> Delete Post
            </button>
          </div>
        )}
      </td>
    </tr>
  );
});

// 🦴 PERFORMANCE: Table Skeleton Loader
const TableSkeleton = () => (
  <>
    {[...Array(5)].map((_, i) => (
      <tr key={`social-skeleton-${i}`}>
        <td>
          <div className="user-cell">
            <Skeleton width="32px" height="32px" borderRadius="50%" />
            <div>
              <Skeleton width="100px" height="12px" />
              <Skeleton width="120px" height="10px" className="mt-1" />
            </div>
          </div>
        </td>
        <td>
          <Skeleton width="80%" height="12px" />
        </td>
        <td>
          <Skeleton width="60px" height="12px" />
        </td>
        <td>
          <Skeleton width="80px" height="12px" />
        </td>
        <td>
          <Skeleton width="24px" height="24px" />
        </td>
      </tr>
    ))}
  </>
);

const AdminSocial = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [isProcessing, setIsProcessing] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isCommentDeleting, setIsCommentDeleting] = useState(null);

  // SEO & Title
  useEffect(() => {
    document.title = 'Social Hub Moderation | VertexFlow Admin';
  }, []);

  // Search Debounce & Page Reset
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Unified Data hook
  const fetcher = useCallback((page) => {
    return adminApi.getPostsList(page, 10, debouncedSearch);
  }, [debouncedSearch]);

  const cacheKey = useMemo(() => ({
    type: 'list',
    store: 'postsList',
    id: `page_${currentPage}_${debouncedSearch}`
  }), [currentPage, debouncedSearch]);

  const {
    data: posts,
    isLoading,
    fetchData,
    pagination,
    setData
  } = useAdminData(fetcher, cacheKey);

  useEffect(() => {
    fetchData(currentPage);
  }, [debouncedSearch, currentPage, fetchData]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (pagination?.pages || 1)) {
      setCurrentPage(newPage);
    }
  };

  const handleOpenModal = (post) => {
    setSelectedPost(post);
  };

  const handleCloseModal = () => {
    setSelectedPost(null);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This will hide it from the Social Hub.')) return;
    
    setIsProcessing(postId);
    try {
      const res = await adminApi.deletePost(postId);
      if (res.success) {
        setData(prev => prev.filter(p => p._id !== postId));
        if (selectedPost?._id === postId) {
          setSelectedPost(null);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to delete post');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    setIsCommentDeleting(commentId);
    try {
      const res = await adminApi.deleteComment(postId, commentId);
      if (res.success) {
        // Update selected post state to remove the comment
        setSelectedPost(prev => {
          if (!prev) return null;
          return {
            ...prev,
            comments: prev.comments.filter(c => c._id !== commentId)
          };
        });

        // Also update the posts list cache so it stays synced
        setData(prev => prev.map(p => {
          if (p._id === postId) {
            const updatedComments = (p.comments || []).filter(c => c._id !== commentId);
            return {
              ...p,
              comments: updatedComments,
              commentsCount: Math.max(0, (p.commentsCount || 0) - 1)
            };
          }
          return p;
        }));
      }
    } catch (err) {
      alert(err.message || 'Failed to delete comment');
    } finally {
      setIsCommentDeleting(null);
    }
  };

  return (
    <div className="admin-page animate-fade-in" onClick={() => setActiveMenu(null)}>
      <header className="admin-header">
        <div>
          <h1>Social Hub Moderation</h1>
          <p>Monitor platform posts, moderate user thoughts, and remove policy-violating comments.</p>
        </div>

        <div className="admin-search-box glass-panel">
          <Search size={18} className="search-icon" aria-hidden="true" />
          <input 
            type="text" 
            placeholder="Search by thoughts or author..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-input"
            aria-label="Search thoughts"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      <div className="admin-table-container glass-panel">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Author</th>
              <th scope="col">Thought / Post Content</th>
              <th scope="col">Engagement</th>
              <th scope="col">Date Posted</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && !posts ? (
              <TableSkeleton />
            ) : posts?.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No posts found matching the criteria.
                </td>
              </tr>
            ) : (
              posts?.map(post => (
                <PostRow 
                  key={post._id}
                  post={post}
                  activeMenu={activeMenu}
                  setActiveMenu={setActiveMenu}
                  isProcessing={isProcessing}
                  handleOpenModal={handleOpenModal}
                  handleDeleteClick={() => handleDeletePost(post._id)}
                />
              ))
            )}
          </tbody>
        </table>

        {pagination?.pages > 1 && (
          <div className="admin-pagination">
            <span className="pagination-info">Page {pagination.page} of {pagination.pages} ({pagination.total} posts)</span>
            <div className="pagination-buttons">
              <button 
                onClick={() => handlePageChange(pagination.page - 1)} 
                disabled={pagination.page === 1} 
                className="pagination-btn" 
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => handlePageChange(pagination.page + 1)} 
                disabled={pagination.page === pagination.pages} 
                className="pagination-btn" 
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🛡️ POST DETAILS AND COMMENT MODERATION MODAL */}
      {selectedPost && (
        <div 
          className="admin-modal-overlay" 
          onClick={handleCloseModal}
        >
          <div 
            className="admin-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button 
              onClick={handleCloseModal}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              className="icon-action-btn"
              aria-label="Close details"
            >
              <X size={18} />
            </button>

            {/* Author details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div className="user-avatar-mini" style={{ width: '46px', height: '46px' }}>
                {selectedPost.author?.avatar ? (
                  <img 
                    src={getAvatarUrl(selectedPost.author.avatar)} 
                    alt={selectedPost.author?.name} 
                  />
                ) : (
                  selectedPost.author?.name?.charAt(0) || 'U'
                )}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{selectedPost.author?.name || 'Anonymous'}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Posted on {new Date(selectedPost.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* Post Content */}
            <div style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {selectedPost.content}
            </div>

            {/* Post Image */}
            {selectedPost.image && (
              <div 
                style={{ 
                  borderRadius: 'var(--radius-md)', 
                  overflow: 'hidden', 
                  maxHeight: '300px', 
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: '1px solid var(--border-color)'
                }}
              >
                <img 
                  src={selectedPost.image.startsWith('http') ? selectedPost.image : `${import.meta.env.VITE_API_URL}${selectedPost.image}`} 
                  alt="Post content" 
                  style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                />
              </div>
            )}

            {/* Engagement Panel & Moderate Post Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Heart size={18} color="var(--error)" fill="var(--error)" style={{ opacity: 0.8 }} />
                  <strong>{selectedPost.likesCount || 0}</strong> Likes
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <MessageCircle size={18} color="var(--accent-primary)" style={{ opacity: 0.8 }} />
                  <strong>{selectedPost.comments?.length || 0}</strong> Comments
                </span>
              </div>

              <button 
                className="btn-action danger" 
                onClick={() => handleDeletePost(selectedPost._id)}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={16} /> Delete Post
              </button>
            </div>

            {/* Comments List */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: '700' }}>
                <MessageSquare size={18} /> Moderate Comments
              </h4>

              {(!selectedPost.comments || selectedPost.comments.length === 0) ? (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No comments on this post yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {selectedPost.comments.map(comment => (
                    <div 
                      key={comment._id} 
                      style={{ 
                        display: 'flex', 
                        gap: '0.75rem', 
                        background: 'var(--bg-secondary)', 
                        padding: '0.75rem', 
                        borderRadius: 'var(--radius-md)',
                        position: 'relative',
                        border: '1px solid var(--border-highlight)'
                      }}
                    >
                      <div className="user-avatar-mini" style={{ width: '28px', height: '28px', flexShrink: 0 }}>
                        {comment.user?.avatar ? (
                          <img 
                            src={getAvatarUrl(comment.user.avatar)} 
                            alt={comment.user?.name} 
                          />
                        ) : (
                          comment.user?.name?.charAt(0) || 'U'
                        )}
                      </div>
                      
                      <div style={{ flex: 1, paddingRight: '2rem' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{comment.user?.name || 'Anonymous'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', wordBreak: 'break-word' }}>{comment.text}</div>
                      </div>

                      <button 
                        onClick={() => handleDeleteComment(selectedPost._id, comment._id)}
                        disabled={isCommentDeleting === comment._id}
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--error)',
                          cursor: 'pointer',
                          opacity: 0.7,
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px'
                        }}
                        className="icon-action-btn danger-hover"
                        aria-label="Delete comment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSocial;
