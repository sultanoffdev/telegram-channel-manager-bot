const { ProtectionSettings } = require('../models/protectionSettings');

class ProtectionService {
  /**
   * Получить настройки защиты для канала
   * @param {number} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @returns {Promise<Object>} Настройки защиты
   */
  async getSettings(userId, channelId) {
    let settings = await ProtectionSettings.findOne({ userId, channelId });
    
    if (!settings) {
      settings = await this.createDefaultSettings(userId, channelId);
    }
    
    return settings;
  }

  /**
   * Создать настройки защиты по умолчанию
   * @param {number} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @returns {Promise<Object>} Созданные настройки
   */
  async createDefaultSettings(userId, channelId) {
    const settings = new ProtectionSettings({
      userId,
      channelId,
      autoApprovalTimer: 0,
      botDetectionEnabled: false,
      antiSpamEnabled: false,
      joinRequestManagementEnabled: false
    });

    return await settings.save();
  }

  /**
   * Обновить таймер автопринятия
   * @param {number} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {number} timer - Время в минутах (0 для отключения)
   * @returns {Promise<Object>} Обновленные настройки
   */
  async updateAutoApprovalTimer(userId, channelId, timer) {
    const settings = await ProtectionSettings.findOneAndUpdate(
      { userId, channelId },
      { autoApprovalTimer: timer },
      { new: true }
    );

    if (!settings) {
      throw new Error('Настройки не найдены');
    }

    return settings;
  }

  /**
   * Обновить настройки защиты
   * @param {number} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {Object} updates - Обновляемые настройки
   * @returns {Promise<Object>} Обновленные настройки
   */
  async updateSettings(userId, channelId, updates) {
    const settings = await ProtectionSettings.findOneAndUpdate(
      { userId, channelId },
      updates,
      { new: true }
    );

    if (!settings) {
      throw new Error('Настройки не найдены');
    }

    return settings;
  }

  /**
   * Переключить настройку защиты
   * @param {number} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {string} setting - Название настройки
   * @returns {Promise<Object>} Обновленные настройки
   */
  async toggleSetting(userId, channelId, setting) {
    const settings = await ProtectionSettings.findOne({ userId, channelId });
    
    if (!settings) {
      throw new Error('Настройки не найдены');
    }

    settings[setting] = !settings[setting];
    return await settings.save();
  }

  /**
   * Удалить настройки защиты
   * @param {number} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @returns {Promise<void>}
   */
  async deleteSettings(userId, channelId) {
    await ProtectionSettings.deleteOne({ userId, channelId });
  }
}

module.exports = new ProtectionService(); 