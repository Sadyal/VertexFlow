import { Server } from "socket.io";
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

  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = socket.userId;

    console.log("🔌 Connected:", socket.id, "| User:", userId);

    // Register user (multi-device support)
    registerUserSocket(userId, socket.id);

    // Attach feature handlers
    registerDocHandlers(io, socket);
    registerNetworkHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log("⛔ Disconnected:", socket.id);
      removeUserSocket(userId, socket.id);
    });
  });

  return io;
}