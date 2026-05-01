import transporter from "../config/nodemailer.js";

/**
 * 🔒 SIMPLE EMAIL VALIDATION
 */
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * 🔒 VALIDATE EMAIL PAYLOAD (fail fast)
 */
const validateEmailPayload = ({ to, subject, html }) => {
  if (!to || !subject || !html) {
    const err = new Error("Email payload missing required fields");
    err.status = 400;
    throw err;
  }

  if (!isValidEmail(to)) {
    const err = new Error("Invalid recipient email format");
    err.status = 400;
    throw err;
  }
};

/**
 * 🧠 STRIP HTML → TEXT (fallback for deliverability)
 */
const stripHtml = (html) => {
  return html.replace(/<[^>]*>/g, "");
};

/**
 * 📧 SEND EMAIL (GENERIC UTILITY)
 */
export const sendEmail = async ({ to, subject, html }) => {
  validateEmailPayload({ to, subject, html });

  const mailOptions = {
    from: `"LiveSync Support" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text: stripHtml(html), // ✅ improves inbox delivery
  };

  try {
    const info = await transporter.sendMail(mailOptions);

    // ✅ Safe logging (no sensitive data)
    if (process.env.NODE_ENV === "development") {
      console.log("📤 Email sent", {
        to,
        messageId: info.messageId,
      });
    }

    return info;
  } catch (error) {
    console.error("❌ Email send failed:", {
      message: error.message,
      to,
      subject,
    });

    const err = new Error("Email service unavailable");
    err.status = 503; // better than generic 500
    throw err;
  }
};

/**
 * ✉️ VERIFY EMAIL TEMPLATE (IMPROVED UI + ANTI-SPAM)
 */
export const generateVerifyEmailTemplate = (otp, email) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px;">
      <h2 style="color:#333;">Verify Your Email</h2>

      <p>Hello,</p>
      <p>Use the OTP below to verify your account:</p>

      <div style="
        font-size:28px;
        font-weight:bold;
        letter-spacing:6px;
        background:#f4f4f4;
        padding:12px;
        display:inline-block;
        margin:10px 0;
      ">
        ${otp}
      </div>

      <p>This OTP is valid for <b>24 hours</b>.</p>

      <hr style="margin:20px 0;" />

      <p style="font-size:12px; color:#777;">
        If you didn’t request this, you can safely ignore this email.
      </p>
    </div>
  `;
};

/**
 * 🔐 RESET PASSWORD TEMPLATE (IMPROVED)
 */
export const generateResetPasswordTemplate = (otp, email) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px;">
      <h2 style="color:#333;">Reset Your Password</h2>

      <p>Hello,</p>
      <p>Use the OTP below to reset your password:</p>

      <div style="
        font-size:28px;
        font-weight:bold;
        letter-spacing:6px;
        background:#f4f4f4;
        padding:12px;
        display:inline-block;
        margin:10px 0;
      ">
        ${otp}
      </div>

      <p>This OTP is valid for <b>15 minutes</b>.</p>

      <hr style="margin:20px 0;" />

      <p style="font-size:12px; color:#777;">
        If you didn’t request a password reset, please secure your account immediately.
      </p>
    </div>
  `;
};