const { mainMenuKeyboard } = require('../keyboards/mainMenu');

const setupCommands = (bot) => {
  // Команда /start
  bot.command('start', async (ctx) => {
    await ctx.reply(
      'Добро пожаловать в бота для управления каналами! Выберите нужный раздел из меню ниже:',
      mainMenuKeyboard
    );
  });

  // Команда /help
  bot.command('help', async (ctx) => {
    await ctx.reply(
      'Этот бот поможет вам управлять вашими Telegram-каналами.\n\n' +
      'Основные функции:\n' +
      '📝 Постинг - планирование и публикация постов\n' +
      '🔍 Сканинг - анализ каналов и пользователей\n' +
      '💰 Закупы - управление рекламными закупками\n' +
      '📅 Календарь - просмотр запланированных постов\n' +
      '💵 Финансы - управление финансами (в разработке)\n' +
      '📢 Мои каналы - управление вашими каналами\n' +
      '🛡 Защита и Приём - настройки защиты каналов\n' +
      '⚙️ Настройки - настройка бота\n\n' +
      'Используйте меню ниже для навигации:',
      mainMenuKeyboard
    );
  });

  // Команда /menu
  bot.command('menu', async (ctx) => {
    await ctx.reply('Главное меню:', mainMenuKeyboard);
  });
};

module.exports = {
  setupCommands
}; 