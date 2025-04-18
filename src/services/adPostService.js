const { AdPost } = require('../models/adPost');
const { Purchase } = require('../models/purchase');

class AdPostService {
  /**
   * Create a new advertisement post
   * @param {Object} adData - Advertisement data
   * @param {String} adData.userId - User ID
   * @param {String} adData.content - Content of the advertisement
   * @param {Object} adData.mediaInfo - Media information (optional)
   * @param {Array} adData.targetCategories - Target categories for the ad
   * @param {Number} adData.budget - Budget for the advertisement
   * @returns {Promise<Object>} Created advertisement post
   */
  async createAdPost(adData) {
    const adPost = new AdPost(adData);
    await adPost.save();
    return adPost;
  }

  /**
   * Get advertisement post by ID
   * @param {String} adPostId - Advertisement post ID
   * @param {String} userId - User ID
   * @returns {Promise<Object>} Advertisement post
   */
  async getAdPostById(adPostId, userId) {
    const adPost = await AdPost.findOne({ _id: adPostId, userId });
    if (!adPost) {
      throw new Error('Advertisement post not found');
    }
    return adPost;
  }

  /**
   * Get all advertisement posts for a user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} List of advertisement posts
   */
  async getUserAdPosts(userId) {
    return AdPost.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Update advertisement post
   * @param {String} adPostId - Advertisement post ID
   * @param {String} userId - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated advertisement post
   */
  async updateAdPost(adPostId, userId, updateData) {
    const adPost = await AdPost.findOne({ _id: adPostId, userId });
    if (!adPost) {
      throw new Error('Advertisement post not found');
    }
    
    Object.assign(adPost, updateData);
    await adPost.save();
    return adPost;
  }

  /**
   * Delete advertisement post
   * @param {String} adPostId - Advertisement post ID
   * @param {String} userId - User ID
   * @returns {Promise<Boolean>} True if deleted
   */
  async deleteAdPost(adPostId, userId) {
    // Check if the ad post is used in any active purchases
    const activePurchases = await Purchase.findOne({ 
      adPost: adPostId,
      status: { $in: ['active', 'pending'] }
    });

    if (activePurchases) {
      throw new Error('Cannot delete advertisement post that is used in active purchases');
    }

    const result = await AdPost.findOneAndUpdate(
      { _id: adPostId, userId },
      { status: 'deleted' }
    );
    
    return !!result;
  }

  /**
   * Get advertisement posts by categories
   * @param {Array} categories - List of categories
   * @returns {Promise<Array>} List of advertisement posts
   */
  async getAdPostsByCategories(categories) {
    return AdPost.find({
      targetCategories: { $in: categories },
      status: 'active'
    });
  }

  /**
   * Update advertisement statistics
   * @param {String} adPostId - Advertisement post ID
   * @param {Object} stats - Statistics to update
   * @returns {Promise<Object>} Updated advertisement post
   */
  async updateAdStats(adPostId, stats) {
    const adPost = await AdPost.findById(adPostId);
    if (!adPost) {
      throw new Error('Advertisement post not found');
    }
    
    adPost.stats = { ...adPost.stats, ...stats };
    await adPost.save();
    return adPost;
  }
}

module.exports = new AdPostService(); 