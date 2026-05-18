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
      
      // 🛡️ Phase 5: Reject Tab Spam (Limit max 3 parallel tabs per user)
      const count = await redis.scard(userSocketsKey);
      if (count >= 3) {
        console.warn(`⚠️ [SOCKET LIMIT] User ${uid} tab limit exceeded (3). Rejecting session ${sid}.`);
        socket.emit("tab-limit-exceeded", { maxLimit: 3 });
        socket.disconnect(true);
        return false;
      }

      // Add socket ID
      await redis.sadd(userSocketsKey, sid);
      await redis.expire(userSocketsKey, 90); // 🛡️ sliding expiration TTL 90s

      // Add to online users
      await redis.sadd(REDIS_KEY_ONLINE_USERS, uid);
      await redis.expire(REDIS_KEY_ONLINE_USERS, 90);
      
      return count === 0; // Returns true if this is their first connection
    }
    return true;
  } catch (error) {
    console.error("❌ registerUserSocket Redis error:", error.message);
    return true;
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