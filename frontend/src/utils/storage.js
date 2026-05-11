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
      const serialized = JSON.stringify(value);
      
      // 🛡️ PRODUCTION GUARD: Prevent massive data (like Base64 images) from entering storage
      // LocalStorage is limited to ~5MB. We cap individual keys at 200KB for safety.
      if (serialized.length > 204800) { 
        console.warn(`🚀 Storage: Data for "${key}" is too large (${(serialized.length / 1024).toFixed(1)}KB). Sanitizing before storage.`);
        if (typeof value === 'object' && value !== null) {
          // Strip heavy fields like 'avatar' or 'image' for storage, but keep metadata
          const { avatar, image, content, ...metadata } = value;
          localStorage.setItem(key, JSON.stringify(metadata));
          return true;
        }
      }

      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.error('🚨 Storage: Quota exceeded. Cleaning up non-essential cache...');
        
        // 1. Purge Expendable Cache (Drafts, old logs, etc.)
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
          if (k.startsWith('vf_docs_') || k.startsWith('lexical_') || k === 'user_avatar') {
            localStorage.removeItem(k);
          }
        });

        // 2. Try again after cleanup
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (retryError) {
          // 3. Final Fallback: If still failing, store only minimal session ID/Role
          if (key === 'user' && typeof value === 'object') {
            const minimal = { id: value.id || value._id, role: value.role, email: value.email };
            try {
              localStorage.setItem(key, JSON.stringify(minimal));
              return true;
            } catch (f) {
              console.error('💀 Storage: Critical failure. Even minimal session rejected.');
            }
          }
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
    const theme = localStorage.getItem('app-theme');
    
    localStorage.clear();
    
    if (user) localStorage.setItem('user', user);
    if (theme) localStorage.setItem('app-theme', theme);
  }
};
