import mongoose from "mongoose";

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "livesync", // optional but recommended
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);

    // Exit process if DB fails (production-safe behavior)
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log("💤 MongoDB connection closed");
  } catch (error) {
    console.error("❌ Error during MongoDB disconnect:", error.message);
  }
};

export default connectDB;