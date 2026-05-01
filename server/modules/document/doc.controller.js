import {
  getAllDocsService,
  getDocByIdService,
  createDocService,
  renameDocService,
  shareDocService,
  deleteDocService,
} from "./doc.service.js";

/**
 * 📄 GET ALL
 */
export const getAllDocs = async (req, res, next) => {
  try {
    const docs = await getAllDocsService(req.userId);

    return res.status(200).json({
      success: true,
      data: docs, // ✅ keep flat
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * 📄 GET ONE
 */
export const getDocById = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: req.doc, // ✅ already validated via middleware
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * 🆕 CREATE
 */
export const createDoc = async (req, res, next) => {
  try {
    const doc = await createDocService(req.userId, req.body?.content);

    return res.status(201).json({
      success: true,
      data: { id: doc._id },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * ✏️ RENAME
 */
export const renameDoc = async (req, res, next) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title required",
      });
    }

    const doc = await renameDocService(
      req.params.id,
      req.userId,
      title.trim()
    );

    return res.status(200).json({
      success: true,
      data: {
        id: doc._id,
        title: doc.title,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * 🤝 SHARE
 */
export const shareDoc = async (req, res, next) => {
  try {
    if (!req.body.email) {
      return res.status(400).json({
        success: false,
        message: "Email required",
      });
    }

    await shareDocService(
      req.params.id,
      req.userId,
      req.body.email
    );

    return res.status(200).json({
      success: true,
      message: "Document shared",
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * 🗑 DELETE
 */
export const deleteDoc = async (req, res, next) => {
  try {
    await deleteDocService(req.params.id, req.userId);

    return res.status(200).json({
      success: true,
      message: "Deleted",
    });
  } catch (err) {
    return next(err);
  }
};