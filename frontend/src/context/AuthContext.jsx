import { createContext, useState, useEffect, useContext } from 'react';
import { authApi } from '../modules/auth/auth.api';
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
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [userAvatar, setUserAvatar] = useState(() => {
    return localStorage.getItem('user_avatar');
  });
  const [isInitializing, setIsInitializing] = useState(() => {
    // ⚡ INSTANT BOOT: If we have a cached user, don't show the global loader.
    // We will verify the session in the background.
    return !localStorage.getItem('user');
  });

  // Helper to update user state and persistence
  const handleSetUser = (userData) => {
    setUser((prev) => {
      const nextUser = typeof userData === 'function' ? userData(prev) : userData;
      if (nextUser) {
        localStorage.setItem('user', JSON.stringify(nextUser));
      } else {
        localStorage.removeItem('user');
        localStorage.removeItem('user_avatar');
      }
      return nextUser;
    });
  };

  // 🔄 Sync avatar state and localStorage whenever user object changes
  useEffect(() => {
    if (user) {
      if (user.avatar) {
        setUserAvatar(user.avatar);
        localStorage.setItem('user_avatar', user.avatar);
      } else {
        setUserAvatar(null);
        localStorage.removeItem('user_avatar');
      }
    } else {
      setUserAvatar(null);
      localStorage.removeItem('user_avatar');
    }
  }, [user]);

  // ==========================================
  // LIFECYCLE / SESSION CHECK
  // ==========================================
  const checkSession = async () => {
    try {
      const response = await authApi.getMe();
      if (response.success) {
        const userData = response.data.user || response.data;
        handleSetUser(userData);
      } else {
        handleSetUser(null);
      }
    } catch (err) {
      // Only clear user if it's an authentication error (401)
      // Otherwise keep the cached user to handle intermittent network issues
      if (err?.status === 401 || err?.message?.toLowerCase().includes('unauthorized')) {
        handleSetUser(null);
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
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
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
