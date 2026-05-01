import nodemailer from "nodemailer";

/**
 * 🔒 Validate required env variables (fail fast)
 */
const requiredEnv = ["SMTP_USER", "SMTP_PASS"];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
});

/**
 * 📧 Create transporter (Gmail)
 * Uses App Password (NOT your normal Gmail password)
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Optional: enable in dev for debugging
  ...(process.env.NODE_ENV === "development" && {
    logger: true,
    debug: true,
  }),
});

/**
 * ✅ Verify transporter on startup
 * (non-blocking but logs readiness)
 */
(async () => {
  try {
    await transporter.verify();
    console.log("✅ Gmail SMTP ready");
  } catch (err) {
    console.error("❌ Gmail SMTP error:", err.message);
  }
})();

export default transporter;