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

/**
 * 🛡️ PASSWORD RESET LIMITER
 * Protects OTP validation from brute force attacks.
 */
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 reset attempts per 15 mins
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 🛡️ UPLOAD LIMITER (Strict)
 * Prevents direct API flooding of image uploads to Cloudinary/Sharp.
 * Allows 6 uploads per minute (1 image every 10 seconds average),
 * which is plenty for active document creation, but blocks script spammers!
 */
export const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 6, // Max 6 image uploads/pastes per minute
  message: {
    success: false,
    message: "Too many image uploads. Please wait a moment before uploading more images."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 💬 COMMENT BURST LIMITER (Strict)
 * Allows max 3 comments within a 10-second window.
 */
export const commentBurstLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 3,
  message: {
    success: false,
    message: "Comment burst limit reached. Please wait 10 seconds."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 💬 COMMENT RATE LIMITER (General)
 * Allows max 6 comments within a 1-minute window.
 */
export const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6,
  message: {
    success: false,
    message: "Too many comments. Please wait a minute."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * ❤️ LIKE STORM LIMITER (Throttle)
 * Allows max 30 likes/unlikes per minute.
 */
export const likeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    message: "Too many like actions. Please slow down."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 📝 POST CREATION LIMITER
 * Allows max 5 posts per minute.
 */
export const postLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    message: "Too many posts. Please wait a moment."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
