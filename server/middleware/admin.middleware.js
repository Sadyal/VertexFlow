import User from '../models/user.model.js';

/**
 * 🛡️ ADMIN MIDDLEWARE
 * Must be used AFTER auth.middleware.js
 * Blocks any non-admin user from accessing admin routes.
 */
const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.userId).select('role');

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Admin privileges required",
      });
    }

    // Pass user to next middleware if needed
    req.user = user;
    next();
  } catch (error) {
    console.error("Admin Middleware Error:", error);
    res.status(500).json({ success: false, message: "Server error verifying admin status" });
  }
};

export default adminMiddleware;
