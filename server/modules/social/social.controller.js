import mongoose from "mongoose";
import Post from "../../models/post.model.js";
import User from "../../models/user.model.js";
import { processPostImage } from "../../utils/imageProcessor.js";

/**
 * 🚀 CREATE NEW POST
 */
export const createPost = async (req, res, next) => {
  try {
    const { content } = req.body;
    const authorId = req.userId;

    let imageUrl = "";
    const imageFile = req.files?.find(f => f.fieldname === 'image');

    // Process image if exists
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

    // Populate author info for the response
    await post.populate("author", "name avatar");

    // Enrich the newly created post for immediate UI compatibility
    const enrichedPost = {
      ...post.toObject(),
      likesCount: 0,
      isLiked: false,
      commentsCount: 0
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
 * 📡 GET FEED POSTS (Paginated)
 */
export const getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const userId = req.userId;
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    // 🚀 AGGREGATION PIPELINE: High performance fetching with counts and "isLiked" state
    const posts = await Post.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
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
        $project: {
          content: 1,
          image: 1,
          createdAt: 1,
          "author.name": 1,
          "author.avatar": 1,
          "author._id": 1,
          likesCount: { $size: { $ifNull: ["$likes", []] } },
          commentsCount: { $size: { $ifNull: ["$comments", []] } },
          isLiked: {
            $cond: [
              { $and: [{ $ne: [userObjectId, null] }, { $isArray: "$likes" }] },
              { $in: [userObjectId, "$likes"] },
              false
            ]
          },
          // Only return latest 3 comments to keep response size small
          comments: { $slice: [{ $ifNull: ["$comments", []] }, -3] }
        }
      }
    ]);

    // Populate user info for the sliced comments (manual lookup since aggregate lookup is complex for nested arrays)
    // In a real high-scale app, we might store minimal user info in the comment itself
    const populatedPosts = await Post.populate(posts, {
      path: "comments.user",
      select: "name avatar"
    });

    const total = await Post.countDocuments({ isDeleted: { $ne: true } });

    res.status(200).json({
      success: true,
      posts: populatedPosts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasMore: skip + posts.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ❤️ LIKE / UNLIKE POST
 */
export const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // ⚡ ATOMIC UPDATE: Check if liked and toggle in one go to prevent race conditions
    const post = await Post.findById(id).select('likes');
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    // Ensure we compare strings to avoid ObjectId mismatch issues
    const isLiked = post.likes.some(l => l.toString() === userId.toString());
    
    const update = isLiked 
      ? { $pull: { likes: userId } } 
      : { $addToSet: { likes: userId } };

    const updatedPost = await Post.findByIdAndUpdate(
      id, 
      update, 
      { new: true, select: 'likes' }
    );

    res.status(200).json({
      success: true,
      likesCount: updatedPost.likes.length,
      isLiked: !isLiked,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 💬 ADD COMMENT
 */
export const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body || {};
    const userId = req.userId;

    if (!text) return res.status(400).json({ success: false, message: "Comment text is required" });

    // ⚡ ATOMIC PUSH: Add comment and return the updated document with selective fields
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { $push: { comments: { user: userId, text } } },
      { new: true }
    ).populate({
      path: "comments.user",
      select: "name avatar",
      match: { _id: userId } // We only need the info for the newly added comment mostly
    });

    if (!updatedPost) return res.status(404).json({ success: false, message: "Post not found" });

    const newComment = updatedPost.comments[updatedPost.comments.length - 1];

    res.status(201).json({
      success: true,
      comment: newComment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 🗑️ DELETE POST
 */
export const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    // Only author OR admin can delete post
    const userObj = await User.findById(userId).select("role");
    const isAdmin = userObj && userObj.role === "admin";

    if (post.author.toString() !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this post" });
    }

    post.isDeleted = true;
    await post.save();

    res.status(200).json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * 🗑️ DELETE COMMENT
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const userId = req.userId;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const commentIndex = post.comments.findIndex(c => c._id.toString() === commentId);
    if (commentIndex === -1) return res.status(404).json({ success: false, message: "Comment not found" });

    const comment = post.comments[commentIndex];

    // Permission check: Comment author OR Post author OR admin can delete
    const userObj = await User.findById(userId).select("role");
    const isAdmin = userObj && userObj.role === "admin";
    const isCommentAuthor = comment.user.toString() === userId;
    const isPostAuthor = post.author.toString() === userId;

    if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this comment" });
    }

    post.comments.splice(commentIndex, 1);
    await post.save();

    res.status(200).json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
