import { useEffect } from 'react';
import { Globe, Sparkles, RefreshCw } from 'lucide-react';
import { useSocial } from '../social.hooks';
import CreatePost from '../components/CreatePost';
import PostItem from '../components/PostItem';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../utils/db';
import '../social.css';

const SocialHub = () => {
  const { user } = useAuth();
  const { 
    posts, 
    setPosts,
    isLoading, 
    setIsLoading,
    error, 
    pagination, 
    fetchPosts, 
    createPost, 
    toggleLike, 
    addComment,
    deletePost,
    deleteComment
  } = useSocial();

  // ⚡ INSTANT FEED: Load from IndexedDB on mount for 60FPS / Low LCP
  useEffect(() => {
    const loadCache = async () => {
      const cached = await db.getUserAsset(`social_feed_${user?._id || user?.id}`);
      if (cached && cached.length > 0) {
        setPosts(cached);
        setIsLoading(false);
      }
      const freshData = await fetchPosts(1);
      if (freshData?.posts) {
        db.saveUserAsset(`social_feed_${user?._id || user?.id}`, freshData.posts);
      }
    };
    loadCache();
  }, [user, fetchPosts]);

  // 🖱️ PERFORMANT INFINITE SCROLL (IntersectionObserver)
  useEffect(() => {
    if (!pagination.hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          fetchPosts(pagination.currentPage + 1);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const target = document.querySelector('#scroll-trigger');
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
      observer.disconnect();
    };
  }, [pagination, isLoading, fetchPosts]);

  const handleRefresh = () => {
    fetchPosts(1);
  };

  return (
    <div className="social-hub-container animate-fade-in">
      <header className="social-header">
        <h1 className="social-title">
          <Globe className="accent-icon" size={32} style={{ marginRight: '0.75rem', verticalAlign: 'middle' }} />
          Social Hub
        </h1>
        <p className="dashboard-subtitle">Connect, share, and grow with the community</p>
      </header>

      <CreatePost onPostCreated={createPost} isLoading={isLoading} />

      <div className="feed-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} color="var(--accent-primary)" />
          Recent Thoughts
        </h3>
        <button 
          onClick={handleRefresh} 
          className="interaction-btn"
          disabled={isLoading}
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner glass" style={{ marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      <div className="posts-list">
        {posts.length > 0 ? (
          posts.map((post, index) => (
            <PostItem 
              key={post._id} 
              post={post} 
              priority={index === 0}
              onLike={toggleLike} 
              onComment={addComment}
              onDelete={deletePost}
              onDeleteComment={deleteComment}
            />
          ))
        ) : (
          !isLoading && (
            <div className="empty-state-container glass" style={{ padding: '4rem' }}>
              <Globe size={48} strokeWidth={1} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3>The hub is quiet...</h3>
              <p>Be the first to spark a conversation!</p>
            </div>
          )
        )}
        
        {/* 🏹 SCROLL TRIGGER FOR INFINITE SCROLL */}
        <div id="scroll-trigger" style={{ height: '20px', width: '100%' }}></div>
      </div>

      {isLoading && posts.length > 0 && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="mini-spinner" style={{ margin: '0 auto', width: '30px', height: '30px' }}></div>
        </div>
      )}
    </div>
  );
};

export default SocialHub;
