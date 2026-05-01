import mongoose from "mongoose";

/**
 * USER SCHEMA
 * Handles authentication, security, and account lifecycle
 */
const userSchema = new mongoose.Schema(
  {
    // 🔹 BASIC INFO
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
      index: true, // ✅ Explicit index for performance
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    // 🔹 AUTHORIZATION
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // 🔐 ACCOUNT VERIFICATION
    isAccountVerified: {
      type: Boolean,
      default: false,
    },

    verifyOtp: {
      type: String,
      default: "",
      select: false,
    },

    verifyOtpExpireAt: {
      type: Number,
      default: 0,
      select: false,
    },

    // 🔐 PASSWORD RESET
    resetOtp: {
      type: String,
      default: "",
      select: false,
    },

    resetOtpExpireAt: {
      type: Number,
      default: 0,
      select: false,
    },

    // 🔐 SESSION MANAGEMENT
    refreshToken: {
      type: String,
      default: "",
      select: false,
    },

    // 🧾 OPTIONAL PROFILE
    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * 🔐 SANITIZE OUTPUT (CRITICAL SECURITY LAYER)
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;
  delete obj.verifyOtp;
  delete obj.verifyOtpExpireAt;
  delete obj.resetOtp;
  delete obj.resetOtpExpireAt;
  delete obj.refreshToken;

  return obj;
};

/**
 * ⚡ SAFE TRANSFORM FOR LEAN QUERIES (OPTIONAL BUT PRO)
 */
userSchema.set("toObject", {
  transform: function (_, ret) {
    delete ret.password;
    delete ret.verifyOtp;
    delete ret.verifyOtpExpireAt;
    delete ret.resetOtp;
    delete ret.resetOtpExpireAt;
    delete ret.refreshToken;
    return ret;
  },
});

/**
 * ⚠️ PREVENT DUPLICATE EMAIL RACE CONDITION (EDGE CASE)
 */
userSchema.post("save", function (error, doc, next) {
  if (error.code === 11000) {
    next(new Error("Email already exists"));
  } else {
    next(error);
  }
});

const User = mongoose.model("User", userSchema);

export default User;