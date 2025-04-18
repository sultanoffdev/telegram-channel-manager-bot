const { Purchase } = require('../models/purchase');
const { AdPost } = require('../models/adPost');

class PurchaseService {
  /**
   * Create a new purchase
   * @param {Object} purchaseData - Purchase data
   * @param {String} purchaseData.userId - User ID
   * @param {Array} purchaseData.channels - Array of channel IDs
   * @param {Object} purchaseData.adPost - Advertisement post data
   * @param {Number} purchaseData.price - Purchase price
   * @param {Number} purchaseData.duration - Duration in days
   * @param {Object} purchaseData.additionalConditions - Additional conditions
   * @param {String} purchaseData.trackingLink - Tracking link
   * @returns {Promise<Object>} Created purchase
   */
  async createPurchase(purchaseData) {
    const purchase = new Purchase(purchaseData);
    await purchase.save();
    return purchase;
  }

  /**
   * Get purchase by ID
   * @param {String} purchaseId - Purchase ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Purchase object
   */
  async getPurchaseById(purchaseId, userId) {
    const purchase = await Purchase.findOne({ _id: purchaseId, userId });
    if (!purchase) {
      throw new Error('Purchase not found');
    }
    return purchase;
  }

  /**
   * Get all purchases for a user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} List of purchases
   */
  async getUserPurchases(userId) {
    return Purchase.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Update purchase status
   * @param {String} purchaseId - Purchase ID
   * @param {String} status - New status
   * @returns {Promise<Object>} Updated purchase
   */
  async updatePurchaseStatus(purchaseId, status) {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }
    
    purchase.status = status;
    await purchase.save();
    return purchase;
  }

  /**
   * Update traffic data for a purchase
   * @param {String} purchaseId - Purchase ID
   * @param {Object} trafficData - Traffic data to update
   * @returns {Promise<Object>} Updated purchase
   */
  async updateTrafficData(purchaseId, trafficData) {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) {
      throw new Error('Purchase not found');
    }
    
    purchase.trafficData = { ...purchase.trafficData, ...trafficData };
    await purchase.save();
    return purchase;
  }

  /**
   * Cancel a purchase
   * @param {String} purchaseId - Purchase ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Cancelled purchase
   */
  async cancelPurchase(purchaseId, userId) {
    const purchase = await Purchase.findOne({ _id: purchaseId, userId });
    if (!purchase) {
      throw new Error('Purchase not found');
    }
    
    purchase.status = 'cancelled';
    await purchase.save();
    return purchase;
  }

  /**
   * Get active advertisements for a channel
   * @param {String} channelId - Channel ID
   * @returns {Promise<Array>} List of active purchases for the channel
   */
  async getActiveAdsForChannel(channelId) {
    return Purchase.find({
      channels: channelId,
      status: 'active'
    }).populate('adPost');
  }
}

module.exports = new PurchaseService(); 