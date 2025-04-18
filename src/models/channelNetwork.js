const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const channelNetworkSchema = new Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  channels: [{
    type: Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  }],
  settings: {
    simultaneousPosting: {
      type: Boolean,
      default: false
    },
    autoReposts: {
      type: Boolean,
      default: false
    },
    contentSynchronization: {
      type: Boolean,
      default: false
    }
  }
}, { timestamps: true });

// Create a compound index for faster lookups
channelNetworkSchema.index({ userId: 1, name: 1 });

// Virtual for channel count
channelNetworkSchema.virtual('channelCount').get(function() {
  return this.channels.length;
});

// Ensure virtual fields are included when converting to JSON
channelNetworkSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const ChannelNetwork = mongoose.model('ChannelNetwork', channelNetworkSchema);

module.exports = { ChannelNetwork }; 