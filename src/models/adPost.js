const mongoose = require('mongoose');
const { Schema } = mongoose;

const adPostSchema = new Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  mediaInfo: {
    type: Object,
    default: null
  },
  targetCategories: {
    type: [String],
    default: []
  },
  budget: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in days
    default: 7
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'completed', 'rejected', 'deleted'],
    default: 'draft'
  },
  stats: {
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    interactions: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 }
  },
  moderationNotes: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  keywords: {
    type: [String],
    default: []
  },
  pricing: {
    type: Object,
    default: {
      perView: 0.005,
      perClick: 0.05,
      perInteraction: 0.1
    }
  }
}, { timestamps: true });

// Indexes for performance
adPostSchema.index({ status: 1 });
adPostSchema.index({ targetCategories: 1 });
adPostSchema.index({ startDate: 1, endDate: 1 });

const AdPost = mongoose.model('AdPost', adPostSchema);

module.exports = { AdPost }; 