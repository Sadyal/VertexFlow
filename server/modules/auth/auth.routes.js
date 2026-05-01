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

const router = express.Router();

/**
 * 🔐 AUTH ROUTES
 */
router.post("/register", register);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);

/**
 * 👤 USER ROUTE
 */
router.get("/me", authMiddleware, me);
router.patch("/update-profile", authMiddleware, updateProfile);

/**
 * 📧 EMAIL VERIFICATION
 */
router.post("/send-verify-otp", authMiddleware, sendVerifyOtp);
router.post("/verify-email", verifyEmail);

/**
 * 🔐 PASSWORD RESET
 */
router.post("/send-reset-otp", sendResetOtp);
router.post("/reset-password", resetPassword);

/**
 * 🔄 TOKEN MANAGEMENT
 */
router.post("/refresh-token", refreshToken);

export default router;