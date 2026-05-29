import User from "../../models/user.model.js";
import Document from "../../models/document.model.js";
import Analytics from "../../models/analytics.model.js";
import Settings from "../../models/settings.model.js";
import Post from "../../models/post.model.js";
import Comment from "../../models/comment.model.js";
import Like from "../../models/like.model.js";

/**
 * @desc    Get dashboard overview statistics
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    // 🚀 PERFORMANCE OPTIMIZATION: Run all counts and queries in parallel
    const [totalUsers, verifiedUsers, recentUsers, totalDocs, docStats, analyticsData, totalPosts, totalLikes, totalComments] = await Promise.all([
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
      Like.countDocuments(),
      Comment.countDocuments()
    ]);

    const totalCollaborations = docStats.length > 0 ? docStats[0].totalCollabs : 0;

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

    // Search by name or email, and filter by role
    const search = req.query.search || "";
    const role = req.query.role || "all";

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    if (role !== "all") {
      query.role = role;
    }

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
    const { registrationMode, requireEmailVerification, defaultAiModel, maxTokensPerRequest, maintenanceMode, platformName } = req.body;

    const updateData = {};
    if (registrationMode !== undefined) updateData.registrationMode = registrationMode;
    if (requireEmailVerification !== undefined) updateData.requireEmailVerification = requireEmailVerification;
    if (defaultAiModel !== undefined) updateData.defaultAiModel = defaultAiModel;
    if (maxTokensPerRequest !== undefined) updateData.maxTokensPerRequest = maxTokensPerRequest;
    if (maintenanceMode !== undefined) updateData.maintenanceMode = maintenanceMode;
    if (platformName !== undefined) updateData.platformName = platformName;

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: updateData },
      { returnDocument: 'after', upsert: true, runValidators: true }
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
      // Delete documents that have no content and were created more than 24 hours ago (preventing active document deletion)
      const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await Document.deleteMany({ 
        title: "Untitled Document", 
        collaborators: { $size: 0 },
        createdAt: { $lt: threshold }
      });
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

    if (id === req.userId) {
      return res.status(400).json({ success: false, message: "You cannot change your own role to prevent administrative lockout." });
    }

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

    if (id === req.userId) {
      return res.status(400).json({ success: false, message: "You cannot delete your own admin account." });
    }

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

/**
 * @desc    Get detailed posts list for moderation
 * @route   GET /api/admin/posts
 * @access  Private/Admin
 */
export const getPostsList = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const search = req.query.search || "";

    let query = { isDeleted: { $ne: true } };

    if (search) {
      // Find users matching search to search by author, or search by post content
      const matchingUsers = await User.find({
        name: { $regex: search, $options: "i" }
      }).select("_id");
      
      const userIds = matchingUsers.map(u => u._id);

      query = {
        isDeleted: { $ne: true },
        $or: [
          { content: { $regex: search, $options: "i" } },
          { author: { $in: userIds } }
        ]
      };
    }

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .lean();

    const postIds = posts.map(p => p._id);

    const [likeCounts, comments] = await Promise.all([
      Like.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } }
      ]),
      Comment.find({ post: { $in: postIds } })
        .populate('user', 'name avatar')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const likeCountMap = new Map(likeCounts.map(lc => [lc._id.toString(), lc.count]));
    const commentsMap = new Map();
    comments.forEach(comment => {
      const postIdStr = comment.post.toString();
      if (!commentsMap.has(postIdStr)) {
        commentsMap.set(postIdStr, []);
      }
      commentsMap.get(postIdStr).push(comment);
    });

    // Map likesCount and commentsCount to fit the expected structure
    const enrichedPosts = posts.map(post => {
      const postIdStr = post._id.toString();
      const postComments = commentsMap.get(postIdStr) || [];
      return {
        ...post,
        likesCount: likeCountMap.get(postIdStr) || 0,
        commentsCount: postComments.length,
        comments: postComments
      };
    });

    res.status(200).json({
      success: true,
      data: enrichedPosts,
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
 * @desc    Delete (soft-delete) post
 * @route   DELETE /api/admin/posts/:id
 * @access  Private/Admin
 */
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    post.isDeleted = true;
    await post.save();

    // Clean up isolated comments/likes asynchronously
    Comment.deleteMany({ post: id }).catch(e => console.error("❌ Comment delete clean failed", e.message));
    Like.deleteMany({ post: id }).catch(e => console.error("❌ Like delete clean failed", e.message));

    res.status(200).json({ success: true, message: "Post moderated and deleted successfully" });
  } catch (error) {
    next(error);
  }
};

