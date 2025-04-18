const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  channelId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Обновляем updatedAt при изменении документа
channelSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Channel = mongoose.model('Channel', channelSchema);

module.exports = { Channel }; 