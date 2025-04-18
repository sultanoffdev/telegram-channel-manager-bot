const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  channelId: {
    type: [String],
    required: true
  },
  content: {
    type: Object,
    required: true
  },
  scheduleTime: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'published', 'failed', 'deleted'],
    default: 'scheduled',
    index: true
  },
  tags: {
    type: [String],
    default: []
  },
  settings: {
    repeat: {
      type: Boolean,
      default: false
    },
    silent: {
      type: Boolean,
      default: false
    },
    protection: {
      type: Boolean,
      default: false
    },
    buttons: {
      type: Object,
      default: null
    }
  }
}, {
  timestamps: true
});

const Post = mongoose.model('Post', postSchema);

module.exports = { Post }; 