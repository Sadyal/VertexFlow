import redis from "../config/redis.js";


const REDIS_KEY_ONLINE_USERS = "online_users";
const REDIS_PREFIX_USER_SOCKETS = "user_sockets:"; // Set of socket IDs per user

/**
 * Register a user's socket. 
 * Returns true if this is the user's first active socket (status changed to Online).
 */
export const registerUserSocket = async (socket, userId) => {
  try {
    const uid = userId.toString();
    const sid = socket.id;
    socket.join(`user:${uid}`);

    if (redis) {
      const userSocketsKey = `${REDIS_PREFIX_USER_SOCKETS}${uid}`;
      const userTabsKey = `user_tabs:${uid}`;
      const tabId = socket.handshake.query.tabId;

      // 🔄 1. SRE Tab Replacement: If this is a page refresh, disconnect the old socket for the same tab immediately!
      if (tabId) {
        const oldSid = await redis.hget(userTabsKey, tabId);
        if (oldSid && oldSid !== sid) {
          const oldSocket = socket.server.sockets.sockets.get(oldSid);
          if (oldSocket) {
            console.log(`🔄 [TAB REPLACEMENT] Disconnecting old socket ${oldSid} for tab ${tabId} of user ${uid}`);
            oldSocket.disconnect(true);
          }
          await redis.srem(userSocketsKey, oldSid);
        }
        // Save new socket ID for this tab
        await redis.hset(userTabsKey, tabId, sid);
        await redis.expire(userTabsKey, 90);
      }
      
      // 🛡️ 2. Phase 5: Graceful Tab Limit (Limit max 3 parallel tabs per user, evict stale/oldest other tab)
      const socketIds = await redis.smembers(userSocketsKey);
      const activeSocketsInProcess = [];

      for (const oldSid of socketIds) {
        const connectedSocket = socket.server.sockets.sockets.get(oldSid);
        if (connectedSocket) {
          activeSocketsInProcess.push(connectedSocket);
        } else {
          // Stale socket ID from previous run or other process, clean it up!
          await redis.srem(userSocketsKey, oldSid);
        }
      }

      if (activeSocketsInProcess.length >= 3) {
        // Evict the oldest socket belonging to a DIFFERENT tab (don't evict ourselves!)
        const evictable = activeSocketsInProcess.filter(s => s.id !== sid);
        if (evictable.length > 0) {
          const victim = evictable[0];
          console.warn(`⚠️ [SOCKET LIMIT] User ${uid} tab limit exceeded (3). Evicting session ${victim.id}.`);
          
          victim.emit("tab-limit-exceeded", { maxLimit: 3 });
          victim.disconnect(true);
          await redis.srem(userSocketsKey, victim.id);
        }
      }

      // Add socket ID
      await redis.sadd(userSocketsKey, sid);
      await redis.expire(userSocketsKey, 90); // 🛡️ sliding expiration TTL 90s

      // Add to online users
      await redis.sadd(REDIS_KEY_ONLINE_USERS, uid);
      await redis.expire(REDIS_KEY_ONLINE_USERS, 90);
      const isFirstConnection = activeSocketsInProcess.length === 0;
      return { success: true, isFirstConnection };
    }
    return { success: true, isFirstConnection: true };
  } catch (error) {
    console.error("❌ registerUserSocket Redis error:", error.message);
    return { success: true, isFirstConnection: true };
  }
};

/**
 * Remove a user's socket.
 * Returns true if this was the user's last active socket (status changed to Offline).
 */
export const removeUserSocket = async (io, userId, socketId) => {
  try {
    const uid = userId.toString();
    const sid = socketId;
    
    if (redis) {
      const userSocketsKey = `${REDIS_PREFIX_USER_SOCKETS}${uid}`;
      // Remove this specific socket ID
      await redis.srem(userSocketsKey, sid);
      
      const count = await redis.scard(userSocketsKey);
      
      if (count === 0) {
        await redis.srem(REDIS_KEY_ONLINE_USERS, uid);
        await redis.del(userSocketsKey);
        return true;
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error("❌ removeUserSocket Redis error:", error.message);
    return true;
  }
};


/**
 * Emit to all devices of a user
 */
export const emitToUser = (io, userId, event, payload) => {
  try {
    io.to(`user:${userId.toString()}`).emit(event, payload);
  } catch (error) {
    console.error("❌ emitToUser error:", error.message);
  }
};

/**
 * Check if a user is online across the entire cluster
 */
export const isUserOnline = async (userId) => {
  try {
    if (!redis) return false;
    const isOnline = await redis.sismember(REDIS_KEY_ONLINE_USERS, userId.toString());
    return isOnline === 1;
  } catch (error) {
    console.error("❌ isUserOnline Redis error:", error.message);
    return false;
  }
};

/**
 * Get all online user IDs across the cluster
 */
export const getAllOnlineUsers = async () => {
  try {
    if (!redis) return [];
    return await redis.smembers(REDIS_KEY_ONLINE_USERS);
  } catch (error) {
    console.error("❌ getAllOnlineUsers Redis error:", error.message);
    return [];
  }
};