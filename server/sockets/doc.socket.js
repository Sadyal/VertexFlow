import Document from "../models/document.model.js";

export const registerDocHandlers = (io, socket) => {

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

    } catch (err) {
      console.error("❌ get-document error:", err.message);
      socket.emit("server-error");
    }
  });

  // REAL-TIME CHANGES (NO DUPLICATE LISTENERS)
  socket.on("send-changes", (delta) => {
    if (!socket.currentDoc) return;

    socket.broadcast
      .to(socket.currentDoc)
      .emit("receive-changes", delta);
  });

  // SAVE DOCUMENT (With Permission Verification)
  socket.on("save-document", async (data) => {
    try {
      if (!socket.currentDoc) return;

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
    } catch (err) {
      console.error("❌ save-document error:", err.message);
    }
  });

  // UPDATE TITLE (REAL-TIME SYNC)
  socket.on("update-title", async (newTitle) => {
    try {
      if (!socket.currentDoc) return;

      // Broadcast to other collaborators
      socket.broadcast
        .to(socket.currentDoc)
        .emit("receive-title-update", newTitle);

      // Persist to DB in background
      await Document.findByIdAndUpdate(
        socket.currentDoc,
        { title: newTitle },
        { returnDocument: 'before' }
      );
    } catch (err) {
      console.error("❌ update-title error:", err.message);
    }
  });
};