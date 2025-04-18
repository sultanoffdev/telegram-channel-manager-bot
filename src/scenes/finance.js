const { Scenes } = require('telegraf');
const { Markup } = require('telegraf');

const financeScene = new Scenes.WizardScene(
  'finance',
  // Шаг 1: Отображение главного меню финансов
  async (ctx) => {
    try {
      // Отправляем основное меню
      await ctx.reply(
        '💵 *Финансы*\n\n' +
        'Этот раздел находится в разработке. Здесь будут доступны финансовые инструменты для управления вашими рекламными бюджетами, доходами от постов и аналитика расходов.\n\n' +
        'Планируемый функционал:\n' +
        '- Учет доходов от рекламы\n' +
        '- Учет расходов на рекламу\n' +
        '- Статистика и аналитика\n' +
        '- Экспорт финансовых отчетов\n' +
        '- Подключение платежных систем',
        {
          parse_mode: 'Markdown',
          ...Markup.keyboard([
            ['💰 Доходы', '💸 Расходы'],
            ['📊 Статистика', '📋 Отчеты'],
            ['🔙 Назад']
          ]).resize()
        }
      );
      
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка в сцене финансов (шаг 1):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  
  // Шаг 2: Обработка выбора из меню
  async (ctx) => {
    try {
      // Обрабатываем нажатия кнопок
      if (ctx.message && ctx.message.text) {
        switch (ctx.message.text) {
          case '🔙 Назад':
            return ctx.scene.leave();
            
          case '💰 Доходы':
          case '💸 Расходы':
          case '📊 Статистика':
          case '📋 Отчеты':
            await ctx.reply(
              '🚧 *Раздел в разработке*\n\n' +
              'Этот функционал появится в ближайшем обновлении. Наши разработчики усердно работают над реализацией этой возможности.',
              {
                parse_mode: 'Markdown',
                ...Markup.keyboard([
                  ['🔙 К финансам']
                ]).resize()
              }
            );
            
            return ctx.wizard.next();
          
          default:
            await ctx.reply('Пожалуйста, используйте кнопки для навигации.');
            return;
        }
      }
    } catch (error) {
      console.error('Ошибка в сцене финансов (шаг 2):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  
  // Шаг 3: Возврат в основное меню финансов
  async (ctx) => {
    try {
      if (ctx.message && ctx.message.text === '🔙 К финансам') {
        // Возвращаемся на первый шаг
        return ctx.wizard.selectStep(0);
      }
      
      await ctx.reply('Пожалуйста, используйте кнопки для навигации.');
      return;
    } catch (error) {
      console.error('Ошибка в сцене финансов (шаг 3):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  }
);

module.exports = financeScene; 