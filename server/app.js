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
app.use(globalLimiter); // 🚀 Apply to all routes


/**
 * 📦 BODY PARSING
 * Note: Body parsing is handled at the router level for granular security limits.
 */

/**
 * 🍪 COOKIE PARSER & BODY LIMITS
 */
app.use(cookieParser());
app.use(express.json({ limit: "10mb" })); // 🛡️ Prevent "Big Payload" crashes
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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