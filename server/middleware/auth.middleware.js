import { verifyToken } from "../utils/token.js";

/**
 * 🔐 AUTH MIDDLEWARE
 * Supports:
 * - Cookies (browser)
 * - Bearer token (Postman / mobile)
 */
const authMiddleware = (req, res, next) => {
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
     * 🔹 5. Attach user
     */
    req.userId = decoded.id;

    next();
  } catch (err) {
    return next({
      status: 401,
      message: "Unauthorized: Invalid or expired token",
    });
  }
};

export default authMiddleware;