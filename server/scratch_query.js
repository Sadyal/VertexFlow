import mongoose from "mongoose";
import "dotenv/config";
import Document from "./models/document.model.js";

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "livesync" });
    console.log("Connected to MongoDB livesync database!");
    
    const docId = "02d49739-35ba-417e-8f6a-2286caba33d2";
    const doc = await Document.findById(docId);
    
    if (!doc) {
      console.log(`Document ${docId} not found!`);
      const docs = await Document.find({}).limit(10);
      console.log(`Found ${docs.length} documents:`);
      for (const doc of docs) {
        console.log(`ID: ${doc._id} | Title: ${doc.title} | Owner: ${doc.owner}`);
      }
    } else {
      console.log("Document details:");
      console.log("ID:", doc._id);
      console.log("Title:", doc.title);
      console.log("Owner:", doc.owner);
      console.log("Collaborators:", doc.collaborators);
      console.log("Content type:", typeof doc.content);
      console.log("Content preview:", JSON.stringify(doc.content).substring(0, 500));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

run();
