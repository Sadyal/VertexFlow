import { useState, useCallback } from 'react';
import { documentApi } from './doc.api';

/**
 * @hook useDocuments
 * @description Manages state and data fetching for the Document entity.
 * Utilizes useCallback to preserve referential 
 * equality and prevent unnecessary re-renders in children.
 */
export const useDocuments = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [docs, setDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ==========================================
  // API METHODS
  // ==========================================
  
  /**
   * @function fetchDocs
   * @description Retrieves the user's documents. Fallbacks to mock data on error.
   */
  const fetchDocs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await documentApi.getDocs();
      if (response.success) {
        setDocs(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch documents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * @function createDoc
   * @description Creates a new document. Fallbacks to a mock document on network failure.
   * @param {Object} data - Document initialization data (title, content)
   * @returns {Object} The created document object
   */
  const createDoc = useCallback(async (data) => {
    setError(null);
    try {
      const response = await documentApi.createDoc(data);
      if (response.success) {
        const newDoc = {
          id: response.data.id,
          title: data.title || 'Untitled Document',
          updatedAt: new Date().toISOString()
        };
        setDocs(prev => [newDoc, ...prev]);
        return newDoc;
      }
    } catch (err) {
      setError(err.message || 'Failed to create document.');
      return null;
    }
  }, []);

  /**
   * @function deleteDoc
   * @description Deletes a document and updates state
   */
  const removeDoc = useCallback(async (id) => {
    try {
      const response = await documentApi.deleteDoc(id);
      if (response.success) {
        setDocs(prev => prev.filter(doc => doc._id !== id && doc.id !== id));
        return true;
      }
    } catch (err) {
      setError(err.message || 'Failed to delete document.');
      return false;
    }
  }, []);

  /**
   * @function renameDoc
   * @description Renames a document and updates state
   */
  const renameDoc = useCallback(async (id, newTitle) => {
    try {
      const response = await documentApi.updateDoc(id, { title: newTitle });
      if (response.success) {
        setDocs(prev => prev.map(doc => 
          (doc._id === id || doc.id === id) ? { ...doc, title: newTitle } : doc
        ));
        return true;
      }
    } catch (err) {
      setError(err.message || 'Failed to rename document.');
      return false;
    }
  }, []);

  return { docs, isLoading, error, fetchDocs, createDoc, removeDoc, renameDoc };
};
