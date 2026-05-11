import express from "express";
import multer from "multer";
import * as socialController from "./social.controller.js";
import authMiddleware from "../../middleware/auth.middleware.js";

const router = express.Router();

/**
 * 📦 MULTER CONFIG
 * Use Memory Storage for Sharp processing
 */
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit before compression
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"), false);
    }
  },
});

/**
 * 🚀 ROUTES
 * All routes are protected
 */
router.use(authMiddleware);
router.use(express.json()); // 📦 CRITICAL: Parse JSON bodies for comments/likes

router.post("/posts", (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
    next();
  });
}, socialController.createPost);
router.get("/posts", socialController.getPosts);
router.post("/posts/:id/like", socialController.toggleLike);
router.post("/posts/:id/comment", socialController.addComment);
router.delete("/posts/:id", socialController.deletePost);
router.delete("/posts/:id/comments/:commentId", socialController.deleteComment);

export default router;
