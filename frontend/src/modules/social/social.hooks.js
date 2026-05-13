import { useState, useCallback } from 'react';
import axios from '../../utils/axios';

export const useSocial = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ hasMore: true, currentPage: 1 });

  /**
   * 📡 FETCH POSTS
   */
  const fetchPosts = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/social/posts?page=${page}`);
      if (page === 1) {
        setPosts(res.data.posts);
      } else {
        setPosts(prev => [...prev, ...res.data.posts]);
      }
      setPagination(res.data.pagination);
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
    // 1. Snapshot previous state
    let previousPosts;
    
    // 2. Perform Optimistic Update
    setPosts(prev => {
      previousPosts = prev;
      return prev.map(post => {
        if (post._id === postId) {
          const isLiked = !post.isLiked;
          const likesCount = isLiked ? (post.likesCount + 1) : Math.max(0, post.likesCount - 1);
          return { ...post, likesCount, isLiked };
        }
        return post;
      });
    });

    try {
      const res = await axios.post(`/api/social/posts/${postId}/like`);
      
      // 3. Sync with server response
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

      return res.data;
    } catch (err) {
      // 4. Rollback on failure
      console.error('❤️ Social: Like failed, rolling back', err);
      if (previousPosts) setPosts(previousPosts);
    }
  }, []);

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
