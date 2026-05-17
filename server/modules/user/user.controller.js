import { 
  getRecentActivityService, 
  getActivityHeatmapService 
} from "./user.service.js";
import { successResponse } from "../../utils/response.js";
import { logActivity } from "../../utils/activityLogger.js";

/**
 * GET ACTIVITY LOGS
 */
export const getActivityLogs = async (req, res, next) => {
  try {
    const activities = await getRecentActivityService(req.userId);
    return successResponse(res, { activities });
  } catch (err) {
    next(err);
  }
};

/**
 * GET HEATMAP DATA
 */
export const getHeatmapData = async (req, res, next) => {
  try {
    const heatmap = await getActivityHeatmapService(req.userId);
    return successResponse(res, { heatmap });
  } catch (err) {
    next(err);
  }
};
/**
 * ⚡ Log Custom Activity (e.g. Download)
 */
export const logCustomActivity = async (req, res, next) => {
  try {
    const { action, details } = req.body;
    logActivity(req.userId, action, details);
    return successResponse(res, null, "Activity logged");
  } catch (err) {
    next(err);
  }
};
