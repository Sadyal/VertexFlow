import Analytics from "../models/analytics.model.js";

// 📊 In-memory counters for batching (avoids database/socket congestion under stress testing)
let apiCallsBatch = 0;
let flushTimeoutId = null;

const flushMetrics = async () => {
  if (apiCallsBatch === 0) return;

  const countToFlush = apiCallsBatch;
  apiCallsBatch = 0; // Reset instantly before async calls to prevent race conditions
  flushTimeoutId = null;

  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Perform a single atomic increment write for the entire batch
    await Analytics.findOneAndUpdate(
      { date: today },
      { $inc: { apiCalls: countToFlush } },
      { upsert: true, returnDocument: 'before' }
    );
  } catch (err) {
    console.error("[Tracking Error] Failed to flush metrics:", err.message);
    // Restore count in case of error so we don't lose data
    apiCallsBatch += countToFlush;
  }
};

/**
 * 📊 LIGHTWEIGHT TRACKING MIDDLEWARE
 * Batches API hit counts in memory and flushes them periodically
 * to prevent high-concurrency database queries from causing OOM/memory leaks.
 */
const trackingMiddleware = (req, res, next) => {
  // Pass immediately to next middleware/controller
  next();

  try {
    // Only track actual API calls, ignore static files or preflight
    if (req.method === "OPTIONS" || !req.originalUrl.startsWith("/api/")) return;

    // Increment in-memory counter
    apiCallsBatch++;

    // Debounce/schedule flush once every 10 seconds if not already scheduled
    if (!flushTimeoutId) {
      flushTimeoutId = setTimeout(flushMetrics, 10000);
    }
  } catch (error) {
    // Failsafe
  }
};

export default trackingMiddleware;
