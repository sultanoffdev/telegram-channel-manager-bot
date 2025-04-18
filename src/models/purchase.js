const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  channels: [{
    id: String,
    title: String
  }],
  adPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdPost',
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  additionalConditions: {
    type: String,
    default: ''
  },
  trackingLink: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  trafficData: {
    visits: {
      type: Number,
      default: 0
    },
    uniqueVisitors: {
      type: Number,
      default: 0
    },
    avgTimeOnSite: {
      type: String,
      default: '0:00'
    },
    conversion: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = { Purchase }; 