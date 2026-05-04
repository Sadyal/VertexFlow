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

/**
 * 🔐 AUTH ROUTES
 */
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", authMiddleware, logout);

/**
 * 👤 USER ROUTE
 */
router.get("/me", authMiddleware, me);
router.patch("/update-profile", authMiddleware, updateProfile);

/**
 * 📧 EMAIL VERIFICATION
 */
router.post("/send-verify-otp", authMiddleware, otpLimiter, sendVerifyOtp);
router.post("/verify-email", verifyEmail);

/**
 * 🔐 PASSWORD RESET
 */
router.post("/send-reset-otp", otpLimiter, sendResetOtp);
router.post("/reset-password", authLimiter, resetPassword);

/**
 * 🔄 TOKEN MANAGEMENT
 */
router.post("/refresh-token", refreshToken);

export default router;