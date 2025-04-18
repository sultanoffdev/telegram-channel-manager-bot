const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
    unique: true
  },
  username: String,
  timezone: {
    type: String,
    default: 'Europe/Moscow'
  },
  language: {
    type: String,
    default: 'ru'
  },
  channels: [{
    id: String,
    title: String,
    username: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  subscription: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  subscriptionExpiresAt: {
    type: Date,
    default: null
  },
  referralCode: String,
  referredBy: {
    type: Number,
    default: null
  },
  referrals: [{
    type: Number
  }],
  referralBonus: {
    type: Number,
    default: 0
  },
  autoApproveTimer: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

module.exports = {
  User
}; 