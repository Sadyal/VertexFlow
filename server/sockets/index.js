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
  }



  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log("🔌 Connected:", socket.id, "| User:", userId);

    // 🚀 FIX: Register handlers IMMEDIATELY so we don't miss any events 
    // from the client during the async Redis registration.
    registerDocHandlers(io, socket);
    const networkPromise = registerNetworkHandlers(io, socket);

    // Register user in Redis (multi-device support)
    await registerUserSocket(socket, userId);
    
    // Ensure network handlers are fully ready
    await networkPromise;

    socket.on("disconnect", async () => {
      console.log("⛔ Disconnected:", socket.id);
      await removeUserSocket(io, userId);
    });
  });




  return io;
}