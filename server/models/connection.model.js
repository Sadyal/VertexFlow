import mongoose from 'mongoose';

/**
 * @schema Connection
 * @description Stores relationship status between users (LinkedIn-style requests).
 * Statuses: 
 * - 'pending': Request sent, awaiting action
 * - 'accepted': Users are now "Friends" and can chat
 * - 'rejected': Request was declined
 */
const connectionSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Prevent duplicate connections or inverse duplicates
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const Connection = mongoose.model('Connection', connectionSchema);

export default Connection;
