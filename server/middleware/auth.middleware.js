import { verifyToken } from "../utils/token.js";
import redis from "../config/redis.js";
import userModel from "../models/user.model.js";

/**
 * 🔐 AUTH MIDDLEWARE (Enterprise-grade Session Versioning)
 * Supports:
 * - Cookies (browser)
 * - Bearer token (Postman / mobile)
 */
const authMiddleware = async (req, res, next) => {
  try {
    let token;

    /**
     * 🔹 1. Cookie
     */
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    /**
     * 🔹 2. Authorization header
     */
    else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    /**
     * 🔹 3. Missing token
     */
    if (!token) {
      return next({
        status: 401,
        message: "Unauthorized: Token missing",
      });
    }

    /**
     * 🔹 4. Verify token
     */
    const decoded = verifyToken(token);

    if (!decoded?.id) {
      return next({
        status: 401,
        message: "Unauthorized: Invalid token payload",
      });
    }

    /**
     * 🔹 5. Enterprise Session Validation
     */
    const tokenVersion = decoded.sessionVersion;
    if (tokenVersion === undefined) {
      return next({
        status: 401,
        message: "Unauthorized: Session metadata missing",
      });
    }

    let activeVersion = null;
    const redisKey = `session_version:${decoded.id}`;

    if (redis && redis.status === "ready") {
      const cached = await redis.get(redisKey);
      if (cached !== null) {
        activeVersion = parseInt(cached, 10);
      }
    }

    if (activeVersion === null) {
      // Graceful fallback to MongoDB
      const user = await userModel.findById(decoded.id).select("+sessionVersion");
      if (!user) {
        return next({
          status: 401,
          message: "Unauthorized: User not found",
        });
      }
      activeVersion = user.sessionVersion || 0;

      // Cache the version in Redis for fast future queries
      if (redis && redis.status === "ready") {
        await redis.set(redisKey, activeVersion, "EX", 86400); // Cache for 24h
      }
    }

    if (tokenVersion !== activeVersion) {
      return next({
        status: 401,
        message: "Unauthorized: Session is stale or has been invalidated",
      });
    }

    /**
     * 🔹 6. Attach user context
     */
    req.userId = decoded.id;
    req.sessionVersion = tokenVersion;

    next();
  } catch (err) {
    return next({
      status: 401,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

export default authMiddleware;