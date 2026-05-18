import Document from "../models/document.model.js";
import { logActivity } from "../utils/activityLogger.js";

export const registerDocHandlers = (io, socket) => {
  // 🛡️ WEBSOCKET RATE LIMITING RULES
  const RATE_LIMITS = {
    "send-changes": { limitMs: 50 },     // Max 20 changes broadcasted per second per user (50ms cooldown)
    "save-document": { limitMs: 1500 },  // Max 1 DB update save request per 1.5 seconds per user
    "update-title": { limitMs: 1000 }    // Max 1 title update per second per user
  };

  socket.messageRates = socket.messageRates || {};

  const isRateLimited = (eventName) => {
    const rule = RATE_LIMITS[eventName];
    if (!rule) return false;

    const now = Date.now();
    const lastTime = socket.messageRates[eventName] || 0;
    
    if (now - lastTime < rule.limitMs) {
      return true; // Exceeded limit! Block event execution.
    }
    
    socket.messageRates[eventName] = now;
    return false;
  };

  // LOAD DOCUMENT
  socket.on("get-document", async (docId) => {
    try {
      if (!docId) return;

      const doc = await Document.findById(docId);

      if (!doc) {
        return socket.emit("access-denied");
      }

      const userId = socket.userId;

      const isOwner = doc.owner.toString() === userId;
      const isCollaborator = doc.collaborators
        .map((id) => id.toString())
        .includes(userId);

      if (!isOwner && !isCollaborator) {
        return socket.emit("access-denied");
      }

      socket.join(docId);
      socket.currentDoc = docId;

      socket.emit("load-document", doc.content || "");
      
      logActivity(userId, "DOC_VIEWED", `Opened document: ${doc.title || 'Untitled'}`);

    } catch (err) {
      console.error("❌ get-document error:", err.message);
      socket.emit("server-error");
    }
  });

  // REAL-TIME CHANGES (NO DUPLICATE LISTENERS)
  socket.on("send-changes", (delta) => {
    if (!socket.currentDoc) return;
    if (isRateLimited("send-changes")) return; // 🛡️ Rate limit protect

    // 🛡️ SRE CHECK: Protect against malicious Memory Bomb broadcasts (<1ms)
    if (delta == null) return;
    if (typeof delta === "string" && delta.length > 2000000) return; // Cap string broadcasts to 2MB
    if (typeof delta === "object" && Object.keys(delta).length > 100) return; // Block massive object structures

    socket.broadcast
      .to(socket.currentDoc)
      .emit("receive-changes", delta);
  });

  // SAVE DOCUMENT (With Permission Verification)
  socket.on("save-document", async (data) => {
    try {
      if (!socket.currentDoc) return;
      if (isRateLimited("save-document")) return; // 🛡️ Rate limit protect

      // 🛡️ FIX 1: O(1) PAYLOAD VALIDATION (<1ms execution)
      if (data == null) return socket.emit("save-error", "Empty payload rejected.");
      if (typeof data !== "string" && typeof data !== "object") {
        return socket.emit("save-error", "Invalid payload type.");
      }
      if (typeof data === "string" && data.length > 2000000) {
        console.warn(`⚠️ [SRE] Blocked >2MB socket payload from user ${socket.userId}`);
        return socket.emit("save-error", "Document exceeds maximum size (2MB).");
      }
      if (typeof data === "object" && Object.keys(data).length === 0) {
        return socket.emit("save-error", "Empty objects rejected.");
      }

      // 🛡️ RE-VERIFY PERMISSIONS
      const doc = await Document.findById(socket.currentDoc).select('owner collaborators');
      if (!doc) return;

      const userId = socket.userId;
      const isOwner = doc.owner.toString() === userId;
      const isCollaborator = doc.collaborators.some(id => id.toString() === userId);

      if (!isOwner && !isCollaborator) {
        return socket.emit("access-denied");
      }

      await Document.findByIdAndUpdate(
        socket.currentDoc,
        { content: data },
        { returnDocument: 'before' }
      );

      logActivity(userId, "DOC_EDITED", `Edited document: ${doc.title || 'Untitled'}`);
    } catch (err) {
      console.error("❌ save-document error:", err.message);
    }
  });

  // UPDATE TITLE (REAL-TIME SYNC)
  socket.on("update-title", async (newTitle) => {
    try {
      if (!socket.currentDoc) return;
      if (isRateLimited("update-title")) return; // 🛡️ Rate limit protect

      // 🛡️ FIX 2: TITLE SPAM & INVISIBLE CHAR PROTECTION (<1ms)
      if (!newTitle || typeof newTitle !== "string") {
        return socket.emit("title-error", "Invalid title type.");
      }
      
      // Strip invisible zero-width characters and trim
      const cleanTitle = newTitle.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      
      if (cleanTitle.length < 1 || cleanTitle.length > 50) {
        return socket.emit("title-error", "Title must be between 1 and 50 characters.");
      }
      
      // Reject spam patterns (e.g., repeating the same character 10+ times)
      if (/(.)\1{10,}/.test(cleanTitle)) {
        return socket.emit("title-error", "Repeated character spam rejected.");
      }

      // Broadcast to other collaborators using the cleaned title
      socket.broadcast
        .to(socket.currentDoc)
        .emit("receive-title-update", cleanTitle);

      // Persist to DB in background
      await Document.findByIdAndUpdate(
        socket.currentDoc,
        { title: cleanTitle },
        { returnDocument: 'before' }
      );

      logActivity(socket.userId, "DOC_RENAMED", `Renamed document to: ${newTitle}`);
    } catch (err) {
      console.error("❌ update-title error:", err.message);
    }
  });
};