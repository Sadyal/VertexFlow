import express from "express";
import {
  getActivityLogs,
  getHeatmapData,
  logCustomActivity,
} from "./user.controller.js";
import authMiddleware from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/activity", getActivityLogs);
router.get("/heatmap", getHeatmapData);
router.post("/log", logCustomActivity);

export default router;
