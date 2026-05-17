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
 * 📧 Create transporter (Universal SMTP - Port 465 for SSL)
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
  port: process.env.SMTP_PORT || 2525, // 🚀 Cloud-compatible port (Render blocks 465)
  secure: false, // 🔒 STARTTLS automatically handles encryption over 2525
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true, // ✅ Use connection pooling for stability
  maxConnections: 5,
  socketTimeout: 20000, // ✅ Wait up to 20 seconds for a connection
  connectionTimeout: 20000,
});

/**
 * ✅ Verify transporter on startup
 */
(async () => {
  try {
    await transporter.verify();
    console.log("🚀 SMTP Service Ready (Brevo)");
  } catch (err) {
    console.error("❌ SMTP Configuration Error:", err.message);
  }
})();

export default transporter;