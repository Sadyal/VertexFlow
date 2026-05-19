import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env");
  process.exit(1);
}

// Inline model schemas to bypass complex imports
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  isAccountVerified: { type: Boolean, default: false }
}, { timestamps: true });

const DocumentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  title: { type: String, default: 'Untitled Document' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: Object, default: {} },
  collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Seed: MongoDB connected successfully");

    // Clear previous seed data
    await User.deleteMany({ email: { $in: ['owner@test.com', 'collab@test.com'] } });
    await Document.deleteMany({ _id: 'test-doc-id-12345' });
    console.log("🧹 Seed: Cleared stale test records");

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Owner User
    const owner = await User.create({
      name: 'Owner User',
      email: 'owner@test.com',
      password: hashedPassword,
      isAccountVerified: true,
      role: 'user'
    });
    console.log(`👤 Seed: Created Owner User (_id: ${owner._id})`);

    // Create Collaborator User
    const collab = await User.create({
      name: 'Collaborator User',
      email: 'collab@test.com',
      password: hashedPassword,
      isAccountVerified: true,
      role: 'user'
    });
    console.log(`👤 Seed: Created Collaborator User (_id: ${collab._id})`);

    // Seed shared document
    const initialContent = {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'Welcome to VertexFlow E2E test document. Feel free to collaborate!',
                type: 'text',
                version: 1
              }
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1
          }
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1
      }
    };

    const doc = await Document.create({
      _id: 'test-doc-id-12345',
      title: 'E2E Audit Test Document',
      owner: owner._id,
      collaborators: [collab._id],
      content: initialContent
    });
    console.log(`📝 Seed: Created Shared Document (ID: ${doc._id}, Title: ${doc.title})`);

    console.log("✨ Seed: Database seeder completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Error:", error);
    process.exit(1);
  }
}

run();
