import { emitToUser } from './socketState.js';
import * as chatService from '../modules/network/chat.service.js';
import * as networkService from '../modules/network/network.service.js';

/**
 * Broadcast online status to all friends
 */
const broadcastPresence = async (io, userId, isOnline) => {
  const friendIds = await networkService.getFriendIdsService(userId);
  friendIds.forEach(friendId => {
    emitToUser(io, friendId, 'presence-update', {
      userId,
      isOnline
    });
  });
};

/**
 * @handler registerNetworkHandlers
 */
export const registerNetworkHandlers = (io, socket) => {
  const userId = socket.userId;

  // Notify friends that user is online
  broadcastPresence(io, userId, true);

  // Handle disconnection
  socket.on('disconnect', () => {
    broadcastPresence(io, userId, false);
  });

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
   * Signal friend request sent
   */
  socket.on('send-friend-request', ({ recipientId, requesterName }) => {
    emitToUser(io, recipientId, 'friend-request-received', {
      fromId: userId,
      fromName: requesterName
    });
  });
};
