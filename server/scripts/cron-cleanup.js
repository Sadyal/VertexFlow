import "dotenv/config";
import connectDB, { disconnectDB } from "../config/db.js";
import User from "../models/user.model.js";
import Activity from "../models/activity.model.js";

/**
 * 🚀 PRODUCTION DATABASE MAINTENANCE SCRIPT
 * Cleans up expired codes, stale unverified signups, and prunes logs to keep performance premium.
 */
const runMaintenance = async () => {
  console.log("🚀 Starting Database Maintenance Script...");
  const startTime = Date.now();

  try {
    // 1. Connect to MongoDB using the shared connect logic
    await connectDB();

    const now = Date.now();
    
    // 2. Clear expired verification OTPs
    const verifyOtpResult = await User.updateMany(
      { verifyOtpExpireAt: { $gt: 0, $lt: now } },
      { $set: { verifyOtp: "", verifyOtpExpireAt: 0 } }
    );
    console.log(`🧹 OTP Cleanup: Cleared ${verifyOtpResult.modifiedCount} expired verification OTP codes.`);

    // 3. Clear expired password reset OTPs
    const resetOtpResult = await User.updateMany(
      { resetOtpExpireAt: { $gt: 0, $lt: now } },
      { $set: { resetOtp: "", resetOtpExpireAt: 0 } }
    );
    console.log(`🧹 OTP Cleanup: Cleared ${resetOtpResult.modifiedCount} expired password reset OTP codes.`);

    // 4. Delete unverified guest accounts older than 24 hours
    const unverifiedThreshold = new Date(now - 24 * 60 * 60 * 1000);
    const deletedUnverifiedResult = await User.deleteMany({
      isAccountVerified: false,
      createdAt: { $lt: unverifiedThreshold }
    });
    console.log(`🗑️ Account Cleanup: Removed ${deletedUnverifiedResult.deletedCount} unverified accounts older than 24 hours.`);

    // 5. Trim activity log entries older than 30 days (keep DB size small & queries fast)
    const activityThreshold = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const deletedActivitiesResult = await Activity.deleteMany({
      createdAt: { $lt: activityThreshold }
    });
    console.log(`🗑️ Log Trimming: Pruned ${deletedActivitiesResult.deletedCount} user activity log records older than 30 days.`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✨ Database Maintenance successfully completed in ${duration}s.`);
  } catch (error) {
    console.error("❌ Database Maintenance failed:", error.message);
  } finally {
    console.log("💤 Shutting down database connection...");
    await disconnectDB();
    process.exit(0);
  }
};

runMaintenance();
