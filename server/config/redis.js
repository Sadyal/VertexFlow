import Redis from "ioredis";

let redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    // Upstash often needs specific settings for stability
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redis.on("connect", () => console.log("✅ Redis connected"));
  redis.on("error", (err) => console.error("❌ Redis error:", err.message));
}

/**
 * Helper to get a duplicate connection for Pub/Sub
 */
export const getRedisDuplicate = () => {
  if (!redis) return null;
  return redis.duplicate();
};

export default redis;

