const { Protection } = require('../models/protection');

class ProtectionSettingsService {
  /**
   * Получить расширенные настройки защиты для канала
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @returns {Promise<Object>} Настройки защиты
   */
  async getSettings(userId, channelId) {
    let settings = await Protection.findOne({ userId, channelId });
    
    if (!settings) {
      settings = await this.createDefaultSettings(userId, channelId);
    }
    
    return settings;
  }

  /**
   * Создать настройки защиты по умолчанию
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @returns {Promise<Object>} Созданные настройки
   */
  async createDefaultSettings(userId, channelId) {
    const settings = new Protection({
      userId,
      channelId,
      autoApprovalTimer: 0,
      settings: {
        preventLinks: true,
        preventForwards: true,
        preventMentions: false,
        preventHashtags: false,
        preventMedia: false,
        preventVoice: true,
        preventStickers: true,
        preventGifs: false,
        preventPolls: false,
        enableContentFilter: false,
        enableUserWhitelist: false
      },
      contentFilterKeywords: [],
      whitelistedUsers: [],
      active: true
    });

    return await settings.save();
  }

  /**
   * Обновить таймер автопринятия
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {number} timer - Время в минутах (0 для отключения)
   * @returns {Promise<Object>} Обновленные настройки
   */
  async updateAutoApprovalTimer(userId, channelId, timer) {
    const settings = await Protection.findOneAndUpdate(
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
   * Обновить настройки защиты контента
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {string} settingName - Название настройки
   * @param {boolean} value - Новое значение
   * @returns {Promise<Object>} Обновленные настройки
   */
  async updateContentSetting(userId, channelId, settingName, value) {
    const updatePath = `settings.${settingName}`;
    const updateObj = {};
    updateObj[updatePath] = value;
    
    const settings = await Protection.findOneAndUpdate(
      { userId, channelId },
      { $set: updateObj },
      { new: true }
    );

    if (!settings) {
      throw new Error('Настройки не найдены');
    }

    return settings;
  }

  /**
   * Переключить настройку защиты контента
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {string} settingName - Название настройки
   * @returns {Promise<Object>} Обновленные настройки
   */
  async toggleContentSetting(userId, channelId, settingName) {
    const settings = await Protection.findOne({ userId, channelId });
    
    if (!settings) {
      throw new Error('Настройки не найдены');
    }
    
    // Переключаем значение настройки
    settings.settings[settingName] = !settings.settings[settingName];
    return await settings.save();
  }

  /**
   * Добавить ключевое слово для фильтрации
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {string} keyword - Ключевое слово
   * @returns {Promise<Object>} Обновленные настройки
   */
  async addContentFilterKeyword(userId, channelId, keyword) {
    const settings = await Protection.findOneAndUpdate(
      { userId, channelId },
      { $addToSet: { contentFilterKeywords: keyword } },
      { new: true }
    );

    if (!settings) {
      throw new Error('Настройки не найдены');
    }

    return settings;
  }

  /**
   * Удалить ключевое слово из фильтра
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {string} keyword - Ключевое слово
   * @returns {Promise<Object>} Обновленные настройки
   */
  async removeContentFilterKeyword(userId, channelId, keyword) {
    const settings = await Protection.findOneAndUpdate(
      { userId, channelId },
      { $pull: { contentFilterKeywords: keyword } },
      { new: true }
    );

    if (!settings) {
      throw new Error('Настройки не найдены');
    }

    return settings;
  }

  /**
   * Добавить пользователя в белый список
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {string} whitelistedUserId - ID пользователя для белого списка
   * @returns {Promise<Object>} Обновленные настройки
   */
  async addWhitelistedUser(userId, channelId, whitelistedUserId) {
    const settings = await Protection.findOneAndUpdate(
      { userId, channelId },
      { $addToSet: { whitelistedUsers: whitelistedUserId } },
      { new: true }
    );

    if (!settings) {
      throw new Error('Настройки не найдены');
    }

    return settings;
  }

  /**
   * Удалить пользователя из белого списка
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {string} whitelistedUserId - ID пользователя для удаления из белого списка
   * @returns {Promise<Object>} Обновленные настройки
   */
  async removeWhitelistedUser(userId, channelId, whitelistedUserId) {
    const settings = await Protection.findOneAndUpdate(
      { userId, channelId },
      { $pull: { whitelistedUsers: whitelistedUserId } },
      { new: true }
    );

    if (!settings) {
      throw new Error('Настройки не найдены');
    }

    return settings;
  }

  /**
   * Активировать или деактивировать защиту
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @param {boolean} isActive - Статус активности
   * @returns {Promise<Object>} Обновленные настройки
   */
  async setActiveStatus(userId, channelId, isActive) {
    const settings = await Protection.findOneAndUpdate(
      { userId, channelId },
      { active: isActive },
      { new: true }
    );

    if (!settings) {
      throw new Error('Настройки не найдены');
    }

    return settings;
  }

  /**
   * Удалить настройки защиты
   * @param {string} userId - ID пользователя
   * @param {string} channelId - ID канала
   * @returns {Promise<boolean>} Результат операции
   */
  async deleteSettings(userId, channelId) {
    const result = await Protection.deleteOne({ userId, channelId });
    return result.deletedCount > 0;
  }
}

module.exports = new ProtectionSettingsService(); 