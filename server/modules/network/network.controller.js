import * as networkService from './network.service.js';
import * as chatService from './chat.service.js';

/**
 * @controller searchUsers
 */
export const searchUsers = async (req, res, next) => {
  try {
    const users = await networkService.searchUsersService(req.query.q, req.userId);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * @controller sendRequest
 */
export const sendRequest = async (req, res, next) => {
  try {
    const connection = await networkService.sendRequestService(req.userId, req.body.recipientId);
    res.status(201).json({ success: true, data: connection });
  } catch (error) {
    next(error);
  }
};

/**
 * @controller acceptRequest
 */
export const acceptRequest = async (req, res, next) => {
  try {
    const connection = await networkService.acceptRequestService(req.userId, req.params.id);
    res.status(200).json({ success: true, data: connection });
  } catch (error) {
    next(error);
  }
};

/**
 * @controller getPendingRequests
 */
export const getPendingRequests = async (req, res, next) => {
  try {
    const requests = await networkService.getPendingRequestsService(req.userId);
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

/**
 * @controller getFriends
 */
export const getFriends = async (req, res, next) => {
  try {
    const friends = await networkService.getFriendsService(req.userId);
    res.status(200).json({ success: true, data: friends });
  } catch (error) {
    next(error);
  }
};

/**
 * @controller getChatHistory
 */
export const getChatHistory = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const { page } = req.query;
    const messages = await chatService.getChatHistoryService(req.userId, friendId, parseInt(page) || 1);
    
    // Also mark as read (non-blocking background task)
    chatService.markAsReadService(req.userId, friendId).catch(err => console.error("Mark read error:", err));
    
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};
