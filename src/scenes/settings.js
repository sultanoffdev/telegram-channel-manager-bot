const { Scenes } = require('telegraf');
const { Markup } = require('telegraf');
const moment = require('moment-timezone');
const userSettingsService = require('../services/userSettingsService');

const settingsScene = new Scenes.WizardScene(
  'settings',
  // Шаг 1: Главное меню настроек
  async (ctx) => {
    try {
      const userId = ctx.from.id;
      const settings = await userSettingsService.getUserSettings(userId);
      const subscriptionInfo = await userSettingsService.getSubscriptionInfo(userId);
      const referralInfo = await userSettingsService.getReferralInfo(userId);
      
      const subscriptionStatus = subscriptionInfo.isActive 
        ? `Активна (${subscriptionInfo.type})\nДействует до: ${moment(subscriptionInfo.expiresAt).format('DD.MM.YYYY')}`
        : 'Неактивна';
      
      await ctx.reply(
        '⚙️ *Настройки пользователя*\n\n' +
        `🌍 Часовой пояс: *${settings.timezone}*\n` +
        `🌐 Язык: *${settings.language === 'ru' ? 'Русский' : 'English'}*\n` +
        `💎 Подписка: *${subscriptionStatus}*\n` +
        `🔗 Реферальный код: *${referralInfo.code}*\n` +
        `👥 Рефералы: *${referralInfo.referrals.length}*\n` +
        `💰 Бонусы: *${referralInfo.bonus}₽*\n\n` +
        'Выберите раздел для настройки:',
        {
          parse_mode: 'Markdown',
          ...Markup.keyboard([
            ['💎 Управление подпиской'],
            ['🔗 Реферальная программа'],
            ['🌍 Часовой пояс', '🌐 Язык'],
            ['🔙 Назад']
          ]).resize()
        }
      );
      
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка в сцене настроек (шаг 1):', error);
      await ctx.reply('Произошла ошибка при загрузке настроек. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  // Шаг 2: Обработка выбора раздела
  async (ctx) => {
    try {
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply('Пожалуйста, используйте кнопки для навигации.');
        return;
      }

      switch (ctx.message.text) {
        case '🔙 Назад':
          return ctx.scene.leave();
          
        case '💎 Управление подпиской':
          const userId = ctx.from.id;
          const subscriptionInfo = await userSettingsService.getSubscriptionInfo(userId);
          
          await ctx.reply(
            '💎 *Управление подпиской*\n\n' +
            `*Текущий статус:* ${subscriptionInfo.isActive ? '✅ Активна' : '❌ Неактивна'}\n` +
            `*Тип подписки:* ${subscriptionInfo.type || 'Базовая'}\n` +
            (subscriptionInfo.isActive ? 
              `*Действует до:* ${moment(subscriptionInfo.expiresAt).format('DD.MM.YYYY')}\n\n` : '\n') +
            '*Доступные варианты подписки:*\n' +
            '• Базовая (бесплатная)\n' +
            '• Стандарт (200₽/месяц) - до 5 каналов\n' +
            '• Премиум (500₽/месяц) - неограниченное число каналов\n\n' +
            '*Преимущества Premium-подписки:*\n' +
            '• Управление неограниченным числом каналов\n' +
            '• Расширенная аналитика\n' +
            '• Расширенные настройки защиты\n' +
            '• Премиум поддержка',
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('Стандарт (200₽/мес)', 'subscribe:standard'),
                  Markup.button.callback('Премиум (500₽/мес)', 'subscribe:premium')
                ],
                [
                  Markup.button.callback('Использовать промокод', 'use_promo')
                ],
                [
                  Markup.button.callback('🔙 Назад к настройкам', 'back_to_main')
                ]
              ])
            }
          );
          return ctx.wizard.next();
          
        case '🔗 Реферальная программа':
          const userIdRef = ctx.from.id;
          const referralInfo = await userSettingsService.getReferralInfo(userIdRef);
          
          await ctx.reply(
            '🔗 *Реферальная программа*\n\n' +
            `*Ваш промокод:* \`${referralInfo.code}\`\n` +
            `*Количество рефералов:* ${referralInfo.referrals.length}\n` +
            `*Заработано бонусов:* ${referralInfo.bonus}₽\n\n` +
            '*Как это работает:*\n' +
            '1. Поделитесь своим промокодом с друзьями\n' +
            '2. Когда они используют ваш промокод при покупке подписки\n' +
            '3. Вы получаете *10%* от суммы их покупки\n' +
            '4. Бонусы можно использовать для продления подписки\n\n' +
            '*Каждый, кто использует ваш промокод при покупке подписки, получает скидку 5%*',
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('🔑 Активировать промокод', 'referral_activate')
                ],
                [
                  Markup.button.callback('📊 Статистика рефералов', 'referral_stats')
                ],
                [
                  Markup.button.callback('📋 Подробнее о программе', 'referral_info')
                ],
                [
                  Markup.button.callback('🔙 Назад к настройкам', 'back_to_main')
                ]
              ])
            }
          );
          return ctx.wizard.next();
          
        case '🌍 Часовой пояс':
          await ctx.reply(
            '🌍 *Выбор часового пояса*\n\n' +
            'Выберите часовой пояс из списка или используйте поиск.\n' +
            'Правильный часовой пояс обеспечит корректное расписание публикаций.',
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('Europe/Moscow (+3)', 'timezone:Europe/Moscow'),
                  Markup.button.callback('Europe/London (+0)', 'timezone:Europe/London')
                ],
                [
                  Markup.button.callback('US/Eastern (-5)', 'timezone:America/New_York'),
                  Markup.button.callback('US/Pacific (-8)', 'timezone:America/Los_Angeles')
                ],
                [
                  Markup.button.callback('Asia/Tokyo (+9)', 'timezone:Asia/Tokyo'),
                  Markup.button.callback('Australia/Sydney (+11)', 'timezone:Australia/Sydney')
                ],
                [
                  Markup.button.callback('🔍 Поиск по городу', 'timezone_search')
                ],
                [
                  Markup.button.callback('🔙 Назад к настройкам', 'back_to_main')
                ]
              ])
            }
          );
          return ctx.wizard.next();
          
        case '🌐 Язык':
          await ctx.reply(
            '🌐 *Выбор языка интерфейса*\n\n' +
            'Выберите предпочитаемый язык интерфейса бота:',
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('🇷🇺 Русский', 'language:ru'),
                  Markup.button.callback('🇬🇧 English', 'language:en')
                ],
                [
                  Markup.button.callback('🔙 Назад к настройкам', 'back_to_main')
                ]
              ])
            }
          );
          return ctx.wizard.next();
          
        default:
          await ctx.reply('Пожалуйста, используйте кнопки для навигации.');
          return;
      }
    } catch (error) {
      console.error('Ошибка в сцене настроек (шаг 2):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  // Шаг 3: Обработка действий в разделах
  async (ctx) => {
    try {
      if (!ctx.callbackQuery && ctx.message?.text === '🔙 Назад') {
        return ctx.wizard.selectStep(0);
      }
      
      if (!ctx.callbackQuery) {
        await ctx.reply('Пожалуйста, используйте кнопки для навигации.');
        return;
      }

      const callbackData = ctx.callbackQuery.data;
      const userId = ctx.from.id;

      if (callbackData === 'back_to_main') {
        await ctx.answerCbQuery();
        return ctx.wizard.selectStep(0);
      } 
      
      if (callbackData.startsWith('timezone:')) {
        const timezone = callbackData.split(':')[1];
        try {
          await userSettingsService.updateTimezone(userId, timezone);
          await ctx.answerCbQuery('✅ Часовой пояс успешно обновлен');
          await ctx.reply(`✅ Часовой пояс изменен на ${timezone}`);
          return ctx.wizard.selectStep(0);
        } catch (error) {
          await ctx.answerCbQuery('❌ Ошибка при обновлении часового пояса');
          await ctx.reply('Произошла ошибка при обновлении часового пояса. Пожалуйста, попробуйте позже.');
        }
      } 
      
      if (callbackData.startsWith('language:')) {
        const language = callbackData.split(':')[1];
        try {
          await userSettingsService.updateLanguage(userId, language);
          const languageName = language === 'ru' ? 'Русский' : 'English';
          await ctx.answerCbQuery('✅ Язык успешно обновлен');
          await ctx.reply(`✅ Язык интерфейса изменен на ${languageName}`);
          return ctx.wizard.selectStep(0);
        } catch (error) {
          await ctx.answerCbQuery('❌ Ошибка при обновлении языка');
          await ctx.reply('Произошла ошибка при обновлении языка. Пожалуйста, попробуйте позже.');
        }
      } 
      
      if (callbackData.startsWith('subscribe:')) {
        const subscriptionType = callbackData.split(':')[1];
        
        // В реальной системе здесь должен быть процесс оплаты
        await ctx.answerCbQuery('🚧 Перенаправление на систему оплаты...');
        
        // Симуляция покупки подписки
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        
        await userSettingsService.updateSubscription(userId, subscriptionType, expiresAt);
        
        await ctx.reply(
          `✅ *Подписка "${subscriptionType}" успешно активирована!*\n\n` +
          `Действует до: ${moment(expiresAt).format('DD.MM.YYYY')}\n\n` +
          'Спасибо за поддержку проекта! Теперь вам доступны все функции бота.',
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['💎 Управление подпиской'],
              ['🔗 Реферальная программа'],
              ['🌍 Часовой пояс', '🌐 Язык'],
              ['🔙 Назад']
            ]).resize()
          }
        );
        
        return ctx.wizard.selectStep(0);
      } 
      
      if (callbackData === 'use_promo') {
        await ctx.answerCbQuery();
        await ctx.reply(
          '🔑 *Введите промокод*\n\n' +
          'Введите промокод для получения скидки на подписку:',
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['🔙 Назад']
            ]).resize()
          }
        );
        return ctx.wizard.selectStep(4);
      } 
      
      if (callbackData === 'referral_activate') {
        await ctx.answerCbQuery();
        await ctx.reply(
          '🔑 *Активация промокода*\n\n' +
          'Введите промокод, который вы хотите активировать:',
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['🔙 Назад']
            ]).resize()
          }
        );
        return ctx.wizard.selectStep(5);
      } 
      
      if (callbackData === 'referral_stats') {
        const referralInfo = await userSettingsService.getReferralInfo(userId);
        
        if (referralInfo.referrals.length === 0) {
          await ctx.answerCbQuery('У вас пока нет рефералов');
          await ctx.reply(
            '📊 *Статистика рефералов*\n\n' +
            'У вас пока нет рефералов. Поделитесь своим кодом с друзьями, чтобы начать зарабатывать бонусы!',
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('🔙 Назад к реферальной программе', 'back_to_referral')
                ]
              ])
            }
          );
        } else {
          await ctx.answerCbQuery();
          
          // Здесь можно добавить более подробную статистику по рефералам
          await ctx.reply(
            '📊 *Детальная статистика рефералов*\n\n' +
            `Всего рефералов: ${referralInfo.referrals.length}\n` +
            `Заработано бонусов: ${referralInfo.bonus}₽\n\n` +
            'Активность за последний месяц:\n' +
            `• Новых рефералов: ${Math.min(referralInfo.referrals.length, 3)}\n` +
            `• Заработано бонусов: ${Math.floor(referralInfo.bonus * 0.4)}₽`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('🔙 Назад к реферальной программе', 'back_to_referral')
                ]
              ])
            }
          );
        }
        return;
      } 
      
      if (callbackData === 'referral_info') {
        await ctx.answerCbQuery();
        await ctx.reply(
          '📋 *О реферальной программе*\n\n' +
          '*Как это работает:*\n' +
          '1. Вы получаете уникальный промокод\n' +
          '2. Вы делитесь этим кодом с друзьями\n' +
          '3. Когда друг использует ваш код при покупке подписки, ему предоставляется скидка 5%\n' +
          '4. Вы получаете 10% от суммы покупки в виде бонусов\n' +
          '5. Бонусы можно использовать для оплаты подписки\n\n' +
          '*Преимущества:*\n' +
          '• Нет ограничений на количество рефералов\n' +
          '• Бонусы начисляются мгновенно\n' +
          '• Программа действует на все типы подписок',
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback('🔙 Назад к реферальной программе', 'back_to_referral')
              ]
            ])
          }
        );
        return;
      } 
      
      if (callbackData === 'back_to_referral') {
        await ctx.answerCbQuery();
        ctx.message = { text: '🔗 Реферальная программа' };
        return ctx.wizard.selectStep(1);
      } 
      
      if (callbackData === 'timezone_search') {
        await ctx.answerCbQuery();
        await ctx.reply(
          '🔍 *Поиск часового пояса*\n\n' +
          'Введите название города для поиска часового пояса:',
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['🔙 Назад']
            ]).resize()
          }
        );
        return ctx.wizard.selectStep(6);
      }
      
      await ctx.answerCbQuery();
      await ctx.reply('Эта функция находится в разработке');
      
    } catch (error) {
      console.error('Ошибка в сцене настроек (шаг 3):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.wizard.selectStep(0);
    }
  },
  // Шаг 4: Обработка ввода промокода для скидки
  async (ctx) => {
    try {
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply('Пожалуйста, введите промокод или вернитесь назад.');
        return;
      }
      
      if (ctx.message.text === '🔙 Назад') {
        return ctx.wizard.selectStep(0);
      }
      
      const promoCode = ctx.message.text.trim().toUpperCase();
      
      // Здесь должна быть валидация промокода и расчет скидки
      // Для примера просто покажем ответ
      
      await ctx.reply(
        '✅ *Промокод принят!*\n\n' +
        `Промокод \`${promoCode}\` применен.\n` +
        'Вам предоставлена скидка 5% на подписку.\n\n' +
        'Выберите подписку для покупки со скидкой:',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('Стандарт (190₽/мес)', 'subscribe:standard'),
              Markup.button.callback('Премиум (475₽/мес)', 'subscribe:premium')
            ],
            [
              Markup.button.callback('🔙 Отмена', 'back_to_main')
            ]
          ])
        }
      );
      
      return ctx.wizard.selectStep(3);
    } catch (error) {
      console.error('Ошибка в сцене настроек (шаг 4):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.wizard.selectStep(0);
    }
  },
  // Шаг 5: Обработка ввода реферального кода
  async (ctx) => {
    try {
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply('Пожалуйста, введите промокод или вернитесь назад.');
        return;
      }
      
      if (ctx.message.text === '🔙 Назад') {
        return ctx.wizard.selectStep(0);
      }
      
      const userId = ctx.from.id;
      const promoCode = ctx.message.text.trim().toUpperCase();
      
      try {
        await userSettingsService.activateReferralCode(userId, promoCode);
        await ctx.reply(
          '✅ *Промокод успешно активирован!*\n\n' +
          'При следующей покупке подписки вам будет предоставлена скидка 5%.\n' +
          'Владелец промокода получит 10% от суммы вашей покупки в виде бонусов.',
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['💎 Управление подпиской'],
              ['🔗 Реферальная программа'],
              ['🌍 Часовой пояс', '🌐 Язык'],
              ['🔙 Назад']
            ]).resize()
          }
        );
      } catch (error) {
        await ctx.reply(
          '❌ *Ошибка активации промокода*\n\n' +
          'Возможные причины:\n' +
          '• Недействительный промокод\n' +
          '• Вы уже активировали промокод\n' +
          '• Нельзя использовать свой собственный промокод',
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['🔙 Назад']
            ]).resize()
          }
        );
      }
      
      return ctx.wizard.selectStep(0);
    } catch (error) {
      console.error('Ошибка в сцене настроек (шаг 5):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.wizard.selectStep(0);
    }
  },
  // Шаг 6: Обработка поиска часового пояса
  async (ctx) => {
    try {
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply('Пожалуйста, введите название города или вернитесь назад.');
        return;
      }
      
      if (ctx.message.text === '🔙 Назад') {
        return ctx.wizard.selectStep(0);
      }
      
      const searchQuery = ctx.message.text.toLowerCase();
      const timezones = moment.tz.names();
      const matches = timezones.filter(tz => 
        tz.toLowerCase().includes(searchQuery)
      );
      
      if (matches.length === 0) {
        await ctx.reply(
          '❌ *Не найдено подходящих часовых поясов*\n\n' +
          'Попробуйте ввести другое название города или региона:',
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['🔙 Назад']
            ]).resize()
          }
        );
        return;
      }
      
      // Ограничиваем результаты до 8, чтобы не перегружать интерфейс
      const limitedMatches = matches.slice(0, 8);
      
      // Группируем кнопки по 2 в ряд
      const buttons = [];
      for (let i = 0; i < limitedMatches.length; i += 2) {
        const row = [];
        row.push(Markup.button.callback(limitedMatches[i], `timezone:${limitedMatches[i]}`));
        
        if (i + 1 < limitedMatches.length) {
          row.push(Markup.button.callback(limitedMatches[i + 1], `timezone:${limitedMatches[i + 1]}`));
        }
        
        buttons.push(row);
      }
      
      buttons.push([Markup.button.callback('🔙 Назад к часовым поясам', 'back_to_timezone')]);
      
      await ctx.reply(
        '🔍 *Результаты поиска часовых поясов*\n\n' +
        'Выберите подходящий часовой пояс из списка:',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(buttons)
        }
      );
      
      return ctx.wizard.selectStep(3);
    } catch (error) {
      console.error('Ошибка в сцене настроек (шаг 6):', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.wizard.selectStep(0);
    }
  }
);

// Обработчики действий
settingsScene.action(/timezone:(.+)/, (ctx) => ctx.wizard.selectStep(3));
settingsScene.action(/language:(.+)/, (ctx) => ctx.wizard.selectStep(3));
settingsScene.action(/subscribe:(.+)/, (ctx) => ctx.wizard.selectStep(3));
settingsScene.action('back_to_main', (ctx) => ctx.wizard.selectStep(0));
settingsScene.action('back_to_referral', (ctx) => ctx.wizard.selectStep(1));
settingsScene.action('back_to_timezone', (ctx) => {
  ctx.message = { text: '🌍 Часовой пояс' };
  return ctx.wizard.selectStep(1);
});

module.exports = settingsScene; 