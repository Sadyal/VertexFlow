import bcrypt from "bcryptjs";
import userModel from "../../models/user.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "../../utils/token.js";
import { generateOtp } from "../../utils/otp.js";
import {
  sendEmail,
  generateVerifyEmailTemplate,
} from "../../utils/email.js";

/**
 * Utility: normalize email
 */
const normalizeEmail = (email) => email.trim().toLowerCase();

/**
 * Utility: sanitize user object
 */
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
});

/**
 * Utility: structured error
 */
const createError = (message, status = 500) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * REGISTER USER
 */
export const registerUser = async ({ name, email, password }) => {
  if (!name || !email || !password) {
    throw createError("All fields are required", 400);
  }

  const normalizedEmail = normalizeEmail(email);

  if (password.length < 6) {
    throw createError("Password must be at least 6 characters", 400);
  }

  const existingUser = await userModel.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw createError("User already exists", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = generateOtp();

  const user = await userModel.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    verifyOtp: otp,
    verifyOtpExpireAt: Date.now() + 24 * 60 * 60 * 1000,
    isAccountVerified: false,
  });

  await sendEmail({
    to: user.email,
    subject: "Verify Your Account",
    html: generateVerifyEmailTemplate(otp, user.email),
  });

  // 🔐 Issue tokens immediately (optional UX improvement)
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

/**
 * LOGIN USER
 */
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw createError("Email and password are required", 400);
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await userModel
    .findOne({ email: normalizedEmail })
    .select("+password");

  // 🔐 prevent enumeration
  if (!user) {
    throw createError("Invalid credentials", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw createError("Invalid credentials", 401);
  }

  if (!user.isAccountVerified) {
    throw createError("Please verify your account first", 403);
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save();

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

/**
 * REFRESH ACCESS TOKEN
 */
export const refreshAccessTokenService = async (refreshToken) => {
  if (!refreshToken) {
    throw createError("Unauthorized", 401);
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken);
  } catch {
    throw createError("Invalid refresh token", 401);
  }

const user = await userModel
  .findById(decoded.id)
  .select("+refreshToken");

  if (!user || user.refreshToken !== refreshToken) {
    throw createError("Invalid refresh token", 401);
  }

  const newAccessToken = generateAccessToken(user._id);

  return { accessToken: newAccessToken };
};

/**
 * GET CURRENT USER
 */
export const getCurrentUser = async (userId) => {
  if (!userId) {
    throw createError("Unauthorized", 401);
  }

  const user = await userModel.findById(userId).select("-password");

  if (!user) {
    throw createError("User not found", 404);
  }

  return sanitizeUser(user);
};

/**
 * SEND VERIFY OTP (RESEND)
 */
export const sendVerifyOtpService = async (userId) => {
  const user = await userModel
  .findById(userId)
  .select("+verifyOtp +verifyOtpExpireAt");

  if (!user) {
    throw createError("User not found", 404);
  }

  if (user.isAccountVerified) {
    throw createError("Account already verified", 400);
  }

  // 🔐 anti-spam cooldown
  if (
    user.verifyOtpExpireAt &&
    Date.now() < user.verifyOtpExpireAt - 23 * 60 * 60 * 1000
  ) {
    throw createError("OTP already sent. Please check your email.", 429);
  }

  const otp = generateOtp();

  user.verifyOtp = otp;
  user.verifyOtpExpireAt = Date.now() + 24 * 60 * 60 * 1000;

  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Verify Your Account",
    html: generateVerifyEmailTemplate(otp, user.email),
  });

  return { message: "OTP sent successfully" };
};
/**
 * ✅ VERIFY EMAIL (PRODUCTION-GRADE - FIXED)
 */
export const verifyEmailService = async ({ email, otp }) => {
  // 🔹 Validate input
  if (!email || !otp) {
    throw createError("Email and OTP are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 🔹 Fetch user WITH OTP fields (important)
  const user = await userModel
    .findOne({ email: normalizedEmail })
    .select("+verifyOtp +verifyOtpExpireAt");

  if (!user) {
    throw createError("User not found", 404);
  }

  // 🔹 Safe comparison
  const isOtpValid =
    String(user.verifyOtp).trim() === String(otp).trim();

  const isExpired = Date.now() > user.verifyOtpExpireAt;

  // 🔹 Debug (optional - remove later)
  console.log({
    dbOtp: user.verifyOtp,
    inputOtp: otp,
    isOtpValid,
    isExpired,
  });

  if (!isOtpValid || isExpired) {
    throw createError("Invalid or expired OTP", 400);
  }

  // 🔹 Mark verified
  user.isAccountVerified = true;
  user.verifyOtp = "";
  user.verifyOtpExpireAt = 0;

  await user.save();

  return { message: "Email verified successfully" };
};
/**
 * 📧 SEND RESET OTP
 */
export const sendResetOtpService = async (email) => {
  if (!email) {
    throw createError("Email is required", 400);
  }

  const normalizedEmail = normalizeEmail(email);

  const user = await userModel.findOne({ email: normalizedEmail });

  if (!user) {
    throw createError("User not found", 404);
  }

  const otp = generateOtp();

  user.resetOtp = String(otp); // ✅ enforce string
  user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Password Reset OTP",
    html: `
      <h2>Password Reset</h2>
      <p>Your OTP is: <b>${otp}</b></p>
      <p>This OTP is valid for 15 minutes.</p>
    `,
  });

  return { message: "Reset OTP sent successfully" };
};
/**
 * 🔐 RESET PASSWORD
 */
export const resetPasswordService = async ({
  email,
  otp,
  newPassword,
}) => {
  if (!email || !otp || !newPassword) {
    throw createError("All fields are required", 400);
  }

  if (newPassword.length < 6) {
    throw createError("Password must be at least 6 characters", 400);
  }

  const normalizedEmail = normalizeEmail(email);

  // ✅ FIX: include OTP fields
  const user = await userModel
    .findOne({ email: normalizedEmail })
    .select("+password +resetOtp +resetOtpExpireAt");

  if (!user) {
    throw createError("User not found", 404);
  }

  // ✅ defensive check (important in production)
  if (!user.resetOtp || !user.resetOtpExpireAt) {
    throw createError("No reset request found", 400);
  }

  const isOtpValid =
    String(user.resetOtp).trim() === String(otp).trim();

  const isExpired = Date.now() > user.resetOtpExpireAt;

  // ✅ optional debug (remove in production)
  console.log({
    enteredOtp: otp,
    storedOtp: user.resetOtp,
    expireAt: user.resetOtpExpireAt,
    now: Date.now(),
    isOtpValid,
    isExpired,
  });

  if (!isOtpValid || isExpired) {
    throw createError("Invalid or expired OTP", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;

  // ✅ clear OTP (security)
  user.resetOtp = "";
  user.resetOtpExpireAt = 0;

  await user.save();

  return { message: "Password reset successful" };
};

/**
 * UPDATE PROFILE (NAME + AVATAR)
 */
export const updateProfileService = async (userId, { name, avatar }) => {
  const user = await userModel.findById(userId);
  if (!user) throw createError("User not found", 404);

  if (name) user.name = name.trim();
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  return sanitizeUser(user);
};