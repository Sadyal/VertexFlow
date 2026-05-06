/**
 * 📦 STORAGE UTILITY
 * Handles QuotaExceededError and provides safe access to localStorage
 */

export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`⚠️ Storage: Failed to get key "${key}"`, error);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.error('🚨 Storage: Quota exceeded. Cleaning up non-essential cache...');
        
        // Strategy: Clear document caches but keep the 'user' session
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
          if (k.startsWith('vf_docs_') || k.startsWith('lexical_')) {
            localStorage.removeItem(k);
          }
        });

        // Try again after cleanup
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (retryError) {
          console.error('💀 Storage: Critical failure. Even after cleanup, quota exceeded.', retryError);
          return false;
        }
      }
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`⚠️ Storage: Failed to remove key "${key}"`, error);
    }
  },

  clearAllButAuth: () => {
    const user = localStorage.getItem('user');
    const avatar = localStorage.getItem('user_avatar');
    const theme = localStorage.getItem('app-theme');
    
    localStorage.clear();
    
    if (user) localStorage.setItem('user', user);
    if (avatar) localStorage.setItem('user_avatar', avatar);
    if (theme) localStorage.setItem('app-theme', theme);
  }
};
