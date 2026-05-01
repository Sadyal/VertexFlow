import Document from "../../models/document.model.js";
import userModel from "../../models/user.model.js";
import { v4 as uuidv4 } from "uuid";
import { createError } from "../../utils/error.js";

/**
 * 📄 Get all docs (optimized)
 */
export const getAllDocsService = async (userId) => {
  return Document.find({
    $or: [{ owner: userId }, { collaborators: userId }],
  })
    .select("_id title owner collaborators updatedAt")
    .sort({ updatedAt: -1 })
    .lean(); // ✅ performance
};

/**
 * 📄 Get doc by ID
 */
export const getDocByIdService = async (docId) => {
  const doc = await Document.findById(docId).lean(); // ✅ lean
  if (!doc) throw createError("Document not found", 404);
  return doc;
};

/**
 * 🆕 Create doc (FIXED TITLE)
 */
export const createDocService = async (userId, content) => {
  if (!userId) throw createError("Unauthorized", 401);

  const doc = await Document.create({
    _id: uuidv4(),
    owner: userId,
    title: "Untitled Document", // ✅ FIXED
    content: content || { ops: [] },
  });

  return doc;
};

/**
 * ✏️ Rename doc (validated)
 */
export const renameDocService = async (docId, userId, title) => {
  const doc = await Document.findById(docId);
  if (!doc) throw createError("Document not found", 404);

  const allowed =
    doc.owner.toString() === userId ||
    doc.collaborators.some((c) => c.toString() === userId);

  if (!allowed) throw createError("Access denied", 403);

  const trimmed = title?.trim();

  if (!trimmed) {
    throw createError("Title cannot be empty", 400); // ✅ FIX
  }

  doc.title = trimmed;
  await doc.save();

  return doc;
};

/**
 * 🤝 Share doc (safe + normalized)
 */
export const shareDocService = async (docId, userId, email) => {
  const doc = await Document.findById(docId);
  if (!doc) throw createError("Document not found", 404);

  if (doc.owner.toString() !== userId) {
    throw createError("Only owner can share", 403);
  }

  const normalizedEmail = email?.trim().toLowerCase(); // ✅ FIX

  if (!normalizedEmail) {
    throw createError("Email required", 400);
  }

  const user = await userModel.findOne({ email: normalizedEmail });
  if (!user) throw createError("User not found", 404);

  const already = doc.collaborators.some(
    (c) => c.toString() === user._id.toString()
  );

  if (already) throw createError("Already collaborator", 400);

  doc.collaborators.push(user._id);
  await doc.save();

  return true;
};

/**
 * 🗑 Delete doc
 */
export const deleteDocService = async (docId, userId) => {
  const doc = await Document.findById(docId);
  if (!doc) throw createError("Document not found", 404);

  if (doc.owner.toString() !== userId) {
    throw createError("Not authorized", 403);
  }

  await doc.deleteOne();
  return true;
};