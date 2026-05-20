import Redis from "ioredis";
import "dotenv/config";

async function run() {
  console.log("Connecting to Redis...");
  console.log("REDIS_URL:", process.env.REDIS_URL);
  
  if (!process.env.REDIS_URL) {
    console.log("No REDIS_URL found in .env!");
    return;
  }
  
  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    connectTimeout: 5000
  });
  
  redis.on("connect", () => {
    console.log("✅ Redis connect event fired!");
  });
  
  try {
    const pong = await redis.ping();
    console.log("✅ Ping response:", pong);
    
    // Check keys
    const keys = await redis.keys("*");
    console.log("✅ All keys in Redis:", keys);
  } catch (err) {
    console.error("❌ Redis connection failed:", err.message);
  } finally {
    await redis.quit();
    console.log("Disconnected.");
  }
}

run();
