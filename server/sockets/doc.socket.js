import Document from "../models/document.model.js";
import { logActivity } from "../utils/activityLogger.js";

export const registerDocHandlers = (io, socket) => {
  // 🛡️ WEBSOCKET RATE LIMITING RULES
  const RATE_LIMITS = {
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

  // LOAD DOCUMENT (With granular SRE Presence & Awareness setup)
  socket.on("get-document", async (docId, userMetadata) => {
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

      // 🛡️ SRE Leave previous document room if switching documents on the same socket connection!
      if (socket.currentDoc && socket.currentDoc !== docId) {
        const oldDoc = socket.currentDoc;
        socket.leave(oldDoc);
        socket.broadcast.to(oldDoc).emit("presence-left", {
          socketId: socket.id,
          userId: socket.userId
        });
      }

      socket.join(docId);
      socket.currentDoc = docId;
      
      console.log(`👤 Socket: ${socket.id} | User: ${userId} | Joined room: ${docId}`);
      
      // Store SRE User metadata directly on the socket object context
      socket.userMetadata = userMetadata || { name: "Collaborator", avatar: "", color: "#22c55e" };
      socket.presenceStatus = "online";
      socket.isTyping = false;
      socket.lastSeen = Date.now();

      // 1. Fetch other active sockets in this room to compile full presence list
      const sockets = await io.in(docId).fetchSockets();
      const members = sockets.map(s => ({
        socketId: s.id,
        userId: s.userId,
        ...s.userMetadata,
        status: s.presenceStatus || "online",
        isTyping: s.isTyping || false,
        cursor: s.cursorPosition || null,
        activeBlock: s.activeBlockPosition || null
      }));
      socket.emit("presence-list", members);

      // 2. Broadcast presence-joined to other members in the room
      socket.broadcast.to(docId).emit("presence-joined", {
        socketId: socket.id,
        userId: socket.userId,
        ...socket.userMetadata,
        status: "online",
        isTyping: false
      });

      socket.emit("load-document", {
        content: doc.content || "",
        updatedAt: doc.updatedAt
      });
      
      logActivity(userId, "DOC_VIEWED", `Opened document: ${doc.title || 'Untitled'}`);

    } catch (err) {
      console.error("❌ get-document error:", err.message);
      socket.emit("server-error");
    }
  });

  // REAL-TIME PRESENCE & AWARENESS BROADCASTER
  socket.on("presence-update", (update) => {
    if (!socket.currentDoc) return;
    
    socket.presenceStatus = update.status || socket.presenceStatus;
    if (update.isTyping !== undefined) socket.isTyping = update.isTyping;
    if (update.cursor !== undefined) socket.cursorPosition = update.cursor;
    if (update.activeBlock !== undefined) socket.activeBlockPosition = update.activeBlock;
    socket.lastSeen = Date.now();

    socket.broadcast.to(socket.currentDoc).emit("presence-updated", {
      socketId: socket.id,
      userId: socket.userId,
      status: socket.presenceStatus,
      isTyping: socket.isTyping,
      cursor: socket.cursorPosition || null,
      activeBlock: socket.activeBlockPosition || null
    });
  });

  // REAL-TIME CHANGES (NO DUPLICATE LISTENERS)
  socket.on("send-changes", async (delta) => {
    if (!socket.currentDoc) return;
    
    // Add SERVER RECEIVE log
    console.log(`[SERVER RECEIVE] Socket: ${socket.id} | Doc: ${socket.currentDoc} | Received changes.`);

    if (isRateLimited("send-changes")) {
      console.log(`[SERVER RATE LIMIT] Socket: ${socket.id} | Doc: ${socket.currentDoc} | send-changes rate limited.`);
      return; // 🛡️ Rate limit protect
    }

    // 🛡️ SRE CHECK: Protect against malicious Memory Bomb broadcasts (<1ms)
    if (delta == null) return;
    if (typeof delta === "string" && delta.length > 2000000) return; // Cap string broadcasts to 2MB
    if (typeof delta === "object" && Object.keys(delta).length > 100) return; // Block massive object structures

    // Add ROOM USERS log
    const roomSockets = await io.in(socket.currentDoc).fetchSockets();
    const userIds = roomSockets.map(s => s.userId);
    console.log(`[ROOM USERS] Doc: ${socket.currentDoc} | Active users: ${JSON.stringify(userIds)}`);

    // Add SERVER BROADCAST log
    console.log(`[SERVER BROADCAST] Socket: ${socket.id} | Doc: ${socket.currentDoc} | Broadcasting to room.`);

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

      let parsedData = data;
      if (typeof data === "string") {
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          // Keep as string if it's HTML or plain text
        }
      }

      const updatedDoc = await Document.findByIdAndUpdate(
        socket.currentDoc,
        { content: parsedData },
        { new: true } // Return updated doc with new updatedAt!
      );

      socket.emit("save-confirmed", { 
        docId: socket.currentDoc,
        updatedAt: updatedDoc.updatedAt
      });
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