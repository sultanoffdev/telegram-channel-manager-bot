const mongoose = require('mongoose');
const { Schema } = mongoose;

const protectionSchema = new Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  channelId: {
    type: String,
    required: true,
    index: true
  },
  autoApprovalTimer: {
    type: Number, // in minutes, 0 means disabled
    default: 0
  },
  settings: {
    preventLinks: {
      type: Boolean,
      default: true
    },
    preventForwards: {
      type: Boolean,
      default: true
    },
    preventMentions: {
      type: Boolean,
      default: false
    },
    preventHashtags: {
      type: Boolean,
      default: false
    },
    preventMedia: {
      type: Boolean,
      default: false
    },
    preventVoice: {
      type: Boolean,
      default: true
    },
    preventStickers: {
      type: Boolean,
      default: true
    },
    preventGifs: {
      type: Boolean,
      default: false
    },
    preventPolls: {
      type: Boolean,
      default: false
    },
    enableContentFilter: {
      type: Boolean,
      default: false
    },
    enableUserWhitelist: {
      type: Boolean,
      default: false
    }
  },
  contentFilterKeywords: {
    type: [String],
    default: []
  },
  whitelistedUsers: {
    type: [String],
    default: []
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Compound index for faster lookups by userId and channelId together
protectionSchema.index({ userId: 1, channelId: 1 }, { unique: true });

const Protection = mongoose.model('Protection', protectionSchema);

module.exports = { Protection };