import jwt from "jsonwebtoken";

/**
 * Access Token (short-lived)
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

/**
 * Refresh Token (long-lived)
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

/**
 * Verify Token
 */
export const verifyToken = (token) => {
  if (!token) {
    const err = new Error("Token missing");
    err.status = 401;
    throw err;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const err = new Error("Invalid or expired token");
    err.status = 401;
    throw err;
  }
};