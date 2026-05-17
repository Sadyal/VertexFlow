import { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { authApi } from '../modules/auth/auth.api';
import { storage } from '../utils/storage';
import { db } from '../utils/db';
import Loader from '../components/common/Loader';

/**
 * @typedef {Object} AuthContextType
 * @property {Object|null} user - The currently authenticated user object
 * @property {boolean} isAuthenticated - Derived boolean indicating auth state
 * @property {boolean} isInitializing - True while checking session on mount
 * @property {Function} setUser - State setter for the user object
 */

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * @component AuthProvider
 * @description Global context provider managing user authentication state.
 * Performs a session check on initial mount to persist user sessions across 
 * page reloads.
 */
export const AuthProvider = ({ children }) => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [user, setUser] = useState(() => storage.get('user', null));
  const [userAvatar, setUserAvatar] = useState(null);
  const [isInitializing, setIsInitializing] = useState(() => !localStorage.getItem('user'));

  // Helper to update user state and persistence
  const handleSetUser = (userData) => {
    setUser((prev) => {
      const nextUser = typeof userData === 'function' ? userData(prev) : userData;
      if (nextUser) {
        // 🚀 THIN STORAGE: Strip the heavy avatar before saving to LocalStorage
        const { avatar, ...thinUser } = nextUser;
        storage.set('user', thinUser);
        
        // 🚀 PROPER STORAGE: Save the heavy avatar only to IndexedDB
        if (avatar) {
          db.saveUserAsset('avatar', avatar);
          setUserAvatar(avatar);
        }
      } else {
        storage.remove('user');
        storage.remove('user_avatar');
        db.clearAll();
        setUserAvatar(null);
      }
      return nextUser;
    });
  };

  // 🔄 Sync avatar state whenever user object changes
  useEffect(() => {
    if (user) {
      setUserAvatar(user.avatar || null);
    } else {
      setUserAvatar(null);
    }
  }, [user]);

  // ==========================================
  // LIFECYCLE / SESSION CHECK
  // ==========================================
  const checkSession = async () => {
    try {
      console.log('📡 AuthContext: Checking session...');
      
      // 🚀 Load avatar from IndexedDB instantly
      const cachedAvatar = await db.getUserAsset('avatar');
      if (cachedAvatar) setUserAvatar(cachedAvatar);

      const response = await authApi.getMe();
      if (response.success) {
        console.log('✅ AuthContext: Session valid', response.data.user?.email || '');
        const userData = response.data.user || response.data;
        handleSetUser(userData);
      } else {
        console.warn('⚠️ AuthContext: Session invalid (success false)');
        handleSetUser(null);
      }
    } catch (err) {
      // 🚀 ROBUST ERROR CHECK:
      const isUnauthorized = 
        err?.status === 401 || 
        err?.response?.status === 401 || 
        err?.message?.toLowerCase().includes('unauthorized') ||
        err?.message?.toLowerCase().includes('token missing');

      if (isUnauthorized) {
        console.log('📡 AuthContext: No active session (Unauthorized).');
        handleSetUser(null);
      } else {
        console.warn('⚠️ AuthContext: Non-auth error or network issue during session check.', err?.message || 'Unknown error');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    checkSession();

    // 🎧 Listen for global unauthorized events (from axios interceptor)
    const handleUnauthorized = () => {
      console.warn('📡 Unauthorized access detected. Clearing session.');
      handleSetUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    
    // 🖥️ Sync logout across multiple tabs
    const handleStorageChange = (e) => {
      if (e.key === 'user' && !e.newValue) {
        console.warn('📡 Session cleared in another tab. Logging out...');
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateAvatar = (newAvatar) => {
    setUserAvatar(newAvatar);
    db.saveUserAsset('avatar', newAvatar);
    handleSetUser(prev => prev ? { ...prev, avatar: newAvatar } : prev);
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================
  const contextValue = useMemo(() => ({
    user, 
    userAvatar,
    isAuthenticated: !!user, 
    isAdmin: user?.role === 'admin',
    isInitializing, 
    setUser: handleSetUser,
    updateAvatar,
    fetchUser: checkSession
  }), [user, userAvatar, isInitializing]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
