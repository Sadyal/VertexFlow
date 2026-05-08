import Settings from "../models/settings.model.js";
import User from "../models/user.model.js";
import { verifyToken } from "../utils/token.js";

/**
 * 🛠️ MAINTENANCE MIDDLEWARE
 * Checks if the platform is in maintenance mode.
 * Blocks all non-admin requests if enabled.
 */
const maintenanceMiddleware = async (req, res, next) => {
  try {
    // 1. Fetch current settings
    const settings = await Settings.findOne();
    
    // 2. If no settings or maintenance mode is OFF, continue
    if (!settings || !settings.maintenanceMode) {
      return next();
    }

    // 3. Maintenance is ON. We need to check if the requester is an Admin.
    let token;
    if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded?.id) {
        const user = await User.findById(decoded.id).select('role');
        if (user && user.role === 'admin') {
          return next();
        }
      }
    }

    // 4. If we reach here, they are either not logged in or not an admin
    return res.status(503).json({
      success: false,
      message: "VertexFlow is currently under scheduled maintenance. Only administrators can access the platform at this time.",
      isMaintenance: true
    });

  } catch (error) {
    // Failsafe: allow request if settings check fails
    next();
  }
};

export default maintenanceMiddleware;
