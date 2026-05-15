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
    from: `"VertexFlow" <${process.env.SENDER_EMAIL || process.env.SMTP_USER}>`,
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
 * ✉️ VERIFY EMAIL TEMPLATE (PREMIUM UPGRADE)
 */
export const generateVerifyEmailTemplate = (otp, email) => {
  return `
    <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">VertexFlow</h1>
        </div>
        
        <div style="padding: 40px 32px;">
          <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Verify your email address</h2>
          <p style="color: #64748b; margin: 0 0 32px; font-size: 16px;">Welcome to the next generation of collaboration. Please use the verification code below to complete your registration.</p>
          
          <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; border: 1px dashed #cbd5e1; margin-bottom: 32px;">
            <div style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.2em; color: #4f46e5; margin: 0;">${otp}</div>
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; margin: 0; text-align: center;">This code will expire in 24 hours.</p>
        </div>
        
        <div style="background: #f8fafc; padding: 32px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px;">If you did not request this code, you can safely ignore this email.</p>
          <p style="color: #64748b; font-size: 12px; font-weight: 600; margin: 0;">&copy; 2026 VertexFlow Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
};

/**
 * 🔐 RESET PASSWORD TEMPLATE (PREMIUM UPGRADE)
 */
export const generateResetPasswordTemplate = (otp, email) => {
  return `
    <div style="background-color: #fef2f2; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #fee2e2;">
        <div style="background: #ef4444; padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">VertexFlow</h1>
        </div>
        
        <div style="padding: 40px 32px;">
          <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 20px; font-weight: 600;">Password reset request</h2>
          <p style="color: #64748b; margin: 0 0 32px; font-size: 16px;">We received a request to reset your password. Use the secure code below to proceed. If you didn't make this request, please change your password immediately.</p>
          
          <div style="background: #fff5f5; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #fecaca; margin-bottom: 32px;">
            <div style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.2em; color: #dc2626; margin: 0;">${otp}</div>
          </div>
          
          <p style="color: #94a3b8; font-size: 14px; margin: 0; text-align: center; font-weight: 500;">Secure code expires in 15 minutes.</p>
        </div>
        
        <div style="background: #f8fafc; padding: 32px; border-top: 1px solid #fecaca; text-align: center;">
          <p style="color: #ef4444; font-size: 12px; font-weight: 600; margin: 0 0 8px;">SECURITY ALERT</p>
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Never share this code with anyone. Our support team will never ask for your password or OTP.</p>
        </div>
      </div>
    </div>
  `;
};