import express from "express";
import multer from "multer";
import * as socialController from "./social.controller.js";
import authMiddleware from "../../middleware/auth.middleware.js";
import { postLimiter, commentBurstLimiter, commentLimiter, likeLimiter, uploadLimiter } from "../../middleware/rateLimiter.js";

const router = express.Router();

import path from "path";

/**
 * 📦 MULTER & FILE VALIDATION CONFIG
 */
const allowedExts = [".png", ".jpg", ".jpeg", ".webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext)) {
      return cb(new Error("Invalid file extension. Only PNG, JPG, WEBP allowed."), false);
    }
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Spoofed mimetype detected."), false);
    }
    cb(null, true);
  },
});

// 🛡️ FIX 3: Magic Number Hex Signature Validator
const validateImageSignature = (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();
  
  const file = req.files[0];
  const hex = file.buffer.toString("hex", 0, 4).toUpperCase();
  
  // Real Image Signatures:
  // PNG: 89504E47 | JPEG: FFD8FF.. | WEBP: 52494646 (RIFF)
  const isValidSignature = hex.startsWith("89504E47") || hex.startsWith("FFD8FF") || hex.startsWith("52494646");
  
  if (!isValidSignature) {
    return res.status(400).json({ success: false, message: "Invalid image signature. Executables rejected." });
  }
  next();
};

/**
 * 🚀 ROUTES
 * All routes are protected
 */
router.use(authMiddleware);
router.use(express.json({ limit: "32kb" })); // 📦 Granular 32kb limit for post metadata

// Apply rate limits and strict file validation chain
router.post("/posts", postLimiter, uploadLimiter, (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, validateImageSignature, socialController.createPost);

router.get("/posts", socialController.getPosts);
router.post("/posts/:id/like", likeLimiter, socialController.toggleLike);

// 🛡️ Strict 8kb comment size restriction + burst protection
router.post(
  "/posts/:id/comment",
  express.json({ limit: "8kb" }),
  commentBurstLimiter,
  commentLimiter,
  socialController.addComment
);

router.get("/posts/:id/comments", socialController.getPostComments);

router.delete("/posts/:id", socialController.deletePost);
router.delete("/posts/:id/comments/:commentId", socialController.deleteComment);

export default router;
