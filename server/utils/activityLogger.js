import Activity from "../models/activity.model.js";

/**
 * ⚡ Activity Logger Utility
 * Logs user actions to the database in a non-blocking way.
 */
export const logActivity = async (userId, action, details = "", req = null) => {
  try {
    const activityData = {
      userId,
      action,
      details,
    };

    if (req) {
      activityData.ip = req.ip || req.headers["x-forwarded-for"] || "";
      activityData.userAgent = req.headers["user-agent"] || "";
    }

    // 🔥 Non-blocking creation (we don't strictly need to await this in the main request)
    Activity.create(activityData).catch((err) => {
      console.error("❌ Failed to log activity:", err.message);
    });
  } catch (err) {
    console.error("❌ Activity logger error:", err.message);
  }
};
