import mongoose from "mongoose";
import crypto from "crypto";
import Post from "../../models/post.model.js";
import User from "../../models/user.model.js";
import Comment from "../../models/comment.model.js";
import Like from "../../models/like.model.js";
import redis from "../../config/redis.js";
import { processPostImage, processAvatarImage } from "../../utils/imageProcessor.js";

/**
 * 📦 DYNAMIC FEED MIGRATOR & CLEANER (Self-Healing Posts & Comments)
 * Detects legacy Base64 images and dynamically cleans legacy embedded arrays
 * by moving them to the standalone Like and Comment collections in the background.
 */
const migrateLegacyFeedItems = async (posts) => {
  const promises = posts.map(async (post) => {
    // 1. Migrate post cover image
    if (post.image && post.image.startsWith("data:image/")) {
      try {
        console.log(`📦 Feed Migration: Migrating Base64 post image for post ${post._id} to Cloudinary...`);
        const cloudinaryUrl = await processPostImage(post.image);
        post.image = cloudinaryUrl;
        await Post.findByIdAndUpdate(post._id, { $set: { image: cloudinaryUrl } });
      } catch (err) {
        console.error("📦 Feed Migration: Post image upload failed", err.message);
      }
    }

    // 2. Migrate post author avatar
    if (post.author?.avatar && post.author.avatar.startsWith("data:image/")) {
      try {
        console.log(`📦 Feed Migration: Migrating Base64 author avatar for ${post.author._id} to Cloudinary...`);
        const cloudinaryUrl = await processAvatarImage(post.author.avatar);
        post.author.avatar = cloudinaryUrl;
        await User.findByIdAndUpdate(post.author._id, { $set: { avatar: cloudinaryUrl } });
      } catch (err) {
        console.error("📦 Feed Migration: Author avatar upload failed", err.message);
      }
    }

    // 3. Dynamic Database Cleaner: Migrate legacy embedded comments/likes
    try {
      // ⚡ Fix 1: Only query database if the aggregation detected legacy arrays!
      if (post.legacyCommentsCount > 0 || post.legacyLikesCount > 0) {
        const rawPost = await Post.findById(post._id).select("comments likes");
        if (rawPost) {
        // Move comments
        if (rawPost.comments && rawPost.comments.length > 0) {
          console.log(`📦 DB Migration: Separating ${rawPost.comments.length} legacy comments for post ${post._id}...`);
          const commentDocs = rawPost.comments.map(c => ({
            post: post._id,
            user: c.user,
            text: c.text,
            createdAt: c.createdAt || new Date()
          }));
          await Comment.insertMany(commentDocs, { ordered: false }).catch(() => {});
          await Post.findByIdAndUpdate(post._id, { $set: { comments: [] } });
        }

        // Move likes
        if (rawPost.likes && rawPost.likes.length > 0) {
          console.log(`📦 DB Migration: Separating ${rawPost.likes.length} legacy likes for post ${post._id}...`);
          const likeDocs = rawPost.likes.map(userId => ({
            post: post._id,
            user: userId
          }));
          await Like.insertMany(likeDocs, { ordered: false }).catch(() => {});
          await Post.findByIdAndUpdate(post._id, { $set: { likes: [] } });
        }
      }
    } // End of if (post.legacyCommentsCount > 0 || post.legacyLikesCount > 0)
    } catch (migrationErr) {
      console.error("❌ DB Migration: Hybrid cleanup error", migrationErr.message);
    }
  });

  await Promise.all(promises).catch(e => console.error("❌ Feed Migration: Promise.all error", e));
};

/**
 * 🚀 CREATE NEW POST
 */
export const createPost = async (req, res, next) => {
  try {
    const { content } = req.body;
    const authorId = req.userId;

    // Body Validation
    if (content && content.length > 1000) {
      return res.status(400).json({ success: false, message: "Post content cannot exceed 1000 characters." });
    }

    let imageUrl = "";
    const imageFile = req.files?.find(f => f.fieldname === "image");

    if (imageFile) {
      imageUrl = await processPostImage(imageFile.buffer);
    }

    if (!content && !imageUrl) {
      return res.status(400).json({ success: false, message: "Post must have either text or an image" });
    }

    const post = await Post.create({
      author: authorId,
      content: content || "",
      image: imageUrl,
    });

    await post.populate("author", "name avatar");

    const enrichedPost = {
      ...post.toObject(),
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      comments: []
    };

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: enrichedPost,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 📡 GET FEED POSTS (High-Performance Cursor Pagination)
 * Strict 20 posts limit. Uses indexed ObjectID filters to bypass slow skip queries.
 */
export const getPosts = async (req, res, next) => {
  try {
    const limit = 20; // Strictly capped for production stability
    const nextCursor = req.query.nextCursor; // ObjectId representation of pagination cursor
    const userId = req.userId;
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    // ⚡ Build matching criteria (Skip-free cursor matching)
    const matchStage = { isDeleted: { $ne: true } };
    if (nextCursor && mongoose.Types.ObjectId.isValid(nextCursor)) {
      matchStage._id = { $lt: new mongoose.Types.ObjectId(nextCursor) };
    }

    // ⚡ Cursor Aggregation with isolated collections joins
    const posts = await Post.aggregate([
      { $match: matchStage },
      { $sort: { _id: -1 } },
      { $limit: limit + 1 }, // Fetch 1 extra to check if there are more
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author"
        }
      },
      { $unwind: "$author" },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "post",
          as: "postLikes"
        }
      },
      {
        $lookup: {
          from: "comments",
          let: { postId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$post", "$$postId"] } } },
            { $sort: { _id: -1 } },
            { $limit: 3 }, // Limit to latest 3 nested comments
            {
              $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
              }
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 1,
                text: 1,
                createdAt: 1,
                "user._id": 1,
                "user.name": 1,
                "user.avatar": 1
              }
            }
          ],
          as: "comments"
        }
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "allComments"
        }
      },
      {
        $project: {
          content: 1,
          image: 1,
          createdAt: 1,
          "author.name": 1,
          "author.avatar": 1,
          "author._id": 1,
          legacyCommentsCount: { $size: { $ifNull: ["$comments", []] } },
          legacyLikesCount: { $size: { $ifNull: ["$likes", []] } },
          likesCount: { $size: "$postLikes" },
          commentsCount: { $size: "$allComments" },
          isLiked: {
            $cond: [
              { $and: [{ $ne: [userObjectId, null] }] },
              { $in: [userObjectId, "$postLikes.user"] },
              false
            ]
          },
          comments: 1
        }
      }
    ]);

    const hasMore = posts.length > limit;
    const paginatedPosts = hasMore ? posts.slice(0, limit) : posts;
    const nextCursorId = hasMore ? paginatedPosts[paginatedPosts.length - 1]._id : null;

    // Self-healing Base64 migrations & embedded cache purges (Runs in background)
    migrateLegacyFeedItems(paginatedPosts);

    res.status(200).json({
      success: true,
      posts: paginatedPosts,
      nextCursor: nextCursorId,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ❤️ TOGGLE LIKE (Atomic, Idempotent & Velocity Controlled)
 */
export const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // ⚡ Redis Click Storm Shield: 30 Likes per minute
    if (redis) {
      const rateLimitKey = `like:rate:${userId}`;
      const currentActions = await redis.incr(rateLimitKey);
      if (currentActions === 1) {
        await redis.expire(rateLimitKey, 60);
      }
      if (currentActions > 30) {
        return res.status(429).json({ success: false, message: "Velocity exceeded. Please slow down your clicks." });
      }
    }

    // ⚡ Atomic Toggle in Separate Collection
    const existingLike = await Like.findOneAndDelete({ post: id, user: userId });
    let isLiked = false;

    if (!existingLike) {
      try {
        await Like.create({ post: id, user: userId });
        isLiked = true;
      } catch (err) {
        if (err.code === 11000) {
          isLiked = false; // Gracefully capture race conditions
        } else {
          throw err;
        }
      }
    }

    // Mirror to Post document to support legacy endpoints
    const postUpdate = isLiked 
      ? { $addToSet: { likes: userId } } 
      : { $pull: { likes: userId } };
    await Post.findByIdAndUpdate(id, postUpdate);

    // Get final count from isolated table
    const likesCount = await Like.countDocuments({ post: id });

    res.status(200).json({
      success: true,
      likesCount,
      isLiked,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 💬 ADD COMMENT (Double-Spam Shielded & Isolated)
 */
export const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body || {};
    const userId = req.userId;

    // String Sanitization
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Comment text is required." });
    }
    if (text.trim().length > 500) {
      return res.status(400).json({ success: false, message: "Comment cannot exceed 500 characters." });
    }

    // ⚡ Redis Duplicate Cache: Stop identical comments within 60s
    const textHash = crypto.createHash("md5").update(text.trim()).digest("hex");
    const duplicateKey = `comment:dup:${userId}:${textHash}`;
    
    if (redis) {
      const isDuplicate = await redis.get(duplicateKey);
      if (isDuplicate) {
        return res.status(400).json({ success: false, message: "Duplicate comment detected. You already posted this!" });
      }
      await redis.set(duplicateKey, "1", "EX", 60);
    }

    // ⚡ Save Comment to Isolated Collection
    const comment = await Comment.create({
      post: id,
      user: userId,
      text: text.trim()
    });

    // Mirror to Post embedded array ONLY if post comments are < 100 (BSON limit protection)
    const post = await Post.findById(id).select("comments");
    if (post && post.comments.length < 100) {
      await Post.findByIdAndUpdate(id, {
        $push: { comments: { _id: comment._id, user: userId, text: text.trim(), createdAt: comment.createdAt } }
      });
    }

    // Populate user profile info to match exact frontend response contracts
    const user = await User.findById(userId).select("name avatar").lean();

    const populatedComment = {
      _id: comment._id,
      post: comment.post,
      text: comment.text,
      createdAt: comment.createdAt,
      user: {
        _id: userId,
        name: user?.name || "User",
        avatar: user?.avatar || ""
      }
    };

    res.status(201).json({
      success: true,
      comment: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 💬 GET COMMENTS CURSOR-PAGINATED (Phase 2 & 7 Defenses)
 * Directly loads comments from the isolated Comment collection.
 */
export const getPostComments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nextCursor } = req.query;
    const limit = 15; // Production projection ceiling

    const query = { post: id };
    if (nextCursor && mongoose.Types.ObjectId.isValid(nextCursor)) {
      query._id = { $lt: new mongoose.Types.ObjectId(nextCursor) };
    }

    const comments = await Comment.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate("user", "name avatar")
      .lean();

    const hasMore = comments.length > limit;
    const paginatedComments = hasMore ? comments.slice(0, limit) : comments;
    const nextCursorId = hasMore ? paginatedComments[paginatedComments.length - 1]._id : null;

    res.status(200).json({
      success: true,
      comments: paginatedComments,
      nextCursor: nextCursorId,
      hasMore,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 🗑️ DELETE POST (Soft Delete)
 */
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const userObj = await User.findById(userId).select("role");
    const isAdmin = userObj && userObj.role === "admin";

    if (post.author.toString() !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this post" });
    }

    post.isDeleted = true;
    await post.save();

    // Clean up isolated comments/likes asynchronously
    Comment.deleteMany({ post: id }).catch(e => console.error("❌ Comment delete clean failed", e.message));
    Like.deleteMany({ post: id }).catch(e => console.error("❌ Like delete clean failed", e.message));

    res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * 🗑️ DELETE COMMENT (Isolated Cleanup)
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

    // Permission check
    const userObj = await User.findById(userId).select("role");
    const isAdmin = userObj && userObj.role === "admin";
    const isCommentAuthor = comment.user.toString() === userId;
    const isPostAuthor = post.author.toString() === userId;

    if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this comment" });
    }

    // Delete standalone record
    await Comment.findByIdAndDelete(commentId);

    // Pull from mirror embedded array for complete backward compatibility
    await Post.findByIdAndUpdate(id, {
      $pull: { comments: { _id: new mongoose.Types.ObjectId(commentId) } }
    });

    res.status(200).json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
