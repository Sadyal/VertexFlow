import rateLimit from 'express-rate-limit';

/**
 * 🛡️ GENERAL LIMITER
 * Applied to all API routes to prevent basic DoS.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 🚀 Increased for better UX in dashboard/collaborative environments
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 🛡️ AUTH LIMITER (Stricter)
 * Applied to login and registration to prevent brute force.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/register attempts per hour
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again in an hour."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 🛡️ OTP LIMITER (Very Strict)
 * Applied to OTP sending to prevent email spam/SMS costs.
 */
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 OTP requests per hour
  message: {
    success: false,
    message: "Too many OTP requests. Please wait an hour before requesting another code."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
