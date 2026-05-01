import express from "express";
import {
  getAllDocs,
  getDocById,
  createDoc,
  renameDoc,
  shareDoc,
  deleteDoc,
} from "./doc.controller.js";

import authMiddleware from "../../middleware/auth.middleware.js";
import verifyDocAccessMiddleware from "../../middleware/verifyDocAccess.middleware.js"; // ✅ FIXED

const router = express.Router();

/**
 * 🔐 Global auth (required)
 */
router.use(authMiddleware);

/**
 * 📄 DOCUMENT ROUTES
 */
router.get("/", getAllDocs);
router.post("/", createDoc);

router.patch("/:id", renameDoc);
router.delete("/:id", deleteDoc);
router.post("/:id/share", shareDoc);

/**
 * 🔐 Access-controlled route
 */
router.get("/:id", verifyDocAccessMiddleware, getDocById); // ✅ FIXED

export default router;