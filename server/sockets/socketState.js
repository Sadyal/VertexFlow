import redis from "../config/redis.js";


const REDIS_KEY_ONLINE_USERS = "online_users";
const REDIS_KEY_USER_COUNTS = "user_socket_counts";

/**
 * Register a user's socket. 
 */
export const registerUserSocket = async (socket, userId) => {
  try {
    const uid = userId.toString();
    socket.join(`user:${uid}`);

    if (redis) {
      await redis.hincrby(REDIS_KEY_USER_COUNTS, uid, 1);
      await redis.sadd(REDIS_KEY_ONLINE_USERS, uid);
    }
  } catch (error) {
    console.error("❌ registerUserSocket Redis error:", error.message);
  }
};

export const removeUserSocket = async (io, userId) => {
  try {
    const uid = userId.toString();
    
    if (redis) {
      const newCount = await redis.hincrby(REDIS_KEY_USER_COUNTS, uid, -1);
      
      if (newCount <= 0) {
        await redis.srem(REDIS_KEY_ONLINE_USERS, uid);
        await redis.hdel(REDIS_KEY_USER_COUNTS, uid);
      }
    }
  } catch (error) {
    console.error("❌ removeUserSocket Redis error:", error.message);
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