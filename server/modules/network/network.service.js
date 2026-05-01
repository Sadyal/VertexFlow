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
export const getFriendsService = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  // ⚡ HIGH PERFORMANCE AGGREGATION: Fetch friends, unread counts, and last messages in ONE trip
  const friendsData = await Connection.aggregate([
    {
      $match: {
        $or: [{ requester: uid }, { recipient: uid }],
        status: 'accepted'
      }
    },
    {
      $addFields: {
        friendId: {
          $cond: [{ $eq: ['$requester', uid] }, '$recipient', '$requester']
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'friendId',
        foreignField: '_id',
        as: 'friendInfo'
      }
    },
    { $unwind: '$friendInfo' },
    {
      // 📝 Fetch unread count for each friend
      $lookup: {
        from: 'messages',
        let: { fId: '$friendId', currentUserId: uid },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$recipient', '$$currentUserId'] },
                  { $eq: ['$sender', '$$fId'] },
                  { $eq: ['$isRead', false] }
                ]
              }
            }
          },
          { $count: 'count' }
        ],
        as: 'unread'
      }
    },
    {
      // 📝 Fetch the single latest message (sent or received)
      $lookup: {
        from: 'messages',
        let: { fId: '$friendId', currentUserId: uid },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $and: [{ $eq: ['$sender', '$$currentUserId'] }, { $eq: ['$recipient', '$$fId'] }] },
                  { $and: [{ $eq: ['$recipient', '$$currentUserId'] }, { $eq: ['$sender', '$$fId'] }] }
                ]
              }
            }
          },
          { $sort: { createdAt: -1 } },
          { $limit: 1 }
        ],
        as: 'lastMsg'
      }
    },
    {
      $project: {
        connectionId: '$_id',
        friend: {
          _id: '$friendInfo._id',
          name: '$friendInfo.name',
          email: '$friendInfo.email',
          avatar: '$friendInfo.avatar'
        },
        unreadCount: { $ifNull: [{ $arrayElemAt: ['$unread.count', 0] }, 0] },
        lastMessage: { $arrayElemAt: ['$lastMsg', 0] }
      }
    },
    // Sort by last message activity (most recent first)
    { $sort: { 'lastMessage.createdAt': -1 } }
  ]);

  // Combine with real-time presence (Redis-based)
  return await Promise.all(
    friendsData.map(async (item) => ({
      ...item,
      isOnline: await isUserOnline(item.friend._id.toString()),
      lastMessage: item.lastMessage
        ? {
            content: item.lastMessage.content,
            createdAt: item.lastMessage.createdAt,
            sender: item.lastMessage.sender,
          }
        : null,
    }))
  );
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
