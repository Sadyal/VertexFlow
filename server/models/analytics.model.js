import mongoose from "mongoose";

/**
 * 📈 ANALYTICS SCHEMA
 * Time-series aggregated model to prevent database bloat.
 * Instead of millions of rows, we store 1 row per day.
 */
const analyticsSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      unique: true,
      index: true,
    },
    visits: {
      type: Number,
      default: 0,
    },
    apiCalls: {
      type: Number,
      default: 0,
    },
    featureUsage: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("Analytics", analyticsSchema);
