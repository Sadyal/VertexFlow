import api from '../../utils/axios';

/**
 * @api networkApi
 * @description Services for connection requests and friendship management.
 */
export const networkApi = {
  /**
   * Search for users by email
   */
  searchUsers: async (query) => {
    try {
      const response = await api.get(`/api/network/search?q=${query}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Send a connection request
   */
  sendRequest: async (recipientId) => {
    try {
      const response = await api.post('/api/network/request', { recipientId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all pending received requests
   */
  getPendingRequests: async () => {
    try {
      const response = await api.get('/api/network/requests/pending');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Accept a connection request
   */
  acceptRequest: async (connectionId) => {
    try {
      const response = await api.patch(`/api/network/request/${connectionId}/accept`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all friends (accepted connections)
   */
  getFriends: async () => {
    try {
      const response = await api.get('/api/network/friends');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get chat history with a friend
   */
  getChatHistory: async (friendId, page = 1) => {
    try {
      const response = await api.get(`/api/network/chat/${friendId}?page=${page}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
