import { useState, memo } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send, User as UserIcon, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../../context/AuthContext';

// ⚡ HIGH-PERFORMANCE MEMOIZED COMMENT ROW
const CommentRow = memo(({ comment, postAuthorId, currentUserId, isAdmin, onDeleteComment, postId }) => {
  const isCommentOwner = comment.user?._id === currentUserId || comment.user?.id === currentUserId;
  const canDeleteComment = isCommentOwner || postAuthorId === currentUserId || isAdmin;

  return (
    <div className="comment-item animate-slide-up">
      <div className="author-avatar small-avatar" style={{ fontSize: '0.7rem' }}>
        {comment.user?.avatar ? (
          <img 
            src={(comment.user.avatar.startsWith('http') || comment.user.avatar.startsWith('data:')) 
              ? comment.user.avatar 
              : `${import.meta.env.VITE_API_URL}${comment.user.avatar}`} 
            alt={comment.user.name} 
            loading="lazy"
            width="24"
            height="24"
          />
        ) : (
          comment.user?.name?.charAt(0) || 'U'
        )}
      </div>
      <div className="comment-bubble">
        <div className="comment-author">{comment.user?.name || 'User'}</div>
        <div className="comment-text">{comment.text}</div>
        
        {canDeleteComment && (
          <div className="comment-actions">
            <button 
              className="delete-comment-btn"
              onClick={() => {
                if (window.confirm('Delete this comment?')) {
                  onDeleteComment(postId, comment._id);
                }
              }}
              aria-label="Delete comment"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.comment === nextProps.comment &&
    prevProps.postAuthorId === nextProps.postAuthorId &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.isAdmin === nextProps.isAdmin
  );
});

// ⚡ HIGH-PERFORMANCE MEMOIZED COMMENTS LIST
const CommentList = memo(({ comments, postAuthorId, currentUserId, isAdmin, onDeleteComment, postId }) => {
  if (!comments || comments.length === 0) return null;

  return (
    <div className="comments-list">
      {comments.map((comment) => (
        <CommentRow
          key={comment._id}
          comment={comment}
          postAuthorId={postAuthorId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onDeleteComment={onDeleteComment}
          postId={postId}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.comments === nextProps.comments &&
    prevProps.postAuthorId === nextProps.postAuthorId &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.isAdmin === nextProps.isAdmin
  );
});

/**
 * 📝 POST ITEM COMPONENT
 * Wrapped in React.memo to prevent unnecessary re-renders when other posts change.
 */
const PostItem = memo(({ post, onLike, onComment, onDelete, onDeleteComment, priority = false }) => {
  const { user, userAvatar } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Logic to determine if it's a quote (short text, no image)
  const isQuote = post.content.length < 150 && !post.image;

  const handleLike = () => onLike(post._id);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onComment(post._id, commentText);
      setCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  const isAdmin = user?.role === 'admin';
  const isPostOwner = post.author?._id === user?.id || post.author?._id === user?._id;
  const canDeletePost = isPostOwner || isAdmin;

  return (
    <article className="post-card animate-fade-in" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
      {/* HEADER */}
      <div className="post-header">
        <div className="author-avatar">
          {post.author?.avatar ? (
            <img 
              src={(post.author.avatar.startsWith('http') || post.author.avatar.startsWith('data:')) 
                ? post.author.avatar 
                : `${import.meta.env.VITE_API_URL}${post.author.avatar}`} 
              alt={post.author.name} 
              loading="lazy"
              width="42"
              height="42"
            />
          ) : (
            post.author?.name?.charAt(0) || 'U'
          )}
        </div>
        <div className="author-info">
          <h3>{post.author?.name || 'Anonymous'}</h3>
          <span className="post-time">{formatDate(post.createdAt)}</span>
        </div>
        
        {/* THREE DOTS MENU */}
        <div className="dropdown">
          <button 
            className="interaction-btn" 
            onClick={() => setShowMenu(!showMenu)} 
            style={{ marginLeft: 'auto' }}
            aria-label="Post options"
            aria-expanded={showMenu}
          >
            <MoreHorizontal size={20} />
          </button>
          
          {showMenu && (
            <div className="dropdown-menu">
              <button className="dropdown-item">
                <Share2 size={16} /> Share Post
              </button>
              {canDeletePost && (
                <button 
                  className="dropdown-item danger" 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this thought?')) {
                      onDelete(post._id);
                    }
                  }}
                >
                  <X size={16} /> Delete Post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className={`post-content ${isQuote ? 'quote-style' : ''}`}>
        {post.content}
      </div>

      {/* IMAGE */}
      {post.image && (
        <div className="post-image-container">
          <img 
            src={post.image.startsWith('http') ? post.image : `${import.meta.env.VITE_API_URL}${post.image}`} 
            alt="Post content" 
            className="post-image" 
            loading={priority ? "eager" : "lazy"}
            {...(priority ? { fetchPriority: "high" } : {})}
            decoding="async"
            width="600"
            height="400"
          />
        </div>
      )}

      {/* FOOTER */}
      <div className="post-footer">
        <button 
          className={`interaction-btn ${post.isLiked ? 'liked' : ''}`} 
          onClick={handleLike}
          aria-label={post.isLiked ? 'Unlike post' : 'Like post'}
        >
          <Heart size={20} />
          <span>{post.likesCount || 0}</span>
        </button>

        <button 
          className="interaction-btn" 
          onClick={() => setShowComments(!showComments)}
          aria-label="Show comments"
          aria-expanded={showComments}
        >
          <MessageCircle size={20} />
          <span>{post.commentsCount || post.comments?.length || 0}</span>
        </button>

        <button 
          className="interaction-btn" 
          onClick={async () => {
            const shareData = {
              title: `VertexFlow Thought by ${post.author?.name}`,
              text: post.content,
              url: window.location.href,
            };
            try {
              if (navigator.share) {
                await navigator.share(shareData);
              } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
              }
            } catch (err) {
              console.error('Share failed', err);
            }
          }}
          aria-label="Share post"
        >
          <Share2 size={20} />
          <span>Share</span>
        </button>
      </div>

      {/* COMMENTS */}
      {showComments && (
        <div className="comments-panel">
          <CommentList
            comments={post.comments}
            postAuthorId={post.author?._id}
            currentUserId={user?.id || user?._id}
            isAdmin={isAdmin}
            onDeleteComment={onDeleteComment}
            postId={post._id}
          />

          <form className="comment-input-wrapper" onSubmit={handleCommentSubmit} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div className="author-avatar small-avatar">
              {userAvatar ? (
                <img 
                  src={(userAvatar.startsWith('http') || userAvatar.startsWith('data:')) 
                    ? userAvatar 
                    : `${import.meta.env.VITE_API_URL}${userAvatar}`} 
                  alt="Me" 
                  width="24"
                  height="24"
                />
              ) : (
                <UserIcon size={14} />
              )}
            </div>
            <input 
              type="text" 
              placeholder="Write a reply..." 
              className="composer-bar-input" 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              className="interaction-btn" 
              disabled={isSubmitting || !commentText.trim()}
              aria-label="Send comment"
            >
              <Send size={18} color={commentText.trim() ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            </button>
          </form>
        </div>
      )}
    </article>
  );
});

export default PostItem;
