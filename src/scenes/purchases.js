const { Scenes } = require('telegraf');
const { Markup } = require('telegraf');
const purchaseService = require('../services/purchaseService');
const adPostService = require('../services/adPostService');
const channelService = require('../services/channelService');

const purchasesScene = new Scenes.WizardScene(
  'purchases',
  // Шаг 1: Выбор действия
  async (ctx) => {
    await ctx.reply(
      '📍 Управление закупами рекламы\n\n' +
      'Выберите действие:',
      Markup.keyboard([
        ['📝 Создать закуп', '📋 Мои закупы'],
        ['📊 Анализ трафика', '🔙 Назад']
      ]).resize()
    );
    return ctx.wizard.next();
  },
  // Шаг 2: Обработка выбора действия
  async (ctx) => {
    if (ctx.message.text === '🔙 Назад') {
      return ctx.scene.leave();
    }

    if (ctx.message.text === '📝 Создать закуп') {
      try {
        const channels = await channelService.getUserChannels(ctx.from.id);
        
        if (!channels || channels.length === 0) {
          await ctx.reply(
            'У вас пока нет добавленных каналов. Добавьте канал в разделе "Мои каналы"',
            Markup.keyboard([['🔙 Назад']]).resize()
          );
          return ctx.scene.leave();
        }

        // Создаем клавиатуру с каналами и опцией "Выбрать несколько"
        const keyboard = [
          ...channels.map(channel => [Markup.button.callback(channel.title, `channel_${channel.id}`)]),
          [Markup.button.callback('📢 Выбрать несколько каналов', 'select_multiple')]
        ];

        await ctx.reply(
          '1️⃣ Выберите канал или сеть каналов для размещения рекламы:',
          Markup.inlineKeyboard(keyboard)
        );
        ctx.session.purchaseType = 'new';
        return ctx.wizard.next();
      } catch (error) {
        console.error('Error creating purchase:', error);
        await ctx.reply('Произошла ошибка при создании закупа. Попробуйте позже.');
        return ctx.scene.leave();
      }
    }

    if (ctx.message.text === '📋 Мои закупы') {
      try {
        const purchases = await purchaseService.getUserPurchases(ctx.from.id);

        if (!purchases || purchases.length === 0) {
          await ctx.reply('У вас пока нет созданных закупов.');
          return ctx.wizard.selectStep(0);
        }

        const keyboard = purchases.map(purchase => {
          const date = new Date(purchase.createdAt);
          const dateStr = date.toLocaleString('ru-RU');
          const statusEmoji = getStatusEmoji(purchase.status);
          return [Markup.button.callback(`${dateStr} ${statusEmoji} ${purchase.channels.map(c => c.title).join(', ')}`, `view_purchase_${purchase._id}`)];
        });

        await ctx.reply(
          'Выберите закуп для просмотра:',
          Markup.inlineKeyboard(keyboard)
        );
        ctx.session.purchaseType = 'view';
        return ctx.wizard.next();
      } catch (error) {
        console.error('Error fetching purchases:', error);
        await ctx.reply('Произошла ошибка при получении списка закупов. Попробуйте позже.');
        return ctx.scene.leave();
      }
    }

    if (ctx.message.text === '📊 Анализ трафика') {
      try {
        const purchases = await purchaseService.getUserPurchases(ctx.from.id);
        const activePurchases = purchases.filter(p => p.status === 'active' || p.status === 'completed');

        if (!activePurchases || activePurchases.length === 0) {
          await ctx.reply('У вас нет активных или завершенных закупов для анализа трафика.');
          return ctx.wizard.selectStep(0);
        }

        const keyboard = activePurchases.map(purchase => {
          const date = new Date(purchase.createdAt);
          const dateStr = date.toLocaleString('ru-RU');
          return [Markup.button.callback(`${dateStr} - ${purchase.channels.map(c => c.title).join(', ')}`, `analyze_purchase_${purchase._id}`)];
        });

        await ctx.reply(
          'Выберите закуп для анализа трафика:',
          Markup.inlineKeyboard(keyboard)
        );
        ctx.session.purchaseType = 'analyze';
        return ctx.wizard.next();
      } catch (error) {
        console.error('Error fetching purchases for analysis:', error);
        await ctx.reply('Произошла ошибка при получении списка закупов. Попробуйте позже.');
        return ctx.scene.leave();
      }
    }

    await ctx.reply('Пожалуйста, выберите действие из меню.');
    return ctx.wizard.selectStep(0);
  },
  // Шаг 3: Выбор каналов или просмотр закупа
  async (ctx) => {
    if (ctx.session.purchaseType === 'new') {
      if (ctx.callbackQuery) {
        if (ctx.callbackQuery.data === 'select_multiple') {
          try {
            const channels = await channelService.getUserChannels(ctx.from.id);
            
            const keyboard = channels.map(channel => [
              Markup.button.callback(
                channel.title + (ctx.session.selectedChannels?.includes(channel.id) ? ' ✅' : ''),
                `toggle_${channel.id}`
              )
            ]);
            keyboard.push([Markup.button.callback('✅ Подтвердить выбор', 'confirm_channels')]);

            await ctx.editMessageText(
              '1️⃣ Выберите каналы для размещения рекламы:',
              Markup.inlineKeyboard(keyboard)
            );
            return;
          } catch (error) {
            console.error('Error selecting multiple channels:', error);
            await ctx.reply('Произошла ошибка при выборе каналов. Попробуйте позже.');
            return ctx.wizard.selectStep(0);
          }
        }

        if (ctx.callbackQuery.data === 'confirm_channels') {
          if (!ctx.session.selectedChannels?.length) {
            await ctx.reply('Пожалуйста, выберите хотя бы один канал.');
            return;
          }
        } else if (ctx.callbackQuery.data.startsWith('toggle_')) {
          const channelId = ctx.callbackQuery.data.replace('toggle_', '');
          ctx.session.selectedChannels = ctx.session.selectedChannels || [];
          
          const index = ctx.session.selectedChannels.indexOf(channelId);
          if (index === -1) {
            ctx.session.selectedChannels.push(channelId);
          } else {
            ctx.session.selectedChannels.splice(index, 1);
          }

          try {
            const channels = await channelService.getUserChannels(ctx.from.id);
            
            const keyboard = channels.map(channel => [
              Markup.button.callback(
                channel.title + (ctx.session.selectedChannels.includes(channel.id) ? ' ✅' : ''),
                `toggle_${channel.id}`
              )
            ]);
            keyboard.push([Markup.button.callback('✅ Подтвердить выбор', 'confirm_channels')]);

            await ctx.editMessageText(
              '1️⃣ Выберите каналы для размещения рекламы:',
              Markup.inlineKeyboard(keyboard)
            );
            return;
          } catch (error) {
            console.error('Error toggling channel selection:', error);
            await ctx.reply('Произошла ошибка при выборе каналов. Попробуйте позже.');
            return ctx.wizard.selectStep(0);
          }
        } else {
          ctx.session.selectedChannels = [ctx.callbackQuery.data.replace('channel_', '')];
        }

        try {
          // Получаем сохраненные рекламные посты
          const adPosts = await adPostService.getUserAdPosts(ctx.from.id);
          
          const keyboard = [
            [Markup.button.callback('📝 Создать новый рекламный пост', 'new_post')]
          ];
          
          if (adPosts && adPosts.length > 0) {
            keyboard.push([Markup.button.callback('📋 Выбрать из сохраненных', 'select_saved_post')]);
          }

          await ctx.reply(
            '2️⃣ Выберите рекламный пост:',
            Markup.inlineKeyboard(keyboard)
          );
          return ctx.wizard.next();
        } catch (error) {
          console.error('Error fetching ad posts:', error);
          await ctx.reply('Произошла ошибка при получении рекламных постов. Попробуйте позже.');
          return ctx.wizard.selectStep(0);
        }
      }
    } else if (ctx.session.purchaseType === 'view' || ctx.session.purchaseType === 'analyze') {
      if (ctx.callbackQuery) {
        const isAnalysis = ctx.session.purchaseType === 'analyze';
        const purchaseId = ctx.callbackQuery.data.replace(isAnalysis ? 'analyze_purchase_' : 'view_purchase_', '');
        
        try {
          const purchase = await purchaseService.getPurchaseById(purchaseId, ctx.from.id);
          
          if (!purchase) {
            await ctx.reply('Закуп не найден.');
            return ctx.wizard.selectStep(0);
          }

          // Сохраняем ID закупа для дальнейших действий
          ctx.session.currentPurchaseId = purchaseId;

          // Получаем данные о трафике
          const trafficData = purchase.trafficData || {
            visits: 0,
            uniqueVisitors: 0,
            avgTimeOnSite: '0:00',
            conversion: 0,
            sources: [],
            geoData: {},
            devices: {}
          };
          
          let message = '';
          
          if (isAnalysis) {
            message = 
              `📊 <b>Анализ трафика по закупу</b>\n\n` +
              `📅 Дата создания: ${new Date(purchase.createdAt).toLocaleString('ru-RU')}\n` +
              `📢 Каналы: ${purchase.channels.map(c => c.title).join(', ')}\n` +
              `💰 Стоимость: ${purchase.price} руб.\n` +
              `⏱ Срок размещения: ${purchase.duration} дней\n` +
              `🔗 Ссылка отслеживания: ${purchase.trackingLink}\n\n` +
              `📈 <b>Статистика трафика:</b>\n` +
              `👁 Всего просмотров: ${trafficData.visits}\n` +
              `👤 Уникальных посетителей: ${trafficData.uniqueVisitors}\n` +
              `⏱ Среднее время на сайте: ${trafficData.avgTimeOnSite}\n` +
              `🔄 Конверсия: ${trafficData.conversion}%\n\n`;
              
            // Добавляем географию посетителей
            message += `🌍 <b>География посетителей:</b>\n`;
            const geoEntries = Object.entries(trafficData.geoData || {});
            if (geoEntries.length > 0) {
              geoEntries
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .forEach(([country, count]) => {
                  message += `- ${country}: ${count} (${Math.round(count / trafficData.visits * 100)}%)\n`;
                });
            } else {
              message += `- Нет данных\n`;
            }
            
            message += `\n📱 <b>Устройства:</b>\n`;
            const deviceEntries = Object.entries(trafficData.devices || {});
            if (deviceEntries.length > 0) {
              deviceEntries
                .sort((a, b) => b[1] - a[1])
                .forEach(([device, count]) => {
                  message += `- ${device}: ${count} (${Math.round(count / trafficData.visits * 100)}%)\n`;
                });
            } else {
              message += `- Нет данных\n`;
            }
            
            message += `\n📉 <b>Эффективность закупа:</b>\n`;
            message += `- Стоимость за просмотр: ${trafficData.visits > 0 ? (purchase.price / trafficData.visits).toFixed(2) : 0} руб.\n`;
            message += `- Стоимость за уникального посетителя: ${trafficData.uniqueVisitors > 0 ? (purchase.price / trafficData.uniqueVisitors).toFixed(2) : 0} руб.\n`;
            message += `- Стоимость за конверсию: ${(trafficData.visits * trafficData.conversion / 100) > 0 ? (purchase.price / (trafficData.visits * trafficData.conversion / 100)).toFixed(2) : 0} руб.\n`;
          } else {
            message = 
              `📊 <b>Информация о закупе</b>\n\n` +
              `📅 Дата создания: ${new Date(purchase.createdAt).toLocaleString('ru-RU')}\n` +
              `📢 Каналы: ${purchase.channels.map(c => c.title).join(', ')}\n` +
              `💰 Стоимость: ${purchase.price} руб.\n` +
              `⏱ Срок размещения: ${purchase.duration} дней\n` +
              `📊 Статус: ${getStatusText(purchase.status)}\n`;
              
            if (purchase.additionalConditions) {
              message += `📝 Дополнительные условия: ${purchase.additionalConditions}\n`;
            }
            
            message += `\n🔗 Ссылка отслеживания: ${purchase.trackingLink}\n\n`;
            
            message += 
              `📈 <b>Краткая статистика:</b>\n` +
              `👁 Просмотров: ${trafficData.visits}\n` +
              `👤 Уникальных посетителей: ${trafficData.uniqueVisitors}\n` +
              `🔄 Конверсия: ${trafficData.conversion}%\n`;
          }
          
          await ctx.reply(message, { parse_mode: 'HTML' });
          
          const keyboard = [
            ['📊 Обновить статистику'],
            ['📊 Подробный анализ', '📤 Экспорт отчета'],
            ['🔙 Назад']
          ];
          
          await ctx.reply('Выберите действие:', 
            Markup.keyboard(keyboard).resize()
          );
          return ctx.wizard.next();
        } catch (error) {
          console.error('Error viewing purchase:', error);
          await ctx.reply('Произошла ошибка при просмотре закупа. Попробуйте позже.');
          return ctx.wizard.selectStep(0);
        }
      }
    }

    await ctx.reply('Пожалуйста, выберите канал или действие.');
    return ctx.wizard.selectStep(1);
  },
  // Шаг 4: Выбор или создание рекламного поста
  async (ctx) => {
    if (ctx.callbackQuery) {
      if (ctx.callbackQuery.data === 'new_post') {
        await ctx.reply(
          'Отправьте рекламный пост (текст, фото, видео или их комбинацию)'
        );
        ctx.session.postType = 'new';
        return ctx.wizard.next();
      }
      
      if (ctx.callbackQuery.data === 'select_saved_post') {
        const adPosts = await AdPost.find({ userId: ctx.from.id });
        
        const keyboard = adPosts.map(post => [
          Markup.button.callback(
            post.title || 'Без названия',
            `select_post_${post._id}`
          )
        ]);
        
        await ctx.editMessageText(
          'Выберите сохраненный рекламный пост:',
          Markup.inlineKeyboard(keyboard)
        );
        return;
      }
      
      if (ctx.callbackQuery.data.startsWith('select_post_')) {
        const postId = ctx.callbackQuery.data.replace('select_post_', '');
        const post = await AdPost.findById(postId);
        
        if (!post) {
          await ctx.reply('Пост не найден.');
          return ctx.wizard.selectStep(1);
        }
        
        ctx.session.selectedPost = post;
        
        // Показываем настройки закупа
        await ctx.reply(
          '3️⃣ Настройка условий размещения:\n\n' +
          'Укажите стоимость размещения (в рублях):'
        );
        return ctx.wizard.next();
      }
    }
    
    if (ctx.message && ctx.session.postType === 'new') {
      // Сохраняем новый пост
      const newPost = new AdPost({
        userId: ctx.from.id,
        content: ctx.message,
        title: 'Новый пост'
      });
      
      await newPost.save();
      ctx.session.selectedPost = newPost;
      
      // Показываем настройки закупа
      await ctx.reply(
        '3️⃣ Настройка условий размещения:\n\n' +
        'Укажите стоимость размещения (в рублях):'
      );
      return ctx.wizard.next();
    }
    
    await ctx.reply('Пожалуйста, выберите или создайте рекламный пост.');
    return ctx.wizard.selectStep(2);
  },
  // Шаг 5: Настройка условий размещения
  async (ctx) => {
    if (ctx.message.text && !isNaN(ctx.message.text)) {
      ctx.session.price = parseInt(ctx.message.text);
      
      await ctx.reply(
        'Укажите срок размещения (в днях):'
      );
      return ctx.wizard.next();
    }
    
    await ctx.reply('Пожалуйста, укажите корректную стоимость размещения (число).');
    return ctx.wizard.selectStep(3);
  },
  // Шаг 6: Указание срока размещения
  async (ctx) => {
    if (ctx.message.text && !isNaN(ctx.message.text)) {
      ctx.session.duration = parseInt(ctx.message.text);
      
      await ctx.reply(
        'Укажите дополнительные условия размещения (или отправьте "нет"):'
      );
      return ctx.wizard.next();
    }
    
    await ctx.reply('Пожалуйста, укажите корректный срок размещения (число дней).');
    return ctx.wizard.selectStep(4);
  },
  // Шаг 7: Дополнительные условия
  async (ctx) => {
    ctx.session.additionalConditions = ctx.message.text === 'нет' ? '' : ctx.message.text;
    
    // Генерируем ссылку для отслеживания
    const trackingLink = generateTrackingLink(ctx.from.id);
    
    try {
      // Создаем закуп
      const selectedChannels = await getSelectedChannels(ctx);
      
      const purchaseData = {
        userId: ctx.from.id,
        channels: selectedChannels,
        adPost: ctx.session.selectedPost._id,
        price: ctx.session.price,
        duration: ctx.session.duration,
        additionalConditions: ctx.session.additionalConditions,
        trackingLink: trackingLink,
        status: 'pending'
      };
      
      const purchase = await purchaseService.createPurchase(purchaseData);
      
      // Генерируем квитанцию
      const receipt = generateReceipt(purchase, selectedChannels, ctx.session.selectedPost);
      
      // Генерируем рекламный пост
      const adMessage = generateAdMessage(ctx.session.selectedPost, trackingLink);
      
      // Отправляем квитанцию
      await ctx.reply(
        '<b>✅ Закуп успешно создан!</b>\n\n' +
        '<b>📝 Квитанция (переслать администратору):</b>\n' +
        '-------------------\n' +
        receipt +
        '-------------------\n',
        { parse_mode: 'HTML' }
      );
      
      // Отправляем рекламный пост
      await ctx.reply(
        '<b>📢 Рекламный пост (переслать администратору):</b>\n' +
        '-------------------\n' +
        adMessage +
        '-------------------\n',
        { parse_mode: 'HTML' }
      );
      
      await ctx.reply(
        'Пожалуйста, перешлите оба сообщения (квитанцию и рекламный пост) администратору канала для размещения.',
        Markup.keyboard([
          ['🔄 Создать еще закуп'],
          ['📊 Анализ трафика'],
          ['🔙 Назад']
        ]).resize()
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error('Error creating purchase:', error);
      await ctx.reply('Произошла ошибка при создании закупа. Попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  // Шаг 8: Обработка выбора действия
  async (ctx) => {
    if (ctx.message.text === '🔙 Назад') {
      return ctx.scene.leave();
    } else if (ctx.message.text === '🔄 Создать еще закуп') {
      return ctx.wizard.selectStep(0);
    } else {
      return ctx.scene.leave();
    }
  }
);

// Вспомогательные функции

/**
 * Получает выбранные каналы пользователя
 * @param {Object} ctx - Context объект
 * @returns {Promise<Array>} - Массив объектов каналов
 */
async function getSelectedChannels(ctx) {
  try {
    const channels = await channelService.getUserChannels(ctx.from.id);
    return channels
      .filter(channel => ctx.session.selectedChannels.includes(channel.id))
      .map(channel => ({
        id: channel.id,
        title: channel.title
      }));
  } catch (error) {
    console.error('Error getting selected channels:', error);
    return [];
  }
}

// Функция для получения данных о трафике
async function getTrafficData(trackingLink) {
  try {
    // Здесь будет логика получения данных о трафике
    // Это заглушка, которую нужно заменить реальным API-запросом
    
    // Генерируем случайные данные для демонстрации
    const visits = Math.floor(Math.random() * 1000) + 50;
    const uniqueVisitors = Math.floor(visits * (0.7 + Math.random() * 0.2)); // 70-90% от просмотров
    const conversionRate = (Math.random() * 5).toFixed(2); // 0-5%
    
    // Случайное распределение по странам
    const countries = ['Россия', 'Украина', 'Беларусь', 'Казахстан', 'США', 'Германия'];
    const geoData = {};
    let remainingVisits = visits;
    
    for (let i = 0; i < countries.length - 1; i++) {
      const countryShare = i === 0 ? 
        Math.floor(remainingVisits * (0.5 + Math.random() * 0.3)) : // Первая страна получает 50-80%
        Math.floor(remainingVisits * Math.random() * 0.5); // Остальные получают случайную долю
      
      geoData[countries[i]] = countryShare;
      remainingVisits -= countryShare;
    }
    
    // Последняя страна получает оставшиеся визиты
    geoData[countries[countries.length - 1]] = remainingVisits;
    
    // Распределение по устройствам
    const devices = {
      'Мобильные': Math.floor(visits * (0.6 + Math.random() * 0.2)),
      'Десктоп': Math.floor(visits * (0.2 + Math.random() * 0.2)),
    };
    devices['Планшеты'] = visits - devices['Мобильные'] - devices['Десктоп'];
    
    // Создаем объект с данными о трафике
    return {
      visits,
      uniqueVisitors,
      avgTimeOnSite: `${Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      conversion: conversionRate,
      sources: [
        { name: 'Прямые переходы', count: Math.floor(uniqueVisitors * 0.7) },
        { name: 'Telegram', count: Math.floor(uniqueVisitors * 0.3) }
      ],
      geoData,
      devices
    };
  } catch (error) {
    console.error('Ошибка при получении данных о трафике:', error);
    return null;
  }
}

// Функция для генерации ссылки для отслеживания
function generateTrackingLink(userId) {
  // Генерируем уникальную ссылку для отслеживания
  const randomString = Math.random().toString(36).substring(2, 10);
  return `https://t.me/your_bot_username?start=track_${userId}_${randomString}`;
}

// Функция для генерации квитанции
function generateReceipt(purchase, channels, post) {
  const date = new Date(purchase.createdAt || Date.now()).toLocaleString('ru-RU');
  
  let receipt = 
    `📅 <b>Дата:</b> ${date}\n` +
    `📢 <b>Каналы:</b> ${channels.map(c => c.title).join(', ')}\n` +
    `💰 <b>Стоимость:</b> ${purchase.price} руб.\n` +
    `⏱ <b>Срок размещения:</b> ${purchase.duration} дней\n`;
  
  if (purchase.additionalConditions) {
    receipt += `📝 <b>Дополнительные условия:</b> ${purchase.additionalConditions}\n`;
  }
  
  receipt += `🔗 <b>Ссылка для отслеживания:</b> ${purchase.trackingLink}\n`;
  
  receipt += `\n<b>ID закупа для подтверждения:</b> ${purchase._id}\n`;
  
  return receipt;
}

// Функция для генерации рекламного поста
function generateAdMessage(post, trackingLink) {
  let message = '';
  
  // Добавляем содержимое поста
  if (post.content) {
    message += post.content + '\n\n';
  }
  
  // Добавляем информацию о медиафайлах, если есть
  if (post.mediaInfo) {
    message += `<i>Пост содержит медиа-файлы</i>\n\n`;
  }
  
  // Добавляем ссылку для отслеживания
  message += `🔗 <a href="${trackingLink}">Подробнее</a>`;
  
  return message;
}

// Функция для получения emoji статуса закупа
function getStatusEmoji(status) {
  switch (status) {
    case 'pending': return '⏳';
    case 'active': return '✅';
    case 'completed': return '🏁';
    case 'rejected': return '❌';
    case 'cancelled': return '🚫';
    default: return '❓';
  }
}

// Функция для получения текста статуса закупа
function getStatusText(status) {
  switch (status) {
    case 'pending': return 'Ожидает подтверждения';
    case 'active': return 'Активен';
    case 'completed': return 'Завершен';
    case 'rejected': return 'Отклонен';
    case 'cancelled': return 'Отменен';
    default: return 'Неизвестно';
  }
}

// Обработка callback-запросов
purchasesScene.action(/.*/, (ctx) => {
  ctx.answerCbQuery();
  return ctx.wizard.next();
});

module.exports = purchasesScene; 