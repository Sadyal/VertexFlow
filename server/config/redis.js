import Redis from "ioredis";

let redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    // Upstash often needs specific settings for stability
    retryStrategy: (times) => {
      // Exponential backoff with a cap at 10 seconds to reduce log spam during internet outages
      const delay = Math.min(times * 100, 10000);
      return delay;
    }
  });

  redis.on("connect", () => console.log("✅ Redis connected"));
  redis.on("error", (err) => {
    // Check if it's a connection/DNS error (internet down)
    const isOffline = err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET';
    
    if (isOffline) {
      // Log as a warning instead of a full error to reduce visual noise if desired,
      // but keep it clear that it's a connection issue.
      console.warn("📡 Redis offline/reconnecting:", err.message);
    } else {
      console.error("❌ Redis error:", err.message);
    }
  });
}

/**
 * Helper to get a duplicate connection for Pub/Sub
 * Ensures the duplicate also has an error handler
 */
export const getRedisDuplicate = () => {
  if (!redis) return null;
  const duplicate = redis.duplicate();
  
  duplicate.on("error", (err) => {
    // Only log if it's NOT a common connection error, as the main client will already log it
    const isOffline = err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET';
    if (!isOffline) {
      console.error("❌ Redis Duplicate Client error:", err.message);
    }
  });

  return duplicate;
};

export default redis;

