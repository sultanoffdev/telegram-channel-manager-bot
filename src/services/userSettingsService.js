const { User } = require('../models/user');

class UserSettingsService {
  /**
   * Получить настройки пользователя
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Настройки пользователя
   */
  async getUserSettings(userId) {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    return user;
  }

  /**
   * Обновить часовой пояс пользователя
   * @param {number} userId - ID пользователя
   * @param {string} timezone - Часовой пояс
   * @returns {Promise<Object>} Обновленные настройки
   */
  async updateTimezone(userId, timezone) {
    const user = await User.findOneAndUpdate(
      { telegramId: userId },
      { timezone },
      { new: true }
    );
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    return user;
  }

  /**
   * Обновить язык пользователя
   * @param {number} userId - ID пользователя
   * @param {string} language - Код языка (ru/en)
   * @returns {Promise<Object>} Обновленные настройки
   */
  async updateLanguage(userId, language) {
    const user = await User.findOneAndUpdate(
      { telegramId: userId },
      { language },
      { new: true }
    );
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    return user;
  }

  /**
   * Получить информацию о подписке
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Информация о подписке
   */
  async getSubscriptionInfo(userId) {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    
    return {
      type: user.subscription,
      expiresAt: user.subscriptionExpiresAt,
      isActive: user.subscription === 'premium' && 
                user.subscriptionExpiresAt && 
                user.subscriptionExpiresAt > new Date()
    };
  }

  /**
   * Обновить подписку пользователя
   * @param {number} userId - ID пользователя
   * @param {string} type - Тип подписки
   * @param {Date} expiresAt - Дата окончания подписки
   * @returns {Promise<Object>} Обновленные настройки
   */
  async updateSubscription(userId, type, expiresAt) {
    const user = await User.findOneAndUpdate(
      { telegramId: userId },
      { 
        subscription: type,
        subscriptionExpiresAt: expiresAt
      },
      { new: true }
    );
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    return user;
  }

  /**
   * Получить реферальную информацию
   * @param {number} userId - ID пользователя
   * @returns {Promise<Object>} Реферальная информация
   */
  async getReferralInfo(userId) {
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    
    // Генерируем реферальный код, если его нет
    if (!user.referralCode) {
      user.referralCode = this.generateReferralCode(userId);
      await user.save();
    }
    
    return {
      code: user.referralCode,
      referrals: user.referrals || [],
      bonus: user.referralBonus || 0
    };
  }

  /**
   * Активировать реферальный код
   * @param {number} userId - ID пользователя
   * @param {string} code - Реферальный код
   * @returns {Promise<Object>} Обновленные настройки
   */
  async activateReferralCode(userId, code) {
    const referrer = await User.findOne({ referralCode: code });
    if (!referrer) {
      throw new Error('Недействительный реферальный код');
    }

    // Проверяем, не активировал ли пользователь уже код
    const user = await User.findOne({ telegramId: userId });
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    if (user.referredBy) {
      throw new Error('Вы уже активировали реферальный код');
    }

    if (user.telegramId === referrer.telegramId) {
      throw new Error('Нельзя использовать свой собственный код');
    }

    // Обновляем данные пользователя
    user.referredBy = referrer.telegramId;
    await user.save();

    // Добавляем пользователя в список рефералов реферера
    if (!referrer.referrals) {
      referrer.referrals = [];
    }
    referrer.referrals.push(user.telegramId);
    await referrer.save();

    return user;
  }

  /**
   * Генерирует реферальный код для пользователя
   * @param {number} userId - ID пользователя
   * @returns {string} Реферальный код
   */
  generateReferralCode(userId) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

module.exports = new UserSettingsService(); 