import { useState, useCallback, useRef } from 'react';
import { documentApi } from './doc.api';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../utils/storage';

/**
 * @hook useDocuments
 * @description Manages state and data fetching for the Document entity.
 * Implements local caching and loop-prevention.
 */
export const useDocuments = () => {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const CACHE_KEY = `vf_docs_${userId}`;

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [docs, setDocs] = useState(() => storage.get(CACHE_KEY, []));
  
  const [isLoading, setIsLoading] = useState(!docs.length); 
  const [error, setError] = useState(null);
  
  // 🚀 Loop Prevention: Track docs in a ref to avoid dependency cycles
  const docsRef = useRef(docs);
  docsRef.current = docs;

  // ==========================================
  // API METHODS
  // ==========================================
  
  /**
   * @function fetchDocs
   * @description Retrieves the user's documents.
   */
  const fetchDocs = useCallback(async () => {
    // 🚀 STABILITY FIX: Use docsRef instead of docs state in dependencies
    // to prevent infinite re-render loops in components like Dashboard.
    if (docsRef.current.length === 0) {
      setIsLoading(true);
    }
    
    setError(null);
    try {
      const response = await documentApi.getDocs();
      if (response.success) {
        setDocs(response.data);
        if (userId) {
          storage.set(CACHE_KEY, response.data);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch documents.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, CACHE_KEY]); // 🚀 Removed docs.length from here

  /**
   * @function createDoc
   */
  const createDoc = useCallback(async (data) => {
    setError(null);
    try {
      const response = await documentApi.createDoc(data);
      if (response.success) {
        const newDoc = {
          _id: response.data.id,
          id: response.data.id,
          title: data.title || 'Untitled Document',
          owner: userId,
          updatedAt: new Date().toISOString()
        };
        setDocs(prev => {
          const updated = [newDoc, ...prev];
          storage.set(CACHE_KEY, updated);
          return updated;
        });
        return newDoc;
      }
    } catch (err) {
      setError(err.message || 'Failed to create document.');
      return null;
    }
  }, [userId, CACHE_KEY]);

  /**
   * @function removeDoc
   */
  const removeDoc = useCallback(async (id) => {
    try {
      const response = await documentApi.deleteDoc(id);
      if (response.success) {
        setDocs(prev => {
          const updated = prev.filter(doc => doc._id !== id && doc.id !== id);
          storage.set(CACHE_KEY, updated);
          return updated;
        });
        return true;
      }
    } catch (err) {
      setError(err.message || 'Failed to delete document.');
      return false;
    }
  }, [CACHE_KEY]);

  /**
   * @function renameDoc
   */
  const renameDoc = useCallback(async (id, newTitle) => {
    try {
      const response = await documentApi.updateDoc(id, { title: newTitle });
      if (response.success) {
        setDocs(prev => {
          const updated = prev.map(doc => 
            (doc._id === id || doc.id === id) ? { ...doc, title: newTitle } : doc
          );
          storage.set(CACHE_KEY, updated);
          return updated;
        });
        return true;
      }
    } catch (err) {
      setError(err.message || 'Failed to rename document.');
      return false;
    }
  }, [CACHE_KEY]);

  return { docs, isLoading, error, fetchDocs, createDoc, removeDoc, renameDoc };
};


