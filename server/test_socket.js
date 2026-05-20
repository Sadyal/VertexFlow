import { io } from "socket.io-client";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const SOCKET_URL = "http://localhost:4000";
const JWT_SECRET = process.env.JWT_SECRET;
const DOC_ID = "02d49739-35ba-417e-8f6a-2286caba33d2";

// Mock User IDs
const OWNER_ID = "69f3085fb8495dffc98f7663";      // nikhilsadyal00@gmail.com
const COLLAB_ID = "69f0cd21e92110c72214a6c0";     // sadyal9995@gmail.com

function generateToken(userId) {
  return jwt.sign({ id: userId, sessionVersion: 0 }, JWT_SECRET, { expiresIn: "1h" });
}

async function run() {
  console.log("Starting E2E Socket Collaboration Test...");

  const ownerToken = generateToken(OWNER_ID);
  const collabToken = generateToken(COLLAB_ID);

  console.log("Generated mock JWT tokens successfully.");

  // Connect Owner Socket
  console.log("\n--- Connecting Owner Socket ---");
  const ownerSocket = io(SOCKET_URL, {
    auth: { token: ownerToken },
    query: { tabId: "tab-owner-123" }
  });

  ownerSocket.on("connect", () => {
    console.log("👑 Owner Socket connected! ID:", ownerSocket.id);
    console.log("👑 Owner emitting get-document...");
    ownerSocket.emit("get-document", DOC_ID, { name: "Owner Sadyal", avatar: "", color: "#ff0000" });
  });

  ownerSocket.on("connect_error", (err) => {
    console.error("👑 Owner Connection Error:", err.message);
  });

  ownerSocket.on("presence-list", (members) => {
    console.log("👑 Owner received presence-list:", members.map(m => `${m.name} (${m.role} - ${m.status})`));
  });

  ownerSocket.on("presence-joined", (member) => {
    console.log("👑 Owner received presence-joined:", member.name, member.role);
  });

  ownerSocket.on("receive-changes", (delta) => {
    console.log("👑 Owner received receive-changes:", JSON.stringify(delta));
  });

  // Connect Collaborator Socket
  console.log("\n--- Connecting Collaborator Socket ---");
  const collabSocket = io(SOCKET_URL, {
    auth: { token: collabToken },
    query: { tabId: "tab-collab-123" }
  });

  collabSocket.on("connect", () => {
    console.log("👥 Collaborator Socket connected! ID:", collabSocket.id);
    console.log("👥 Collaborator emitting get-document...");
    collabSocket.emit("get-document", DOC_ID, { name: "Collab Sadyal", avatar: "", color: "#00ff00" });
  });

  collabSocket.on("connect_error", (err) => {
    console.error("👥 Collaborator Connection Error:", err.message);
  });

  collabSocket.on("presence-list", (members) => {
    console.log("👥 Collaborator received presence-list:", members.map(m => `${m.name} (${m.role} - ${m.status})`));
  });

  collabSocket.on("presence-joined", (member) => {
    console.log("👥 Collaborator received presence-joined:", member.name, member.role);
  });

  collabSocket.on("receive-changes", (delta) => {
    console.log("👥 Collaborator received receive-changes:", JSON.stringify(delta));
  });

  // Test Events
  setTimeout(() => {
    console.log("\n--- Simulating Owner Typing Changes ---");
    ownerSocket.emit("send-changes", { root: { children: [{ text: "Hello from Owner!" }] } });
  }, 3000);

  setTimeout(() => {
    console.log("\n--- Simulating Collaborator Presence Update ---");
    collabSocket.emit("presence-update", { status: "online", isTyping: true, cursor: { x: 10, y: 20 } });
  }, 4000);

  // Shutdown after 6 seconds
  setTimeout(() => {
    console.log("\nCleaning up connections...");
    ownerSocket.close();
    collabSocket.close();
    console.log("Test finished.");
  }, 6000);
}

run();
