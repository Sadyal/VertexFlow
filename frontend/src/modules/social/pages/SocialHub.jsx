import { useEffect, useMemo } from 'react';
import { Globe, Sparkles, RefreshCw } from 'lucide-react';
import { useSocial } from '../social.hooks';
import CreatePost from '../components/CreatePost';
import PostItem from '../components/PostItem';
import { useAuth } from '../../../context/AuthContext';
import { db } from '../../../utils/db';
import Skeleton from '../../../components/common/Skeleton';
import '../social.css';

// 🦴 PERFORMANCE: Skeleton Loader for Social Hub
const SocialSkeleton = () => (
  <div className="posts-list">
    {[...Array(3)].map((_, i) => (
      <div key={`social-skeleton-${i}`} className="post-card glass" style={{ padding: '1.5rem', marginBottom: '1.5rem', opacity: 0.7 }}>
        <div className="post-header" style={{ marginBottom: '1rem' }}>
          <Skeleton width="42px" height="42px" borderRadius="50%" />
          <div className="author-info" style={{ flex: 1, marginLeft: '1rem' }}>
            <Skeleton width="120px" height="16px" />
            <Skeleton width="80px" height="12px" className="mt-1" />
          </div>
        </div>
        <div className="post-content">
          <Skeleton width="100%" height="14px" style={{ marginBottom: '8px' }} />
          <Skeleton width="90%" height="14px" style={{ marginBottom: '8px' }} />
          <Skeleton width="40%" height="14px" />
        </div>
        <div className="post-footer" style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem' }}>
          <Skeleton width="60px" height="24px" borderRadius="12px" />
          <Skeleton width="60px" height="24px" borderRadius="12px" />
          <Skeleton width="60px" height="24px" borderRadius="12px" />
        </div>
      </div>
    ))}
  </div>
);

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
    deleteComment,
    isSubmitting
  } = useSocial();
  
  // 🌍 SEO & Title
  // 🚀 PERFORMANCE: Programmatic LCP Preload
  useEffect(() => {
    const firstImagePost = posts.find(p => p.image);
    if (firstImagePost) {
      const imageUrl = firstImagePost.image.startsWith('http') 
        ? firstImagePost.image 
        : `${import.meta.env.VITE_API_URL}${firstImagePost.image}`;
      
      // Check if already preloaded
      if (!document.querySelector(`link[href="${imageUrl}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = imageUrl;
        link.fetchPriority = 'high';
        document.head.appendChild(link);
      }
    }
  }, [posts]);

  useEffect(() => {
    document.title = "Social Hub | VertexFlow";
  }, []);

  // ⚡ INSTANT FEED: Load from IndexedDB on mount for 60FPS / Low LCP
  useEffect(() => {
    const loadCache = async () => {
      const userId = user?._id || user?.id;
      if (!userId) return;

      const cached = await db.getUserAsset(`social_feed_${userId}`);
      if (cached && cached.length > 0) {
        // Only render first 5 initially to prevent main-thread bottleneck
        setPosts(cached.slice(0, 5));
        
        // Defer loading the rest to keep main thread free for LCP
        setTimeout(() => {
          setPosts(cached);
        }, 300);
      }
      
      const freshData = await fetchPosts(1);
      if (freshData?.posts) {
        db.saveUserAsset(`social_feed_${userId}`, freshData.posts);
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

  // 🚀 PERFORMANCE: Memoize first image index for LCP
  const firstImageIndex = useMemo(() => posts.findIndex(p => p.image), [posts]);

  return (
    <div className="social-hub-container animate-fade-in">
      <header className="social-header">
        <h1 className="social-title">
          <Globe className="accent-icon" size={32} style={{ marginRight: '0.75rem', verticalAlign: 'middle' }} />
          Social Hub
        </h1>
        <p className="dashboard-subtitle">Connect, share, and grow with the community</p>
      </header>

      <CreatePost onPostCreated={createPost} isLoading={isSubmitting} />

      <div className="feed-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: '700' }}>
          <Sparkles size={20} color="var(--accent-primary)" aria-hidden="true" />
          Recent Thoughts
        </h2>
        <button 
          onClick={handleRefresh} 
          className="interaction-btn"
          disabled={isLoading}
          aria-label="Refresh feed"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner glass" style={{ marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      <div className="posts-list">
        {isLoading && posts.length === 0 ? (
          <SocialSkeleton />
        ) : posts.length > 0 ? (
          <>
            {posts.map((post, index) => (
              <PostItem 
                key={post._id} 
                post={post} 
                priority={index === firstImageIndex}
                onLike={toggleLike} 
                onComment={addComment}
                onDelete={deletePost}
                onDeleteComment={deleteComment}
              />
            ))}
            
            {/* 🔄 BOTTOM LOADING STATE (Stable) */}
            {isLoading && (
              <div style={{ padding: '2rem 0', opacity: 0.5 }}>
                <SocialSkeleton /> 
              </div>
            )}
          </>
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
        <div id="scroll-trigger" style={{ height: '40px', width: '100%' }}></div>
      </div>
    </div>
  );
};

export default SocialHub;
