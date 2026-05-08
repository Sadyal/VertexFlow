import express from "express";
import { getDashboardStats, getUsersList, trackEvent, getDocsList, getSettings, updateSettings, runMaintenance, updateUser, deleteUser, updateDocument, deleteDocument } from "./admin.controller.js";
import authMiddleware from "../../middleware/auth.middleware.js";
import adminMiddleware from "../../middleware/admin.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/admin/track
 * @desc    Public tracking endpoint for frontend analytics
 */
router.post("/track", express.json(), trackEvent);

/**
 * 🔒 PROTECTED ADMIN ROUTES
 * Require both valid JWT and 'admin' role
 */
router.use(authMiddleware, adminMiddleware);

router.get("/dashboard", getDashboardStats);
router.get("/users", getUsersList);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.get("/documents", getDocsList);
router.put("/documents/:id", updateDocument);
router.delete("/documents/:id", deleteDocument);

router.get("/settings", getSettings);
router.put("/settings", updateSettings);
router.post("/maintenance", runMaintenance);

export default router;
