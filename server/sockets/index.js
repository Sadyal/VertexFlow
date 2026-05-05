import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import redis, { getRedisDuplicate } from "../config/redis.js";
import { socketAuth } from "./socketAuth.js";
import { registerDocHandlers } from "./doc.socket.js";
import { registerNetworkHandlers } from "./network.socket.js";
import { registerUserSocket, removeUserSocket } from "./socketState.js";

export default function setupSocket(server) {
  const io = new Server(server, {
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

    // 🚀 BOOT-TIME CLEANUP: Clear stale presence data from previous runs
    // This resolves "stuck" online statuses after server crashes.
    (async () => {
      try {
        const keys = await redis.keys('user_sockets:*');
        if (keys.length > 0) await redis.del(...keys);
        await redis.del('online_users');
        await redis.del('user_socket_counts'); // Clean up old legacy key too
        console.log("🧹 Presence state cleaned on boot");
      } catch (err) {
        console.error("❌ Presence cleanup error:", err.message);
      }
    })();
  }



  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log("🔌 Connected:", socket.id, "| User:", userId);

    // 🚀 Register handlers immediately
    registerDocHandlers(io, socket);
    registerNetworkHandlers(io, socket);

    // Register user in Redis (multi-device support)
    // Only broadcast "Online" if this is their first connection
    const isFirstConnection = await registerUserSocket(socket, userId);
    if (isFirstConnection) {
      const { broadcastPresence } = await import('./network.socket.js');
      await broadcastPresence(io, userId, true);
    }

    socket.on("disconnect", async () => {
      console.log("⛔ Disconnected:", socket.id);
      
      // Only broadcast "Offline" if this was their last active connection
      const isLastConnection = await removeUserSocket(io, userId, socket.id);
      if (isLastConnection) {
        const { broadcastPresence } = await import('./network.socket.js');
        await broadcastPresence(io, userId, false);
      }
    });
  });




  return io;
}