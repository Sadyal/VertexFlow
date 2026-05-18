import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "LOGOUT",
        "DOC_CREATED",
        "DOC_EDITED",
        "DOC_RENAMED",
        "DOC_DELETED",
        "DOC_SHARED",
        "DOC_VIEWED",
        "DOC_DOWNLOADED",
        "PROFILE_UPDATED",
        "AVATAR_UPDATED",
      ],
    },
    details: {
      type: String,
      default: "",
    },
    ip: String,
    userAgent: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ⚡ Index for fast retrieval of user activity sorted by time
activitySchema.index({ userId: 1, createdAt: -1 });

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
