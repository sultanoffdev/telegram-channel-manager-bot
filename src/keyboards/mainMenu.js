const { Markup } = require('telegraf');

const mainMenuKeyboard = Markup.keyboard([
  ['📝 Постинг', '🔍 Сканинг'],
  ['💰 Закупы', '📅 Календарь'],
  ['💵 Финансы', '📢 Мои каналы'],
  ['🛡 Защита и Приём', '🔄 Сети каналов'],
  ['⚙️ Настройки']
]).resize();

module.exports = {
  mainMenuKeyboard
}; 