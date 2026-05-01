import Message from '../../models/message.model.js';
import { createError } from '../../utils/error.js';
import Connection from '../../models/connection.model.js';

/**
 * @service sendMessageService
 * @description Save a private message to the DB.
 */
export const sendMessageService = async (senderId, recipientId, content) => {
  if (!content || !content.trim()) {
    throw createError("Message content cannot be empty", 400);
  }

  // 🔐 Verify they are friends before allowing chat
  const areFriends = await Connection.findOne({
    status: 'accepted',
    $or: [
      { requester: senderId, recipient: recipientId },
      { requester: recipientId, recipient: senderId }
    ]
  });

  if (!areFriends) {
    throw createError("You can only message your connections", 403);
  }

  const message = await Message.create({
    sender: senderId,
    recipient: recipientId,
    content: content.trim()
  });

  return message;
};

/**
 * @service getChatHistoryService
 * @description Get paginated chat history between two users.
 */
export const getChatHistoryService = async (userId, friendId, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;

  const messages = await Message.find({
    $or: [
      { sender: userId, recipient: friendId },
      { sender: friendId, recipient: userId }
    ]
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit);

  return messages.reverse(); // Return in chronological order
};

/**
 * @service markAsReadService
 * @description Mark messages as read when user opens the chat.
 */
export const markAsReadService = async (userId, friendId) => {
  await Message.updateMany(
    { sender: friendId, recipient: userId, isRead: false },
    { $set: { isRead: true } }
  );
};
