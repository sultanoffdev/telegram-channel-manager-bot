const { Scenes } = require('telegraf');
const { Markup } = require('telegraf');
const moment = require('moment-timezone');
const protectionService = require('../services/protectionService');
const channelService = require('../services/channelService');

const protectionScene = new Scenes.WizardScene(
  'protection',
  // Шаг 1: Главное меню защиты и приёма
  async (ctx) => {
    try {
      await ctx.reply(
        '🛡 *Защита и Приём*\n\n' +
        '🗣 *Своими словами:*\n' +
        'Защита это - такие настройки бота, благодаря которым он защищает канал от ' +
        'накрутки ботов и просмотров.\n\n' +
        'Приём это - бот будет автоматически принимать в канал подписчиков.\n\n' +
        '*Принцип работы:*\n' +
        'Защита - на стадии планирования.\n' +
        'Приём - вы выбираете таймер приёма, и после этого бот автоматически принимает все заявки на вступление.',
        {
          parse_mode: 'Markdown',
          ...Markup.keyboard([
            ['🛡 Настроить защиту', '🔐 Настроить приём'],
            ['🔙 Назад']
          ]).resize()
        }
      );
      
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка в сцене защиты (шаг 1):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  
  // Шаг 2: Выбор раздела или возврат в главное меню
  async (ctx) => {
    try {
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply('Пожалуйста, используйте кнопки для навигации.');
        return;
      }
      
      switch (ctx.message.text) {
        case '🔙 Назад':
          return ctx.scene.leave();
          
        case '🛡 Настроить защиту':
          await ctx.reply(
            '🛡 *Настройка защиты каналов*\n\n' +
            'Функция находится в разработке и будет доступна в ближайшем обновлении.\n\n' +
            'Планируемые возможности:\n' +
            '• Обнаружение ботов и накрутки\n' +
            '• Защита от спама\n' +
            '• Мониторинг подозрительной активности\n' +
            '• Фильтрация вредоносного контента',
            {
              parse_mode: 'Markdown',
              ...Markup.keyboard([
                ['🔙 К защите и приёму']
              ]).resize()
            }
          );
          return ctx.wizard.next();
          
        case '🔐 Настроить приём':
          const userId = ctx.from.id;
          const channels = await channelService.getUserChannels(userId);
          
          if (!channels || channels.length === 0) {
            await ctx.reply(
              'У вас нет доступных каналов. Сначала добавьте канал в разделе "Мои каналы".',
              {
                ...Markup.keyboard([
                  ['🔙 К защите и приёму']
                ]).resize()
              }
            );
            return ctx.wizard.next();
          }
          
          ctx.wizard.state.channels = channels;
          
          await ctx.reply(
            '🔐 *Настройка автоматического приёма*\n\n' +
            'Выберите канал для настройки автоматического приёма заявок:',
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard(
                channels.map(channel => ([
                  Markup.button.callback(channel.title, `select_channel:${channel.channelId}`)
                ]))
              )
            }
          );
          return ctx.wizard.selectStep(3);
          
        default:
          await ctx.reply('Пожалуйста, используйте кнопки для навигации.');
          return;
      }
    } catch (error) {
      console.error('Ошибка в сцене защиты (шаг 2):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  
  // Шаг 3: Возврат в главное меню из подразделов
  async (ctx) => {
    try {
      if (ctx.message && ctx.message.text === '🔙 К защите и приёму') {
        return ctx.wizard.selectStep(0);
      }
      
      await ctx.reply('Пожалуйста, используйте кнопки для навигации.');
      return;
    } catch (error) {
      console.error('Ошибка в сцене защиты (шаг 3):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  
  // Шаг 4: Настройка автоприёма для выбранного канала
  async (ctx) => {
    try {
      if (ctx.callbackQuery) {
        const callbackData = ctx.callbackQuery.data;
        
        if (callbackData.startsWith('select_channel:')) {
          const channelId = callbackData.split(':')[1];
          const userId = ctx.from.id;
          ctx.wizard.state.channelId = channelId;
          
          // Получаем текущие настройки
          const settings = await protectionService.getSettings(userId, channelId);
          
          // Отображаем настройки таймера автоприёма
          await ctx.answerCbQuery();
          await ctx.reply(
            '⏱ *Настройка таймера автоприёма*\n\n' +
            'Выберите время, через которое бот будет автоматически принимать заявки на вступление в канал:',
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('5 мин', 'set_timer:5'),
                  Markup.button.callback('15 мин', 'set_timer:15'),
                  Markup.button.callback('30 мин', 'set_timer:30')
                ],
                [
                  Markup.button.callback('1 час', 'set_timer:60'),
                  Markup.button.callback('2 часа', 'set_timer:120'),
                  Markup.button.callback('4 часа', 'set_timer:240')
                ],
                [
                  Markup.button.callback('Отключить автоприём', 'set_timer:0')
                ]
              ])
            }
          );
          return ctx.wizard.next();
        }
      }
      
      await ctx.reply('Пожалуйста, выберите канал из списка.', {
        ...Markup.keyboard([
          ['🔙 К защите и приёму']
        ]).resize()
      });
      return ctx.wizard.selectStep(3);
    } catch (error) {
      console.error('Ошибка в сцене защиты (шаг 4):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  
  // Шаг 5: Установка таймера автоприёма
  async (ctx) => {
    try {
      if (ctx.callbackQuery) {
        const callbackData = ctx.callbackQuery.data;
        
        if (callbackData.startsWith('set_timer:')) {
          const timer = parseInt(callbackData.split(':')[1]);
          const userId = ctx.from.id;
          const channelId = ctx.wizard.state.channelId;
          
          // Обновляем настройки таймера
          await protectionService.updateAutoApprovalTimer(userId, channelId, timer);
          
          let successMessage;
          if (timer === 0) {
            successMessage = '✅ Автоматический приём заявок отключен.';
          } else {
            let timerText = '';
            if (timer < 60) {
              timerText = `${timer} минут`;
            } else {
              timerText = `${timer / 60} час(ов)`;
            }
            successMessage = `✅ Таймер автоприёма установлен на ${timerText}.\n\nБот будет автоматически принимать заявки на вступление в канал через указанное время.`;
          }
          
          await ctx.answerCbQuery('Настройки сохранены');
          await ctx.reply(successMessage, {
            ...Markup.keyboard([
              ['🔙 К защите и приёму']
            ]).resize()
          });
          
          // Активируем прием заявок в канале (имитация)
          if (timer > 0) {
            await ctx.reply(
              '🔐 *Автоприём активирован*\n\n' +
              `Бот теперь будет автоматически принимать заявки на вступление в канал через ${timer < 60 ? `${timer} минут` : `${timer / 60} час(ов)`}.`,
              { parse_mode: 'Markdown' }
            );
          }
          
          return ctx.wizard.selectStep(3);
        }
      }
      
      await ctx.reply('Пожалуйста, выберите время из предложенных вариантов.', {
        ...Markup.keyboard([
          ['🔙 К защите и приёму']
        ]).resize()
      });
      return;
    } catch (error) {
      console.error('Ошибка в сцене защиты (шаг 5):', error);
      await ctx.reply('Произошла ошибка при сохранении настроек. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  }
);

// Обработчики действий
protectionScene.action(/select_channel:(.+)/, (ctx) => {
  // Обрабатывается в шаге 4
  return;
});

protectionScene.action(/set_timer:(.+)/, (ctx) => {
  // Обрабатывается в шаге 5
  return;
});

module.exports = protectionScene; 