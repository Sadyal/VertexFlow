const userSockets = new Map();

export const registerUserSocket = (userId, socketId) => {
  const uid = userId.toString();
  if (!userSockets.has(uid)) {
    userSockets.set(uid, new Set());
  }
  userSockets.get(uid).add(socketId);
};

export const removeUserSocket = (userId, socketId) => {
  const uid = userId.toString();
  const set = userSockets.get(uid);
  if (!set) return;

  set.delete(socketId);
  if (set.size === 0) userSockets.delete(uid);
};

export const emitToUser = (io, userId, event, payload) => {
  const sockets = userSockets.get(userId.toString());
  if (!sockets) return;

  sockets.forEach((sid) => {
    io.to(sid).emit(event, payload);
  });
};

/**
 * Check if a user has any active socket connections
 */
export const isUserOnline = (userId) => {
  const sockets = userSockets.get(userId.toString());
  return !!(sockets && sockets.size > 0);
};

/**
 * Get a list of all currently connected user IDs
 */
export const getAllOnlineUsers = () => {
  return Array.from(userSockets.keys());
};