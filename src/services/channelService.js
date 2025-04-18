const { User } = require('../models/user');

class ChannelService {
  /**
   * Получить каналы пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Array>} Список каналов
   */
  async getUserChannels(userId) {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    return user.channels || [];
  }

  /**
   * Добавить канал пользователю
   * @param {number} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {string} title - Название канала
   * @param {string} username - Username канала
   * @returns {Promise<Object>} Обновленные данные пользователя
   */
  async addChannel(userId, channelId, title, username) {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    if (!user.channels) {
      user.channels = [];
    }

    // Проверяем, не добавлен ли уже этот канал
    const existingChannel = user.channels.find(channel => channel.id === channelId);
    if (existingChannel) {
      throw new Error('Канал уже добавлен');
    }

    // Добавляем канал
    user.channels.push({
      id: channelId,
      title,
      username,
      isActive: true
    });

    await user.save();
    return user;
  }

  /**
   * Удалить канал у пользователя
   * @param {number} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @returns {Promise<Object>} Обновленные данные пользователя
   */
  async removeChannel(userId, channelId) {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    if (!user.channels) {
      return user;
    }

    // Удаляем канал
    user.channels = user.channels.filter(channel => channel.id !== channelId);
    await user.save();
    return user;
  }

  /**
   * Изменить статус активности канала
   * @param {number} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {boolean} isActive - Новый статус активности
   * @returns {Promise<Object>} Обновленные данные пользователя
   */
  async toggleChannelStatus(userId, channelId, isActive) {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    if (!user.channels) {
      throw new Error('У пользователя нет каналов');
    }

    // Находим канал и меняем его статус
    const channel = user.channels.find(channel => channel.id === channelId);
    if (!channel) {
      throw new Error('Канал не найден');
    }

    channel.isActive = isActive;
    await user.save();
    return user;
  }

  /**
   * Получить активные каналы пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Array>} Список активных каналов
   */
  async getActiveChannels(userId) {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    return (user.channels || []).filter(channel => channel.isActive);
  }
}

module.exports = new ChannelService(); 