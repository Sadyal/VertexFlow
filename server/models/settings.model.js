import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    // SECURITY
    registrationMode: {
      type: String,
      enum: ["open", "invite", "closed"],
      default: "open"
    },
    requireEmailVerification: {
      type: Boolean,
      default: true
    },
    
    // AI INTEGRATION
    defaultAiModel: {
      type: String,
      default: "llama-3.3-70b-versatile"
    },
    maxTokensPerRequest: {
      type: Number,
      default: 2048
    },

    // PLATFORM
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    platformName: {
      type: String,
      default: "VertexFlow"
    }
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
