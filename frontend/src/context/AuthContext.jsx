import { createContext, useState, useEffect, useContext } from 'react';
import { authApi } from '../modules/auth/auth.api';
import { storage } from '../utils/storage';
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
  const [userAvatar, setUserAvatar] = useState(() => storage.get('user_avatar', null));
  const [isInitializing, setIsInitializing] = useState(() => !localStorage.getItem('user'));

  // Helper to update user state and persistence
  const handleSetUser = (userData) => {
    setUser((prev) => {
      const nextUser = typeof userData === 'function' ? userData(prev) : userData;
      if (nextUser) {
        storage.set('user', nextUser);
      } else {
        storage.remove('user');
        storage.remove('user_avatar');
      }
      return nextUser;
    });
  };

  // 🔄 Sync avatar state and localStorage whenever user object changes
  useEffect(() => {
    if (user) {
      if (user.avatar) {
        setUserAvatar(user.avatar);
        storage.set('user_avatar', user.avatar);
      } else {
        setUserAvatar(null);
        storage.remove('user_avatar');
      }
    } else {
      setUserAvatar(null);
      storage.remove('user_avatar');
    }
  }, [user]);

  // ==========================================
  // LIFECYCLE / SESSION CHECK
  // ==========================================
  const checkSession = async () => {
    try {
      console.log('📡 AuthContext: Checking session...');
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
      console.error('❌ AuthContext: Session check failed', err);
      // 🚀 ROBUST ERROR CHECK:
      // Handle both structured error bodies { status: 401 } and axios errors { response: { status: 401 } }
      const isUnauthorized = 
        err?.status === 401 || 
        err?.response?.status === 401 || 
        err?.message?.toLowerCase().includes('unauthorized') ||
        err?.message?.toLowerCase().includes('token missing');

      if (isUnauthorized) {
        console.warn('📡 AuthContext: Unauthorized. Clearing session.');
        handleSetUser(null);
      } else {
        console.warn('📡 AuthContext: Non-auth error. Keeping cached user if exists.');
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
    handleSetUser(prev => prev ? { ...prev, avatar: newAvatar } : prev);
  };

  // ==========================================
  // RENDER LOGIC
  // ==========================================
  return (
    <AuthContext.Provider value={{ 
      user, 
      userAvatar,
      isAuthenticated: !!user, 
      isInitializing, 
      setUser: handleSetUser,
      updateAvatar,
      fetchUser: checkSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};
