const moment = require('moment-timezone');

/**
 * Форматирует дату в соответствии с часовым поясом пользователя
 * @param {Date} date - Дата для форматирования
 * @param {string} timezone - Часовой пояс пользователя
 * @param {string} format - Формат даты (по умолчанию 'DD.MM.YYYY HH:mm')
 * @returns {string} Отформатированная дата
 */
const formatDate = (date, timezone = 'Europe/Moscow', format = 'DD.MM.YYYY HH:mm') => {
  return moment(date).tz(timezone).format(format);
};

/**
 * Генерирует случайный реферальный код
 * @param {number} length - Длина кода (по умолчанию 8)
 * @returns {string} Реферальный код
 */
const generateReferralCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Проверяет, является ли строка валидным промокодом
 * @param {string} code - Промокод для проверки
 * @returns {boolean} Результат проверки
 */
const isValidPromoCode = (code) => {
  // Простая проверка: промокод должен быть не короче 4 символов и содержать только буквы и цифры
  return /^[a-zA-Z0-9]{4,}$/.test(code);
};

/**
 * Форматирует размер числа (например, для отображения количества подписчиков)
 * @param {number} num - Число для форматирования
 * @returns {string} Отформатированное число
 */
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
};

module.exports = {
  formatDate,
  generateReferralCode,
  isValidPromoCode,
  formatNumber
}; 