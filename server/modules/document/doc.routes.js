import express from "express";
import {
  getAllDocs,
  getDocById,
  createDoc,
  updateDoc,
  shareDoc,
  deleteDoc,
  uploadDocImage,
} from "./doc.controller.js";

import authMiddleware from "../../middleware/auth.middleware.js";
import verifyDocAccessMiddleware from "../../middleware/verifyDocAccess.middleware.js"; // ✅ FIXED
import { uploadLimiter } from "../../middleware/rateLimiter.js";

import multer from "multer";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * 🔐 Global auth (required)
 */
router.use(authMiddleware);
router.use(express.json({ limit: "2mb" }));

/**
 * 📄 DOCUMENT ROUTES
 */
router.get("/", getAllDocs);
router.post("/", createDoc);

router.patch("/:id", updateDoc);
router.delete("/:id", deleteDoc);
router.post("/:id/share", shareDoc);

// 🖼️ Image Upload Endpoint
router.post("/upload-image", uploadLimiter, upload.single("image"), uploadDocImage);

/**
 * 🔐 Access-controlled route
 */
router.get("/:id", verifyDocAccessMiddleware, getDocById); // ✅ FIXED

export default router;