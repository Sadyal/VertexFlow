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

  // SAVE DOCUMENT (CONTROLLED)
  socket.on("save-document", async (data) => {
    try {
      if (!socket.currentDoc) return;

      await Document.findByIdAndUpdate(
        socket.currentDoc,
        { content: data },
        { new: false }
      );

    } catch (err) {
      console.error("❌ save-document error:", err.message);
    }
  });
};