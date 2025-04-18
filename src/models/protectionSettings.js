const mongoose = require('mongoose');

const protectionSettingsSchema = new mongoose.Schema({
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
    type: Number,
    default: 0, // 0 - выключен, >0 - время в минутах
    min: 0,
    max: 1440 // максимум 24 часа
  },
  botDetectionEnabled: {
    type: Boolean,
    default: false
  },
  antiSpamEnabled: {
    type: Boolean,
    default: false
  },
  joinRequestManagementEnabled: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Обновляем updatedAt при сохранении
protectionSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ProtectionSettings = mongoose.model('ProtectionSettings', protectionSettingsSchema);

module.exports = { ProtectionSettings }; 