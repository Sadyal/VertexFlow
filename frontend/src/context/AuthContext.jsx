import { createContext, useState, useEffect, useContext, useMemo, useRef } from 'react';
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
  // STATE MANAGEMENT & REFERENCES
  // ==========================================
  const [user, setUser] = useState(() => storage.get('user', null));
  const [userAvatar, setUserAvatar] = useState(null);
  const [isInitializing, setIsInitializing] = useState(() => !localStorage.getItem('user'));
  
  const authChannelRef = useRef(null);
  const lastCheckedRef = useRef(Date.now());

  // Helper to update user state and persistence (With circular broadcast prevention)
  const handleSetUser = (userData, isBroadcast = true) => {
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

        if (isBroadcast && authChannelRef.current) {
          const prevId = prev?._id || prev?.id;
          const nextId = nextUser?._id || nextUser?.id;
          if (prevId !== nextId) {
            authChannelRef.current.postMessage({
              type: 'LOGIN',
              payload: { userId: nextId }
            });
          }
        }
      } else {
        storage.remove('user');
        storage.remove('user_avatar');
        db.clearAll();
        setUserAvatar(null);

        if (isBroadcast && authChannelRef.current) {
          authChannelRef.current.postMessage({ type: 'LOGOUT' });
        }
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
    lastCheckedRef.current = Date.now();
    try {
      console.log('📡 AuthContext: Checking session...');
      
      // 🚀 Load avatar from IndexedDB instantly
      const cachedAvatar = await db.getUserAsset('avatar');
      if (cachedAvatar) setUserAvatar(cachedAvatar);

      const response = await authApi.getMe();
      if (response.success) {
        console.log('✅ AuthContext: Session valid', response.data.user?.email || '');
        const userData = response.data.user || response.data;
        handleSetUser(userData, false); // Fetching user context directly doesn't need rebroadcasting
      } else {
        console.warn('⚠️ AuthContext: Session invalid (success false)');
        handleSetUser(null, false);
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
        handleSetUser(null, false);
      } else {
        console.warn('⚠️ AuthContext: Non-auth error or network issue during session check.', err?.message || 'Unknown error');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    // 🖥️ Create Enterprise Auth Synchronization Channel
    const channel = new BroadcastChannel('vertexflow_auth');
    authChannelRef.current = channel;

    const handleAuthMessage = (e) => {
      const { type, payload } = e.data || {};
      console.log('📡 BroadcastChannel Auth Event:', type, payload);

      if (type === 'LOGOUT' || type === 'TOKEN_INVALIDATED') {
        console.warn('📡 Active session terminated elsewhere. Synchronizing...');
        handleSetUser(null, false); // Clear locally without rebroadcasting
      } else if (type === 'LOGIN' || type === 'SESSION_CHANGED') {
        console.log('📡 Session changed in another tab. Fetching details...');
        checkSession();
      }
    };

    channel.addEventListener('message', handleAuthMessage);

    // Initial load
    checkSession();

    // 🎧 Listen for global unauthorized events (from axios interceptor)
    const handleUnauthorized = () => {
      console.warn('📡 Unauthorized access detected. Clearing session.');
      handleSetUser(null, true); // Broadcast to all other tabs
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      channel.removeEventListener('message', handleAuthMessage);
      channel.close();
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // 👁️ Tab Visibility Change Revalidation (10s debounce)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastCheckedRef.current > 10000) {
          console.log('👁️ Tab active. Revalidating active session version...');
          checkSession();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const updateAvatar = (newAvatar) => {
    setUserAvatar(newAvatar);
    db.saveUserAsset('avatar', newAvatar);
    handleSetUser(prev => prev ? { ...prev, avatar: newAvatar } : prev, false);
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
