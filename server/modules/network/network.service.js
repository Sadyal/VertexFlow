import mongoose from 'mongoose';
import Connection from '../../models/connection.model.js';
import userModel from '../../models/user.model.js';
import Message from '../../models/message.model.js';
import { createError } from '../../utils/error.js';
import { isUserOnline } from '../../sockets/socketState.js';

/**
 * @service searchUsersService
 * @description Search for users by email with connection status in one query.
 */
export const searchUsersService = async (query, currentUserId) => {
  if (!query) return [];
  
  const uid = new mongoose.Types.ObjectId(currentUserId);

  return await userModel.aggregate([
    {
      $match: {
        email: { $regex: query, $options: 'i' },
        _id: { $ne: uid }
      }
    },
    {
      $lookup: {
        from: 'connections',
        let: { targetId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $and: [{ $eq: ['$requester', uid] }, { $eq: ['$recipient', '$$targetId'] }] },
                  { $and: [{ $eq: ['$requester', '$$targetId'] }, { $eq: ['$recipient', uid] }] }
                ]
              }
            }
          }
        ],
        as: 'connInfo'
      }
    },
    {
      $addFields: {
        conn: { $arrayElemAt: ['$connInfo', 0] }
      }
    },
    {
      $project: {
        name: 1,
        email: 1,
        avatar: 1,
        connectionStatus: { $ifNull: ['$conn.status', 'none'] },
        isRequester: {
          $cond: [
            { $eq: ['$conn.requester', uid] },
            true,
            false
          ]
        }
      }
    },
    { $limit: 20 }
  ]);
};

/**
 * @service sendRequestService
 */
export const sendRequestService = async (requesterId, recipientId) => {
  if (requesterId === recipientId) {
    throw createError("You cannot send a request to yourself", 400);
  }

  const existing = await Connection.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId }
    ]
  });

  if (existing) {
    throw createError("A connection or request already exists", 400);
  }

  return await Connection.create({
    requester: requesterId,
    recipient: recipientId,
    status: 'pending'
  });
};

/**
 * @service acceptRequestService
 */
export const acceptRequestService = async (recipientId, connectionId) => {
  const connection = await Connection.findById(connectionId);
  if (!connection) throw createError("Connection request not found", 404);
  if (connection.recipient.toString() !== recipientId.toString()) {
    throw createError("Unauthorized", 403);
  }

  connection.status = 'accepted';
  return await connection.save();
};

/**
 * @service rejectRequestService
 * @description Permanently removes a connection request.
 */
export const rejectRequestService = async (recipientId, connectionId) => {
  const connection = await Connection.findById(connectionId);
  if (!connection) throw createError("Connection request not found", 404);
  if (connection.recipient.toString() !== recipientId.toString()) {
    throw createError("Unauthorized", 403);
  }

  return await Connection.findByIdAndDelete(connectionId);
};

/**
 * @service getPendingRequestsService
 */
export const getPendingRequestsService = async (userId) => {
  return await Connection.find({
    recipient: userId,
    status: 'pending'
  }).populate('requester', 'name email avatar').lean();
};

/**
 * @service getFriendsService
 * @description Optimized aggregation to fetch friends, unread count, and last message in one trip.
 */
/**
 * @service getFriendsService
 * @description HIGH PERFORMANCE: Fetches friends, unread counts, last messages, and online status.
 * Optimized with bulk retrieval and Redis set optimization.
 */
export const getFriendsService = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  // 1. Fetch all accepted connections (Minimal data)
  const connections = await Connection.find({
    $or: [{ requester: uid }, { recipient: uid }],
    status: 'accepted'
  }).populate('requester recipient', 'name email avatar').lean();

  // 🛡️ SAFETY FILTER: Remove connections with deleted users to prevent Null crashes
  const validConnections = connections.filter(conn => conn.requester && conn.recipient);

  if (!validConnections.length) return [];

  // 2. Extract friend objects and IDs
  const friends = validConnections.map(conn => {
    const friend = conn.requester._id.toString() === userId.toString() 
      ? conn.recipient 
      : conn.requester;
    return { 
      connectionId: conn._id, 
      friend, 
      lastMessage: conn.lastMessage // ⚡ Use denormalized data
    };
  });

  const friendIds = friends.map(f => f.friend._id);

  // 3. ⚡ BULK RETRIEVAL: Unread counts and Online status in parallel
  const [unreadCounts, onlineUserIds] = await Promise.all([
    // Unread counts for all friends at once
    Message.aggregate([
      { $match: { recipient: uid, sender: { $in: friendIds }, isRead: false } },
      { $group: { _id: '$sender', count: { $sum: 1 } } }
    ]),
    
    // Get all online users from Redis in ONE trip
    import('../../sockets/socketState.js').then(m => m.getAllOnlineUsers())
  ]);

  // 4. Transform into lookup maps for O(1) access
  const unreadMap = Object.fromEntries(unreadCounts.map(u => [u._id.toString(), u.count]));
  const onlineSet = new Set(onlineUserIds.map(id => id.toString()));

  // 5. Merge and return
  return friends.map(({ connectionId, friend, lastMessage }) => {
    const fId = friend._id.toString();
    
    return {
      connectionId,
      friend,
      unreadCount: unreadMap[fId] || 0,
      isOnline: onlineSet.has(fId),
      lastMessage: lastMessage ? {
        content: lastMessage.content,
        createdAt: lastMessage.createdAt,
        sender: lastMessage.sender
      } : null
    };
  })
  // Sort by activity (last message timestamp)
  .sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return timeB - timeA;
  });
};


/**
 * Get IDs of all accepted friends for a user.
 */
export const getFriendIdsService = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const connections = await Connection.find({
    $or: [{ requester: uid, status: 'accepted' }, { recipient: uid, status: 'accepted' }]
  }).select('requester recipient');

  return connections.map(conn => 
    conn.requester.toString() === userId.toString() ? conn.recipient : conn.requester
  );
};
