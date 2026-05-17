import User from "../../models/user.model.js";
import Document from "../../models/document.model.js";
import Analytics from "../../models/analytics.model.js";
import Settings from "../../models/settings.model.js";
import Post from "../../models/post.model.js";

/**
 * @desc    Get dashboard overview statistics
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    // 🚀 PERFORMANCE OPTIMIZATION: Run all counts and queries in parallel
    const [totalUsers, verifiedUsers, recentUsers, totalDocs, docStats, analyticsData, totalPosts, socialStats] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isAccountVerified: true }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      Document.countDocuments(),
      Document.aggregate([
        {
          $group: {
            _id: null,
            totalCollabs: { $sum: { $size: "$collaborators" } }
          }
        }
      ]),
      Analytics.find().sort({ date: -1 }).limit(7).lean(),
      Post.countDocuments({ isDeleted: { $ne: true } }),
      Post.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        {
          $group: {
            _id: null,
            totalLikes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
            totalComments: { $sum: { $size: { $ifNull: ["$comments", []] } } }
          }
        }
      ])
    ]);

    const totalCollaborations = docStats.length > 0 ? docStats[0].totalCollabs : 0;
    const totalLikes = socialStats.length > 0 ? socialStats[0].totalLikes : 0;
    const totalComments = socialStats.length > 0 ? socialStats[0].totalComments : 0;

    // Create a map of existing data
    const analyticsMap = new Map(analyticsData.map(item => [item.date, item]));
    
    // Generate full 7-day range
    const lastSevenDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const existing = analyticsMap.get(dateStr);
      lastSevenDays.push(existing || {
        date: dateStr,
        apiCalls: 0,
        visits: 0,
        featureUsage: {}
      });
    }

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          recent: recentUsers
        },
        documents: {
          total: totalDocs,
          totalCollaborations
        },
        social: {
          totalPosts,
          totalLikes,
          totalComments
        },
        analytics: lastSevenDays
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed users list (with pagination)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getUsersList = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Search by name or email
    const search = req.query.search || "";
    const query = search ? {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ]
    } : {};

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password -verifyOtp -resetOtp -refreshToken")
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .lean();

    // 🚀 PERFORMANCE OPTIMIZATION: Avoid N+1 queries. 
    // Fetch all document counts in a single aggregation for the returned users.
    const userIds = users.map(u => u._id);
    const docCounts = await Document.aggregate([
      { $match: { owner: { $in: userIds } } },
      { $group: { _id: "$owner", count: { $sum: 1 } } }
    ]);

    const docCountMap = new Map(docCounts.map(item => [item._id.toString(), item.count]));

    const enrichedUsers = users.map(user => ({
      ...user,
      totalDocuments: docCountMap.get(user._id.toString()) || 0
    }));

    res.status(200).json({
      success: true,
      data: enrichedUsers,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Track a frontend page visit or specific feature usage
 * @route   POST /api/admin/track
 * @access  Public (Tracked anonymously)
 */
export const trackEvent = async (req, res, next) => {
  try {
    const { type, feature } = req.body;
    const today = new Date().toISOString().split("T")[0];

    const updateQuery = {};
    if (type === "visit") {
      updateQuery.$inc = { visits: 1 };
    } else if (type === "feature" && feature) {
      updateQuery.$inc = { [`featureUsage.${feature}`]: 1 };
    }

    if (Object.keys(updateQuery).length > 0) {
      await Analytics.findOneAndUpdate(
        { date: today },
        updateQuery,
        { upsert: true, returnDocument: 'before' }
      );
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Get detailed documents list (with pagination)
 * @route   GET /api/admin/documents
 * @access  Private/Admin
 */
export const getDocsList = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const search = req.query.search || "";
    const query = search ? {
      title: { $regex: search, $options: "i" }
    } : {};

    const total = await Document.countDocuments(query);
    const documents = await Document.find(query)
      .populate('owner', 'name email avatar')
      .sort({ updatedAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: documents,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Global Platform Settings
 * @route   GET /api/admin/settings
 */
export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Global Platform Settings
 * @route   PUT /api/admin/settings
 */
export const updateSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: req.body },
      { returnDocument: 'after', upsert: true }
    );
    res.status(200).json({ success: true, data: settings, message: "Settings saved successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Run Database Maintenance Tasks
 * @route   POST /api/admin/maintenance
 */
export const runMaintenance = async (req, res, next) => {
  try {
    const { action } = req.body;
    
    if (action === "clear_sessions") {
      // Invalidate all refresh tokens for inactive users
      // Simple implementation: clear refresh tokens for users who haven't logged in recently
      const result = await User.updateMany(
        { updatedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, 
        { $set: { refreshToken: "" } }
      );
      return res.status(200).json({ success: true, message: `Cleared ${result.modifiedCount} inactive sessions.` });
    }
    
    if (action === "purge_docs") {
      // Delete documents that have no content (placeholder logic for orphaned docs)
      const result = await Document.deleteMany({ title: "Untitled Document", collaborators: { $size: 0 } });
      return res.status(200).json({ success: true, message: `Purged ${result.deletedCount} empty/orphaned documents.` });
    }

    res.status(400).json({ success: false, message: "Unknown maintenance action" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update document properties (Visibility)
 * @route   PUT /api/admin/documents/:id
 */
export const updateDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;

    const doc = await Document.findByIdAndUpdate(id, { isPublic }, { returnDocument: 'after' }).populate('owner', 'name email avatar');
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    res.status(200).json({ success: true, data: doc, message: "Document updated successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete specific document
 * @route   DELETE /api/admin/documents/:id
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const doc = await Document.findByIdAndDelete(id);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    res.status(200).json({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update specific user (Role toggle)
 * @route   PUT /api/admin/users/:id
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(id, { role }, { returnDocument: 'after' });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, data: user, message: "User updated successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account and all associated documents
 * @route   DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Delete user's documents
    await Document.deleteMany({ owner: id });

    // 2. Remove user from all collaboration lists (Deep Cleanup)
    await Document.updateMany(
      { collaborators: id },
      { $pull: { collaborators: id } }
    );
    
    // 3. Delete user
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User and their documents deleted successfully" });
  } catch (error) {
    next(error);
  }
};
