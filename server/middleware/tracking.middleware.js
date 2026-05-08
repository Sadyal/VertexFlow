import Analytics from "../models/analytics.model.js";

/**
 * 📊 LIGHTWEIGHT TRACKING MIDDLEWARE
 * Runs asynchronously after handing off the request to avoid blocking APIs.
 */
const trackingMiddleware = (req, res, next) => {
  // Pass immediately to next middleware/controller
  next();

  // Asynchronous background tracking
  try {
    // Only track actual API calls, ignore static files or preflight
    if (req.method === "OPTIONS" || !req.originalUrl.startsWith("/api/")) return;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Use $inc for high-performance atomic updates
    Analytics.findOneAndUpdate(
      { date: today },
      { $inc: { apiCalls: 1 } },
      { upsert: true, returnDocument: 'before' }
    ).catch((err) => {
      // Silently swallow errors to prevent disrupting the server for tracking failures
      console.error("[Tracking Error]", err.message);
    });
  } catch (error) {
    // Failsafe
  }
};

export default trackingMiddleware;
