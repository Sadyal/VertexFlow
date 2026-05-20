import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import redis, { getRedisDuplicate } from "../config/redis.js";
import { socketAuth } from "./socketAuth.js";
import { registerDocHandlers } from "./doc.socket.js";
import { registerNetworkHandlers, broadcastPresence } from "./network.socket.js";
import { registerUserSocket, removeUserSocket } from "./socketState.js";

export default function setupSocket(server) {
  const io = new Server(server, {
    pingInterval: 25000,
    pingTimeout: 20000,
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Setup Redis Adapter for Load Balancing
  if (redis) {
    const subClient = getRedisDuplicate();
    io.adapter(createAdapter(redis, subClient));
    console.log("⚡ Redis Socket Adapter enabled");

    // 🚀 BOOT-TIME CLEANUP: Let keys expire naturally via Redis TTL rather than wiping out other nodes' sessions!
    console.log("🧹 Boot-time presence integrity check ready");
  }

  // ⚡ Sockets Ghost/Orphan Background Cleanup Worker (Runs every 60s)
  if (redis) {
    setInterval(async () => {
      try {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'user_sockets:*', 'COUNT', 100);
          cursor = nextCursor;
          
          if (keys.length === 0) continue;

          for (const key of keys) {
            const uids = key.split(":")[1];
            const socketIds = await redis.smembers(key);
            
            const pipeline = redis.pipeline();
            let hasChanges = false;

            for (const sid of socketIds) {
              // 🛡️ SRE CLUSTER-SAFE CHECK: Check if socket is active on ANY node in the cluster!
              const activeSockets = await io.in(sid).fetchSockets();
              const isGlobalActive = activeSockets.length > 0;
              if (!isGlobalActive) {
                pipeline.srem(key, sid);
                hasChanges = true;
              }
            }
            
            if (hasChanges) {
              await pipeline.exec(); // Batch execute all removals
              const remaining = await redis.scard(key);
              if (remaining === 0) {
                const cleanupPipeline = redis.pipeline();
                cleanupPipeline.del(key);
                cleanupPipeline.srem("online_users", uids);
                await cleanupPipeline.exec();
              }
            }
          }
        } while (cursor !== '0');
      } catch (err) {
        console.error("❌ [SRE SOCKETS WORKER] Error during cleanup scan:", err.message);
      }
    }, 60000).unref();
  }

  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log("🔌 Connected:", socket.id, "| User:", userId);

    // 🚀 Register handlers immediately (BEFORE async yielding to prevent race condition)
    registerDocHandlers(io, socket);
    registerNetworkHandlers(io, socket);

    // Register user in Redis (multi-device support)
    const registration = await registerUserSocket(socket, userId);
    if (!registration.success) {
      // Session rejected immediately due to max limit (3 tabs)
      return;
    }

    if (registration.isFirstConnection) {
      await broadcastPresence(io, userId, true);
    }

    // 🕒 Sliding Heartbeat Expire (20s Refresh)
    socket.on("heartbeat", async () => {
      if (redis) {
        const userSocketsKey = `user_sockets:${userId}`;
        await redis.expire(userSocketsKey, 90); // Keep alive for 90s
        await redis.expire("online_users", 90);
      }
    });

    socket.on("disconnect", async () => {
      console.log("⛔ Disconnected:", socket.id);
      
      if (socket.currentDoc) {
        socket.broadcast.to(socket.currentDoc).emit("presence-left", {
          socketId: socket.id,
          userId: socket.userId
        });
      }
      
      const isLastConnection = await removeUserSocket(io, userId, socket.id);
      if (isLastConnection) {
        await broadcastPresence(io, userId, false);
      }
    });
  });

  return io;
}