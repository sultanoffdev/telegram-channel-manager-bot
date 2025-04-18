const { ChannelNetwork } = require('../models/channelNetwork');
const channelService = require('./channelService');

/**
 * Service for managing channel networks
 */
class ChannelNetworkService {
  constructor() {
    this.channelService = channelService;
  }

  /**
   * Get all networks for a user
   * @param {string} userId - The user's ID
   * @returns {Promise<Array>} - Array of channel networks
   */
  async getUserNetworks(userId) {
    try {
      return await ChannelNetwork.find({ userId })
        .populate('channels')
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting user networks:', error);
      throw new Error('Failed to get user networks');
    }
  }

  /**
   * Get a network by its ID
   * @param {string} networkId - The network ID
   * @param {string} userId - The user's ID
   * @returns {Promise<Object>} - The channel network
   */
  async getNetworkById(networkId, userId) {
    try {
      const network = await ChannelNetwork.findOne({ _id: networkId, userId }).populate('channels');
      
      if (!network) {
        throw new Error('Network not found');
      }
      
      return network;
    } catch (error) {
      console.error(`Error getting network ${networkId}:`, error);
      throw new Error('Failed to get network');
    }
  }

  /**
   * Create a new channel network
   * @param {string} userId - The user's ID
   * @param {string} name - The network name
   * @param {string} description - The network description
   * @param {Array<string>} channelIds - Array of channel IDs to include
   * @param {Object} settings - Network settings
   * @returns {Promise<Object>} - The created network
   */
  async createNetwork(userId, name, description = '', channelIds = [], settings = {}) {
    try {
      // Validate that all channelIds belong to the user
      if (channelIds.length > 0) {
        await this.validateChannelIds(userId, channelIds);
      }

      const network = new ChannelNetwork({
        userId,
        name,
        description,
        channels: channelIds,
        settings
      });

      await network.save();
      return await network.populate('channels');
    } catch (error) {
      console.error('Error creating network:', error);
      throw new Error(error.message || 'Failed to create network');
    }
  }

  /**
   * Update a channel network
   * @param {string} networkId - The network ID
   * @param {string} userId - The user's ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - The updated network
   */
  async updateNetwork(networkId, userId, updates) {
    try {
      const network = await ChannelNetwork.findOne({ _id: networkId, userId });
      
      if (!network) {
        throw new Error('Network not found');
      }

      // Apply updates
      if (updates.name) network.name = updates.name;
      if (updates.description !== undefined) network.description = updates.description;
      if (updates.settings) {
        network.settings = {
          ...network.settings,
          ...updates.settings
        };
      }

      await network.save();
      return await network.populate('channels');
    } catch (error) {
      console.error(`Error updating network ${networkId}:`, error);
      throw new Error(error.message || 'Failed to update network');
    }
  }

  /**
   * Add channels to a network
   * @param {string} networkId - The network ID
   * @param {string} userId - The user's ID
   * @param {Array<string>} channelIds - Array of channel IDs to add
   * @returns {Promise<Object>} - The updated network
   */
  async addChannelsToNetwork(networkId, userId, channelIds) {
    try {
      // Validate that all channelIds belong to the user
      await this.validateChannelIds(userId, channelIds);

      const network = await ChannelNetwork.findOne({ _id: networkId, userId });
      
      if (!network) {
        throw new Error('Network not found');
      }

      // Add channels, avoiding duplicates
      const existingChannelIds = network.channels.map(id => id.toString());
      const newChannelIds = channelIds.filter(id => !existingChannelIds.includes(id.toString()));
      
      if (newChannelIds.length > 0) {
        network.channels = [...network.channels, ...newChannelIds];
        await network.save();
      }

      return await network.populate('channels');
    } catch (error) {
      console.error(`Error adding channels to network ${networkId}:`, error);
      throw new Error(error.message || 'Failed to add channels to network');
    }
  }

  /**
   * Remove channels from a network
   * @param {string} networkId - The network ID
   * @param {string} userId - The user's ID
   * @param {Array<string>} channelIds - Array of channel IDs to remove
   * @returns {Promise<Object>} - The updated network
   */
  async removeChannelsFromNetwork(networkId, userId, channelIds) {
    try {
      const network = await ChannelNetwork.findOne({ _id: networkId, userId });
      
      if (!network) {
        throw new Error('Network not found');
      }

      // Remove the specified channels
      network.channels = network.channels.filter(
        channelId => !channelIds.includes(channelId.toString())
      );
      
      await network.save();
      return await network.populate('channels');
    } catch (error) {
      console.error(`Error removing channels from network ${networkId}:`, error);
      throw new Error('Failed to remove channels from network');
    }
  }

  /**
   * Delete a channel network
   * @param {string} networkId - The network ID
   * @param {string} userId - The user's ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteNetwork(networkId, userId) {
    try {
      const result = await ChannelNetwork.deleteOne({ _id: networkId, userId });
      
      if (result.deletedCount === 0) {
        throw new Error('Network not found or user not authorized');
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting network ${networkId}:`, error);
      throw new Error('Failed to delete network');
    }
  }

  /**
   * Validate that all channelIds belong to the user
   * @private
   * @param {string} userId - The user's ID
   * @param {Array<string>} channelIds - Array of channel IDs to validate
   */
  async validateChannelIds(userId, channelIds) {
    const userChannels = await this.channelService.getUserChannels(userId);
    const userChannelIds = userChannels.map(channel => channel.id.toString());
    
    const invalidChannels = channelIds.filter(id => !userChannelIds.includes(id.toString()));
    
    if (invalidChannels.length > 0) {
      throw new Error(`Some channels do not belong to the user: ${invalidChannels.join(', ')}`);
    }
  }
}

module.exports = new ChannelNetworkService();