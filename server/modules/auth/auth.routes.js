import express from "express";

import {
  register,
  login,
  logout,
  me,
  sendVerifyOtp,
  verifyEmail,
  sendResetOtp,
  resetPassword,
  refreshToken,
  updateProfile,
} from "./auth.controller.js";

import authMiddleware from "../../middleware/auth.middleware.js";
import { authLimiter, otpLimiter, resetPasswordLimiter } from "../../middleware/rateLimiter.js";

const router = express.Router();

// 📦 Standard limit for most auth operations
const standardParser = express.json({ limit: "16kb" });
const largeParser = express.json({ limit: "2mb" });

/**
 * 🔐 AUTH ROUTES
 */
router.post("/register", standardParser, authLimiter, register);
router.post("/login", standardParser, authLimiter, login);

/**
 * @route POST /api/auth/logout
 * @desc Logout user (Always succeeds even if token is expired)
 */
router.post("/logout", standardParser, logout);

/**
 * 👤 USER ROUTE
 */
router.get("/me", authMiddleware, me);
router.patch("/update-profile", authMiddleware, largeParser, updateProfile);

/**
 * 📧 EMAIL VERIFICATION
 */
router.post("/send-verify-otp", authMiddleware, standardParser, otpLimiter, sendVerifyOtp);
router.post("/verify-email", standardParser, verifyEmail);

/**
 * 🔐 PASSWORD RESET
 */
router.post("/send-reset-otp", standardParser, otpLimiter, sendResetOtp);
router.post("/reset-password", standardParser, resetPasswordLimiter, resetPassword);

/**
 * 🔄 TOKEN MANAGEMENT
 */
router.post("/refresh-token", standardParser, refreshToken);

export default router;