import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  role: { type: String }
});

const DocumentSchema = new mongoose.Schema({
  _id: { type: String },
  title: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);

async function run() {
  try {
    await mongoose.connect(MONGO_URI, { dbName: "livesync" });
    console.log("Connected to MongoDB!");

    const user = await User.findOne({ email: 'nikhilsadyal00@gmail.com' });
    if (user) {
      console.log("User nikhilsadyal00@gmail.com found:", user._id, user.name, user.email);
    } else {
      console.log("User nikhilsadyal00@gmail.com NOT found!");
    }

    const docId = '02d49739-35ba-417e-8f6a-2286caba33d2';
    const doc = await Document.findById(docId).populate('owner collaborators');
    if (doc) {
      console.log("Document details:");
      console.log("Title:", doc.title);
      console.log("Owner:", doc.owner ? `${doc.owner._id} (${doc.owner.email})` : 'None');
      console.log("Collaborators:");
      doc.collaborators.forEach(c => {
        console.log(`  - ${c._id} (${c.email})`);
      });
    } else {
      console.log("Document NOT found!");
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
