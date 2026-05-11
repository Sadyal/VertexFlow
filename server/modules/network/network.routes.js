import express from 'express';
import * as networkController from './network.controller.js';
import authMiddleware from '../../middleware/auth.middleware.js';

const router = express.Router();
router.use(express.json({ limit: "10kb" }));

/**
 * @route GET /api/network/search
 * @desc Search for users to connect with
 * @access Private
 */
router.get('/search', authMiddleware, networkController.searchUsers);

/**
 * @route POST /api/network/request
 * @desc Send a connection request
 * @access Private
 */
router.post('/request', authMiddleware, networkController.sendRequest);

/**
 * @route GET /api/network/requests/pending
 * @desc Get all pending received requests
 * @access Private
 */
router.get('/requests/pending', authMiddleware, networkController.getPendingRequests);

/**
 * @route PATCH /api/network/request/:id/accept
 * @desc Accept a connection request
 * @access Private
 */
router.patch('/request/:id/accept', authMiddleware, networkController.acceptRequest);

/**
 * @route PATCH /api/network/request/:id/reject
 * @desc Reject/Ignore a connection request
 * @access Private
 */
router.patch('/request/:id/reject', authMiddleware, networkController.rejectRequest);

/**
 * @route GET /api/network/friends
 * @desc Get all active connections
 * @access Private
 */
router.get('/friends', authMiddleware, networkController.getFriends);

/**
 * @route GET /api/network/chat/:friendId
 * @desc Get chat history with a friend
 * @access Private
 */
router.get('/chat/:friendId', authMiddleware, networkController.getChatHistory);

export default router;
