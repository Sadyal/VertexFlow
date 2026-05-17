import Activity from "../../models/activity.model.js";
import mongoose from "mongoose";

/**
 * ⚡ Get Recent Activity (Optimized)
 */
export const getRecentActivityService = async (userId, limit = 5) => {
  // 🎯 Filter only for Editing and Downloading as per User Request
  return Activity.find({ 
    userId, 
    action: { $in: ["DOC_EDITED", "DOC_DOWNLOADED"] } 
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * ⚡ Get Activity Heatmap Data
 * Returns counts of activities per day for the last 90 days
 */
export const getActivityHeatmapService = async (userId) => {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  const stats = await Activity.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startOfYear },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return stats;
};
