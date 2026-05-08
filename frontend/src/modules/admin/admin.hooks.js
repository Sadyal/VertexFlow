import { useState, useEffect, useCallback } from 'react';

/**
 * 🚀 PERFORMANCE: Global Memory Cache
 * Persists data across tab switches within the same session.
 */
const adminCache = {
  dashboardStats: null,
  usersList: {}, // Map of page_search -> data
  docsList: {},  // Map of page_search -> data
};

/**
 * @hook useAdminData
 * @description Implements 'Stale-While-Revalidate' pattern for Admin modules.
 * Shows cached data instantly while refreshing in the background.
 */
export const useAdminData = (fetcher, cacheKey, dependencies = []) => {
  const [data, setData] = useState(() => {
    // Initialize from cache if available
    if (typeof cacheKey === 'string') return adminCache[cacheKey];
    if (cacheKey.type === 'list') return adminCache[cacheKey.store][cacheKey.id];
    return null;
  });
  
  const [isLoading, setIsLoading] = useState(!data);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (...args) => {
    // Only show loader if we don't have cached data
    if (!data) setIsLoading(true);
    
    try {
      const result = await fetcher(...args);
      if (result.success) {
        const payload = result.data || result;
        
        // Update Cache
        if (typeof cacheKey === 'string') {
          adminCache[cacheKey] = payload;
        } else if (cacheKey.type === 'list') {
          adminCache[cacheKey.store][cacheKey.id] = payload;
          adminCache[`${cacheKey.store}_pagination_${cacheKey.id}`] = result.pagination;
        }
        
        setData(payload);
        return result;
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, cacheKey]); // 🚀 FIXED: Removed 'data' from dependencies to prevent infinite loops

  // Derived pagination for lists
  const pagination = (cacheKey.type === 'list') 
    ? adminCache[`${cacheKey.store}_pagination_${cacheKey.id}`] 
    : null;

  return { data, isLoading, error, fetchData, pagination, setData };
};
