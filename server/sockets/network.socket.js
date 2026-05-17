import { emitToUser } from './socketState.js';
import * as chatService from '../modules/network/chat.service.js';
import * as networkService from '../modules/network/network.service.js';

/**
 * Broadcast online status to all friends
 */
export const broadcastPresence = async (io, userId, isOnline) => {
  try {
    const friendIds = await networkService.getFriendIdsService(userId);
    friendIds.forEach(friendId => {
      emitToUser(io, friendId, 'presence-update', {
        userId,
        isOnline
      });
    });
  } catch (error) {
    console.error("❌ broadcastPresence error:", error.message);
  }
};

/**
 * @handler registerNetworkHandlers
 */
export const registerNetworkHandlers = async (io, socket) => {
  const userId = socket.userId;

  // 📝 Note: Presence is now managed centrally in index.js 
  // to support multi-device/multi-tab consistency.

  // Handle disconnection (handled centrally in index.js now)
  // socket.on('disconnect', async () => { ... });


  /**
   * Send private message
   */
  socket.on('private-message', async ({ recipientId, content }) => {
    try {
      const message = await chatService.sendMessageService(userId, recipientId, content);
      
      // 1. Send back to the sender (all their devices)
      emitToUser(io, userId, 'receive-message', message);
      
      // 2. Send to the recipient (all their devices)
      emitToUser(io, recipientId, 'receive-message', message);
      
      // 3. Optional: Notification event
      emitToUser(io, recipientId, 'new-message-notification', {
        from: userId,
        message: content.substring(0, 50)
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Message emoji reaction
   */
  socket.on('message-reaction', async ({ messageId, recipientId, emoji }) => {
    try {
      const reactions = await chatService.addReactionService(messageId, userId, emoji);

      // Broadcast reaction update to sender (all devices)
      emitToUser(io, userId, 'receive-message-reaction', { messageId, reactions });

      // Broadcast reaction update to recipient (all devices)
      emitToUser(io, recipientId, 'receive-message-reaction', { messageId, reactions });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Signal friend request sent
   */
  socket.on('send-friend-request', ({ recipientId, requesterName }) => {
    emitToUser(io, recipientId, 'friend-request-received', {
      fromId: userId,
      fromName: requesterName
    });
  });
};
