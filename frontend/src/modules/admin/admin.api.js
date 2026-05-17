import api from '../../utils/axios';

/**
 * 🛡️ ADMIN API SERVICE
 * Strictly communicates with /api/admin endpoints.
 */
export const adminApi = {
  getDashboardStats: async () => {
    const response = await api.get('/api/admin/dashboard');
    return response.data;
  },

  getUsersList: async (page = 1, limit = 10, search = '') => {
    const response = await api.get(`/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    return response.data;
  },

  getDocsList: async (page = 1, limit = 10, search = '') => {
    const response = await api.get(`/api/admin/documents?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    return response.data;
  },

  getSettings: async () => {
    const response = await api.get('/api/admin/settings');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await api.put('/api/admin/settings', settings);
    return response.data;
  },

  runMaintenance: async (action) => {
    const response = await api.post('/api/admin/maintenance', { action });
    return response.data;
  },

  updateUser: async (id, data) => {
    const response = await api.put(`/api/admin/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/api/admin/users/${id}`);
    return response.data;
  },

  updateDocument: async (id, data) => {
    const response = await api.put(`/api/admin/documents/${id}`, data);
    return response.data;
  },

  deleteDocument: async (id) => {
    const response = await api.delete(`/api/admin/documents/${id}`);
    return response.data;
  },

  getPostsList: async (page = 1, limit = 10, search = '') => {
    const response = await api.get(`/api/admin/posts?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    return response.data;
  },

  deletePost: async (id) => {
    const response = await api.delete(`/api/admin/posts/${id}`);
    return response.data;
  },

  deleteComment: async (postId, commentId) => {
    const response = await api.delete(`/api/social/posts/${postId}/comments/${commentId}`);
    return response.data;
  }
};

