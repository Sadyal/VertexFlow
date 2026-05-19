import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import { 
  handleSummarize, 
  handleImprove, 
  handleGenerateIdeas, 
  handleChat 
} from "./ai.controller.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Specific rate limiting for AI to prevent abuse (User-bound)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each user to 50 requests per window
  keyGenerator: (req) => {
    // Rate limit strictly by their authenticated database User ID!
    // Fall back to IP address only if the user session is missing.
    return req.user?.id || req.user?._id || req.ip;
  },
  message: { success: false, message: "Too many AI requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// All AI routes require authentication and have strict rate limits
router.use(authMiddleware, aiLimiter);

router.post("/summarize", express.json({ limit: "1mb" }), handleSummarize);
router.post("/improve", express.json({ limit: "1mb" }), handleImprove);
router.post("/ideas", express.json({ limit: "100kb" }), handleGenerateIdeas);
router.post("/chat", express.json({ limit: "2mb" }), handleChat);

export default router;
