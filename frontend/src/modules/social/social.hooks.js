import { useState, useCallback } from 'react';
import axios from '../../utils/axios';

// ⏳ In-memory debouncer map to buffer rapid consecutive likes per post
const likeTimeouts = {};

export const useSocial = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ hasMore: true, nextCursor: null });

  /**
   * 📡 FETCH POSTS (Cursor-based)
   */
  const fetchPosts = useCallback(async (cursor = null, isReset = false) => {
    setIsLoading(true);
    try {
      const query = cursor ? `?nextCursor=${cursor}` : '';
      const res = await axios.get(`/api/social/posts${query}`);
      
      if (isReset || !cursor) {
        setPosts(res.data.posts);
      } else {
        setPosts(prev => {
          // 🛡️ Filter duplicates in case of race conditions during scroll
          const newPosts = res.data.posts.filter(np => !prev.some(p => p._id === np._id));
          return [...prev, ...newPosts];
        });
      }
      
      setPagination({
        hasMore: res.data.hasMore,
        nextCursor: res.data.nextCursor
      });
      
      setError(null);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch posts');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 🚀 CREATE POST
   */
  const createPost = useCallback(async (formData) => {
    setIsSubmitting(true);
    try {
      const res = await axios.post('/api/social/posts', formData);
      setPosts(prev => [res.data.post, ...prev]);
      return res.data.post;
    } catch (err) {
      throw new Error(err.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  /**
   * ❤️ TOGGLE LIKE (Optimistic UI)
   */
  const toggleLike = useCallback(async (postId) => {
    // 1. Perform instant optimistic UI toggle (perfect responsive feedback)
    setPosts(prev => {
      return prev.map(post => {
        if (post._id === postId) {
          const isLiked = !post.isLiked;
          const likesCount = isLiked ? (post.likesCount + 1) : Math.max(0, post.likesCount - 1);
          return { ...post, likesCount, isLiked };
        }
        return post;
      });
    });

    // 2. Cancel any pending HTTP request scheduled for this post
    if (likeTimeouts[postId]) {
      clearTimeout(likeTimeouts[postId]);
    }

    // 3. Debounce network sync by 500ms
    return new Promise((resolve, reject) => {
      likeTimeouts[postId] = setTimeout(async () => {
        delete likeTimeouts[postId];
        try {
          const res = await axios.post(`/api/social/posts/${postId}/like`);
          
          // 4. Align UI with exact server results
          setPosts(prev => prev.map(post => {
            if (post._id === postId) {
              return { 
                ...post, 
                likesCount: res.data.likesCount, 
                isLiked: res.data.isLiked 
              };
            }
            return post;
          }));
          
          resolve(res.data);
        } catch (err) {
          console.error('❤️ Social: Like sync failed', err);
          // Sync with fresh page data on error
          fetchPosts(1);
          reject(err);
        }
      }, 500);
    });
  }, [fetchPosts]);

  /**
   * 💬 ADD COMMENT
   */
  const addComment = useCallback(async (postId, text) => {
    try {
      const res = await axios.post(`/api/social/posts/${postId}/comment`, { text });
      
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          return { 
            ...post, 
            comments: [...(post.comments || []), res.data.comment] 
          };
        }
        return post;
      }));

      return res.data.comment;
    } catch (err) {
      throw new Error(err.message || 'Failed to add comment');
    }
  }, []);

  /**
   * 🗑️ DELETE POST
   */
  const deletePost = useCallback(async (postId) => {
    try {
      await axios.delete(`/api/social/posts/${postId}`);
      setPosts(prev => prev.filter(post => post._id !== postId));
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to delete post');
    }
  }, []);

  /**
   * 🗑️ DELETE COMMENT
   */
  const deleteComment = useCallback(async (postId, commentId) => {
    try {
      await axios.delete(`/api/social/posts/${postId}/comments/${commentId}`);
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            comments: post.comments.filter(c => c._id !== commentId)
          };
        }
        return post;
      }));
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to delete comment');
    }
  }, []);

  return {
    posts,
    setPosts,
    isLoading,
    setIsLoading,
    isSubmitting,
    error,
    pagination,
    fetchPosts,
    createPost,
    toggleLike,
    addComment,
    deletePost,
    deleteComment
  };
};
