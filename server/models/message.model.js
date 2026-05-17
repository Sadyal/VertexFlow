import mongoose from 'mongoose';

/**
 * @schema Message
 * @description Stores private messages between friends.
 */
const messageSchema = new mongoose.Schema({
  sender: {
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
  content: {
    type: String,
    required: true,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Compound indexes for fast chat history retrieval in both directions
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, sender: 1, createdAt: -1 });
// ⚡ OPTIMIZATION: Index for unread count performance
messageSchema.index({ recipient: 1, isRead: 1, sender: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
