import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import path from "path";

import authRoutes from "./modules/auth/auth.routes.js";
import docRoutes from "./modules/document/doc.routes.js";
import networkRoutes from "./modules/network/network.routes.js";
import aiRoutes from "./modules/ai/ai.routes.js";
import errorMiddleware from "./middleware/error.middleware.js";
import { globalLimiter } from "./middleware/rateLimiter.js";
import maintenanceMiddleware from "./middleware/maintenance.middleware.js";
import socialRoutes from "./modules/social/social.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import User from "./models/user.model.js";
import Activity from "./models/activity.model.js";
import { requestTimeout, payloadSanitizer, malformedJsonHandler } from "./middleware/protection.middleware.js";

const app = express();

// 🚀 PERFORMANCE: Compress all responses
app.use(compression());

/**
 * 📡 PROXY TRUST
 * Required for express-rate-limit to see the real client IP 
 * when deployed behind a proxy (Nginx, Vercel, etc.)
 */
if (process.env.NODE_ENV === "production") {
  app.set('trust proxy', 1);
}

/**
 * 🌍 ENV
 */
const isProd = process.env.NODE_ENV === "production";

/**
 * 🔐 SECURITY HEADERS
 */
/**
 * 🌐 CORS CONFIG (CRITICAL: MUST BE BEFORE RATE LIMITER)
 */
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:4000",
  process.env.CLIENT_URL // 🚀 PRODUCTION URL (Vercel)
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") || // 🚀 Allow all Vercel previews
        !isProd // 🚀 Always allow in development
      ) {
        return callback(null, true);
      }

      console.error(`❌ CORS blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

/**
 * 🔐 SECURITY HEADERS & RATE LIMITING
 */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // 🖼️ ALLOW IMAGES TO BE LOADED ACROSS PORTS
}));
app.use(requestTimeout); // 🕒 Strict 10-second production timeout guard
app.use(globalLimiter); // 🚀 Apply to all routes


/**
 * 📦 BODY PARSING
 * Note: Body parsing is handled at the router level for granular security limits.
 */

/**
 * 🍪 COOKIE PARSER & BODY LIMITS
 */
app.use(cookieParser());
app.use(express.json({ limit: "2mb" })); // 🛡️ SRE Production Upgrade: 2mb limit to support avatar uploads
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(malformedJsonHandler); // Gracefully handle malformed bodies
app.use(payloadSanitizer);    // Block nesting and array bombs

/**
 * 🧪 REQUEST LOGGER (DEV ONLY)
 */
if (!isProd) {
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.originalUrl}`);
    next();
  });
}

/**
 * 📁 STATIC ASSETS
 * Serve uploaded post images
 */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/**
 * ❤️ HEALTH CHECK
 */
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API running",
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * 🧹 SECURE DATABASE CLEANUP / CRON JOB (FREE METHOD)
 * Call this endpoint from a free pinger service like Cron-job.org or UptimeRobot.
 * Secured via query parameter: ?secret=YOUR_CRON_SECRET
 */
app.get("/api/cron-cleanup", async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  const cronSecret = process.env.CRON_SECRET || (!isProd ? "default_super_secret_token_123456" : null);
  
  if (isProd && !process.env.CRON_SECRET) {
    console.error("🚨 [SECURITY ALERT] CRON_SECRET environment variable is missing in production! Cleanup endpoint is disabled.");
    return res.status(500).json({
      success: false,
      message: "Configuration error: Database maintenance is not secure.",
    });
  }

  const incomingSecret = req.query.secret || req.headers["x-cron-secret"];

  if (!incomingSecret || incomingSecret !== cronSecret) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing cron secret.",
    });
  }

  console.log("🚀 External HTTP Cron Triggered: Starting DB Maintenance...");
  const startTime = Date.now();

  try {
    const now = Date.now();

    // 1. Clear expired verification OTPs
    const verifyOtpResult = await User.updateMany(
      { verifyOtpExpireAt: { $gt: 0, $lt: now } },
      { $set: { verifyOtp: "", verifyOtpExpireAt: 0 } }
    );

    // 2. Clear expired password reset OTPs
    const resetOtpResult = await User.updateMany(
      { resetOtpExpireAt: { $gt: 0, $lt: now } },
      { $set: { resetOtp: "", resetOtpExpireAt: 0 } }
    );

    // 3. Delete unverified guest accounts older than 24 hours
    const unverifiedThreshold = new Date(now - 24 * 60 * 60 * 1000);
    const deletedUnverifiedResult = await User.deleteMany({
      isAccountVerified: false,
      createdAt: { $lt: unverifiedThreshold }
    });

    // 4. Trim activity log entries older than 30 days
    const activityThreshold = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const deletedActivitiesResult = await Activity.deleteMany({
      createdAt: { $lt: activityThreshold }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const logMsg = `✨ DB Maintenance complete in ${duration}s. OTPs: ${verifyOtpResult.modifiedCount} verif / ${resetOtpResult.modifiedCount} reset. Users deleted: ${deletedUnverifiedResult.deletedCount}. Logs pruned: ${deletedActivitiesResult.deletedCount}.`;
    console.log(logMsg);

    return res.status(200).json({
      success: true,
      message: "Database maintenance executed successfully.",
      duration: `${duration}s`,
      stats: {
        clearedVerifyOtps: verifyOtpResult.modifiedCount,
        clearedResetOtps: resetOtpResult.modifiedCount,
        deletedUnverifiedUsers: deletedUnverifiedResult.deletedCount,
        prunedActivityLogs: deletedActivitiesResult.deletedCount
      }
    });
  } catch (error) {
    console.error("❌ External HTTP Cron DB Maintenance failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Database maintenance execution failed.",
      error: error.message
    });
  }
});

import trackingMiddleware from "./middleware/tracking.middleware.js";
import adminRoutes from "./modules/admin/admin.routes.js";

/**
 * 📊 GLOBAL TRACKING
 * Asynchronous tracking of API usage
 */
app.use(trackingMiddleware);

/**
 * 🚀 ROUTES
 */
app.use("/api/social", socialRoutes); // ⚡ High priority for multipart handling
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

// 🛠️ PLATFORM SECURITY: Maintenance Enforcement
app.use(maintenanceMiddleware);

app.use("/api/docs", docRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

/**
 * ❌ 404 HANDLER
 * ⚠️ MUST come AFTER routes
 */
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/**
 * ⚠️ GLOBAL ERROR HANDLER
 * ⚠️ MUST be LAST middleware
 */
app.use(errorMiddleware);

export default app;