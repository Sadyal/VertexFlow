import mongoose from "mongoose";

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "livesync", // optional but recommended
      maxPoolSize: 100,  // pre-allocate pool up to 100 connections
      minPoolSize: 10,   // keep 10 connections warm to avoid handshake delays
      socketTimeoutMS: 45000, // close idle sockets after 45s
      serverSelectionTimeoutMS: 5000, // timeout fast if DB goes down
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