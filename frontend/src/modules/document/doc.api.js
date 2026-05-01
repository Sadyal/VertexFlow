import api from '../../utils/axios';
import { API_ENDPOINTS } from '../../utils/constants';

/**
 * @namespace documentApi
 * @description Provides asynchronous methods to interact with the backend Document endpoints.
 * Integrates directly with the configured Axios instance for automatic token injection.
 */
export const documentApi = {
  /**
   * Fetches all documents owned by or shared with the authenticated user.
   * @returns {Promise<Object>} API response payload containing the document array.
   */
  getDocs: async () => {
    const response = await api.get(API_ENDPOINTS.DOCS);
    return response.data;
  },

  /**
   * Retrieves a single document by its unique identifier.
   * @param {string} id - The MongoDB ObjectID of the document.
   * @returns {Promise<Object>} API response payload containing the document.
   */
  getDocById: async (id) => {
    const response = await api.get(`${API_ENDPOINTS.DOCS}/${id}`);
    return response.data;
  },

  /**
   * Creates a new document.
   * @param {Object} docData - The initial data for the document (title, content).
   * @returns {Promise<Object>} API response payload containing the newly created document.
   */
  createDoc: async (docData) => {
    const response = await api.post(API_ENDPOINTS.DOCS, docData);
    return response.data;
  },

  /**
   * Updates an existing document's content or metadata.
   * @param {string} id - The document ID.
   * @param {Object} updates - The partial data to update.
   * @returns {Promise<Object>} API response payload.
   */
  updateDoc: async (id, updates) => {
    const response = await api.patch(`${API_ENDPOINTS.DOCS}/${id}`, updates);
    return response.data;
  },

  /**
   * Grants access to a document for another user via email.
   * @param {string} id - The document ID to share.
   * @param {Object} shareData - Object containing target email and permissions.
   * @returns {Promise<Object>} API response payload confirming share status.
   */
  shareDoc: async (id, shareData) => {
    const response = await api.post(`${API_ENDPOINTS.DOCS}/${id}/share`, shareData);
    return response.data;
  },

  /**
   * Deletes a document.
   * @param {string} id - The document ID to delete.
   * @returns {Promise<Object>} API response payload confirming delete status.
   */
  deleteDoc: async (id) => {
    const response = await api.delete(`${API_ENDPOINTS.DOCS}/${id}`);
    return response.data;
  }
};
