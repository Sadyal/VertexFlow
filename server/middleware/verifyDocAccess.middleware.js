import Document from "../models/document.model.js";

/**
 * 🔐 DOCUMENT ACCESS MIDDLEWARE
 * Ensures user is:
 * - Owner OR
 * - Collaborator
 */
const verifyDocAccessMiddleware = async (req, res, next) => {
  try {
    const userId = req.userId;
    const docId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const doc = await Document.findById(docId);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    const isOwner = doc.owner.toString() === userId;
    const isCollaborator = doc.collaborators.some(
      (c) => c.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // attach for controller
    req.doc = doc;

    next();
  } catch (err) {
    next(err);
  }
};

export default verifyDocAccessMiddleware;