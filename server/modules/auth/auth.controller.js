import {
  registerUser,
  loginUser,
  getCurrentUser,
  refreshAccessTokenService,
  sendVerifyOtpService,
  verifyEmailService,
  sendResetOtpService,
  resetPasswordService,
  updateProfileService,
} from "./auth.service.js";

import userModel from "../../models/user.model.js";
import { successResponse } from "../../utils/response.js";

/**
 * 🔐 COOKIE CONFIG
 */
const isProd = process.env.NODE_ENV === "production";

const accessTokenOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 15 * 60 * 1000, // 15 min
};

const refreshTokenOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * REGISTER
 */
export const register = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await registerUser(req.body);

    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenOptions);

    return successResponse(res, { user }, "Registration successful", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * LOGIN
 */
export const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await loginUser(req.body);

    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenOptions);

    return successResponse(res, { user }, "Login successful");
  } catch (err) {
    next(err);
  }
};

/**
 * LOGOUT
 */
export const logout = async (req, res, next) => {
  try {
    // 🔐 Invalidate session in DB (Non-blocking background task)
    if (req.userId) {
      userModel.findByIdAndUpdate(req.userId, {
        refreshToken: "",
      }).catch(err => console.error("Logout DB error:", err));
    }

    res.clearCookie("accessToken", accessTokenOptions);
    res.clearCookie("refreshToken", refreshTokenOptions);

    return successResponse(res, {}, "Logout successful");
  } catch (err) {
    next(err);
  }
};

/**
 * GET CURRENT USER
 */
export const me = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.userId);
    return successResponse(res, { user });
  } catch (err) {
    next(err);
  }
};

/**
 * 🔄 REFRESH TOKEN
 */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      const error = new Error("Unauthorized");
      error.status = 401;
      throw error;
    }

    const { accessToken, refreshToken: newRefreshToken } = await refreshAccessTokenService(token);

    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", newRefreshToken, refreshTokenOptions);

    return successResponse(res, {}, "Token refreshed");
  } catch (err) {
    next(err);
  }
};

/**
 * 📧 SEND VERIFY OTP
 */
export const sendVerifyOtp = async (req, res, next) => {
  try {
    const result = await sendVerifyOtpService(req.userId);
    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * ✅ VERIFY EMAIL
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const result = await verifyEmailService(req.body);
    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * 📧 SEND RESET OTP
 */
export const sendResetOtp = async (req, res, next) => {
  try {
    const result = await sendResetOtpService(req.body.email);
    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * 🔐 RESET PASSWORD
 */
export const resetPassword = async (req, res, next) => {
  try {
    const result = await resetPasswordService(req.body);
    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE PROFILE
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user = await updateProfileService(req.userId, req.body);
    return successResponse(res, { user }, "Profile updated successfully");
  } catch (err) {
    next(err);
  }
};