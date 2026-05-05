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
import { authLimiter, otpLimiter } from "../../middleware/rateLimiter.js";

const router = express.Router();

// 📦 Standard limit for most auth operations
const standardParser = express.json({ limit: "10kb" });
const largeParser = express.json({ limit: "2mb" });

/**
 * 🔐 AUTH ROUTES
 */
router.post("/register", standardParser, authLimiter, register);
router.post("/login", standardParser, authLimiter, login);
router.post("/logout", authMiddleware, standardParser, logout);

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
router.post("/reset-password", standardParser, authLimiter, resetPassword);

/**
 * 🔄 TOKEN MANAGEMENT
 */
router.post("/refresh-token", standardParser, refreshToken);

export default router;