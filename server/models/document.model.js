import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    /**
     * 🔑 UUID as primary key
     */
    _id: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * 📌 Title
     */
    title: {
      type: String,
      default: "Untitled Document",
      trim: true,
      maxlength: 100,
    },

    /**
     * 👤 Owner
     */
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * 📝 Content (Quill Delta)
     */
    content: {
      type: Object,
      default: { ops: [] },
    },

    /**
     * 🤝 Collaborators
     */
    collaborators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * ⚡ INDEXES (single source of truth)
 */
documentSchema.index({ owner: 1 });
documentSchema.index({ collaborators: 1 });
documentSchema.index({ updatedAt: -1 });

/**
 * 🔒 DATA INTEGRITY
 * - Remove duplicate collaborators
 * - Prevent owner duplication
 */
documentSchema.pre("save", async function () {
  if (this.collaborators?.length) {
    const unique = new Set(
      this.collaborators.map((id) => id.toString())
    );

    // remove owner if accidentally added
    unique.delete(this.owner.toString());

    this.collaborators = [...unique];
  }
});

/**
 * 📦 OPTIONAL: Lean JSON output cleanup
 */
documentSchema.set("toJSON", {
  transform: (doc, ret) => {
    return ret;
  },
});

export default mongoose.model("Document", documentSchema);