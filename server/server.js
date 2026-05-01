import http from "http";
import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";
import setupSocket from "./sockets/index.js";

const PORT = process.env.PORT || 4000;

/**
 * START SERVER
 */
const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);
    setupSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });

    /**
     * GRACEFUL SHUTDOWN
     */
    const shutdown = (signal) => {
      console.log(`\n⚠️ ${signal} received. Shutting down...`);

      server.close(() => {
        console.log("💤 Server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

/**
 * GLOBAL ERROR HANDLERS
 */
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});