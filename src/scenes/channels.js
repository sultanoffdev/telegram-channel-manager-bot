const { Scenes } = require('telegraf');
const { Markup } = require('telegraf');
const { Channel } = require('../models/channel');
const { ChannelNetwork } = require('../models/channelNetwork');

const channelsScene = new Scenes.WizardScene(
  'channels',
  // Шаг 1: Отображение списка каналов и сетей
  async (ctx) => {
    // Получаем каналы пользователя
    const channels = await Channel.find({ userId: ctx.from.id });
    
    // Получаем сети каналов пользователя
    const networks = await ChannelNetwork.find({ userId: ctx.from.id });
    
    // Формируем сообщение
    let message = '📢 *Ваши каналы и сети каналов*\n\n';
    
    // Добавляем список каналов
    if (channels.length > 0) {
      message += '*Каналы:*\n';
      channels.forEach((channel, index) => {
        message += `${index + 1}. ${channel.title || channel.channelId} (${channel.channelId})\n`;
      });
      message += '\n';
    } else {
      message += '*Каналы:* Нет добавленных каналов\n\n';
    }
    
    // Добавляем список сетей
    if (networks.length > 0) {
      message += '*Сети каналов:*\n';
      networks.forEach((network, index) => {
        message += `${index + 1}. ${network.name} (${network.channels.length} каналов)\n`;
      });
    } else {
      message += '*Сети каналов:* Нет созданных сетей\n';
    }
    
    // Создаем клавиатуру
    const keyboard = [
      [Markup.button.callback('➕ Добавить канал', 'add_channel')],
      [Markup.button.callback('🔗 Создать сеть', 'create_network')]
    ];
    
    // Добавляем кнопки для каналов, если они есть
    if (channels.length > 0) {
      keyboard.push([Markup.button.callback('📝 Постинг', 'posting')]);
      keyboard.push([Markup.button.callback('💰 Закупы', 'purchases')]);
    }
    
    // Добавляем кнопку возврата
    keyboard.push([Markup.button.callback('🔙 Назад', 'back')]);
    
    // Отправляем сообщение с клавиатурой
    await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(keyboard));
    
    return ctx.wizard.next();
  },
  // Шаг 2: Обработка действий с каналами и сетями
  async (ctx) => {
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      
      // Обработка добавления канала
      if (action === 'add_channel') {
        await ctx.reply(
          'Пожалуйста, отправьте ID канала или ссылку на канал.\n\n' +
          'Примеры:\n' +
          '- ID: @channel_name\n' +
          '- Ссылка: https://t.me/channel_name'
        );
        ctx.session.action = 'add_channel';
        return ctx.wizard.next();
      }
      
      // Обработка создания сети
      else if (action === 'create_network') {
        // Получаем каналы пользователя
        const channels = await Channel.find({ userId: ctx.from.id });
        
        if (channels.length < 2) {
          await ctx.reply(
            'Для создания сети необходимо иметь как минимум 2 канала.\n' +
            'Пожалуйста, добавьте каналы и попробуйте снова.'
          );
          return ctx.wizard.selectStep(0);
        }
        
        // Запрашиваем название сети
        await ctx.reply('Пожалуйста, введите название для новой сети каналов:');
        ctx.session.action = 'create_network_name';
        return ctx.wizard.next();
      }
      
      // Обработка постинга
      else if (action === 'posting') {
        // Получаем каналы и сети
        const channels = await Channel.find({ userId: ctx.from.id });
        const networks = await ChannelNetwork.find({ userId: ctx.from.id });
        
        // Формируем сообщение
        let message = '📝 *Выберите канал или сеть для постинга:*\n\n';
        
        // Добавляем список каналов
        if (channels.length > 0) {
          message += '*Каналы:*\n';
          channels.forEach((channel, index) => {
            message += `${index + 1}. ${channel.title || channel.channelId} (${channel.channelId})\n`;
          });
          message += '\n';
        }
        
        // Добавляем список сетей
        if (networks.length > 0) {
          message += '*Сети каналов:*\n';
          networks.forEach((network, index) => {
            message += `${index + 1}. ${network.name} (${network.channels.length} каналов)\n`;
          });
        }
        
        // Создаем клавиатуру
        const keyboard = [];
        
        // Добавляем кнопки для каналов
        channels.forEach((channel, index) => {
          keyboard.push([Markup.button.callback(
            `📢 ${channel.title || channel.channelId}`,
            `post_channel_${channel._id}`
          )]);
        });
        
        // Добавляем кнопки для сетей
        networks.forEach((network, index) => {
          keyboard.push([Markup.button.callback(
            `🔗 ${network.name}`,
            `post_network_${network._id}`
          )]);
        });
        
        // Добавляем кнопку возврата
        keyboard.push([Markup.button.callback('🔙 Назад', 'back_to_channels')]);
        
        // Отправляем сообщение с клавиатурой
        await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(keyboard));
        
        return ctx.wizard.next();
      }
      
      // Обработка закупов
      else if (action === 'purchases') {
        // Получаем каналы и сети
        const channels = await Channel.find({ userId: ctx.from.id });
        const networks = await ChannelNetwork.find({ userId: ctx.from.id });
        
        // Формируем сообщение
        let message = '💰 *Выберите канал или сеть для закупа:*\n\n';
        
        // Добавляем список каналов
        if (channels.length > 0) {
          message += '*Каналы:*\n';
          channels.forEach((channel, index) => {
            message += `${index + 1}. ${channel.title || channel.channelId} (${channel.channelId})\n`;
          });
          message += '\n';
        }
        
        // Добавляем список сетей
        if (networks.length > 0) {
          message += '*Сети каналов:*\n';
          networks.forEach((network, index) => {
            message += `${index + 1}. ${network.name} (${network.channels.length} каналов)\n`;
          });
        }
        
        // Создаем клавиатуру
        const keyboard = [];
        
        // Добавляем кнопки для каналов
        channels.forEach((channel, index) => {
          keyboard.push([Markup.button.callback(
            `📢 ${channel.title || channel.channelId}`,
            `purchase_channel_${channel._id}`
          )]);
        });
        
        // Добавляем кнопки для сетей
        networks.forEach((network, index) => {
          keyboard.push([Markup.button.callback(
            `🔗 ${network.name}`,
            `purchase_network_${network._id}`
          )]);
        });
        
        // Добавляем кнопку возврата
        keyboard.push([Markup.button.callback('🔙 Назад', 'back_to_channels')]);
        
        // Отправляем сообщение с клавиатурой
        await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(keyboard));
        
        return ctx.wizard.next();
      }
      
      // Обработка возврата
      else if (action === 'back' || action === 'back_to_channels') {
        return ctx.scene.leave();
      }
      
      // Обработка выбора канала для постинга
      else if (action.startsWith('post_channel_')) {
        const channelId = action.replace('post_channel_', '');
        ctx.session.selectedChannelId = channelId;
        return ctx.scene.enter('posting', { channelId });
      }
      
      // Обработка выбора сети для постинга
      else if (action.startsWith('post_network_')) {
        const networkId = action.replace('post_network_', '');
        ctx.session.selectedNetworkId = networkId;
        return ctx.scene.enter('posting', { networkId });
      }
      
      // Обработка выбора канала для закупа
      else if (action.startsWith('purchase_channel_')) {
        const channelId = action.replace('purchase_channel_', '');
        ctx.session.selectedChannelId = channelId;
        return ctx.scene.enter('purchases', { channelId });
      }
      
      // Обработка выбора сети для закупа
      else if (action.startsWith('purchase_network_')) {
        const networkId = action.replace('purchase_network_', '');
        ctx.session.selectedNetworkId = networkId;
        return ctx.scene.enter('purchases', { networkId });
      }
    }
    
    return ctx.wizard.selectStep(0);
  },
  // Шаг 3: Обработка добавления канала
  async (ctx) => {
    if (ctx.session.action === 'add_channel') {
      const channelInput = ctx.message.text.trim();
      
      // Извлекаем ID канала из ввода
      let channelId = channelInput;
      
      // Если это ссылка, извлекаем ID
      if (channelInput.includes('t.me/')) {
        channelId = '@' + channelInput.split('t.me/')[1].split('?')[0];
      }
      
      // Если это ID без @, добавляем @
      if (!channelId.startsWith('@')) {
        channelId = '@' + channelId;
      }
      
      // Проверяем, существует ли уже такой канал
      const existingChannel = await Channel.findOne({
        userId: ctx.from.id,
        channelId: channelId
      });
      
      if (existingChannel) {
        await ctx.reply('Этот канал уже добавлен в ваш список.');
        return ctx.wizard.selectStep(0);
      }
      
      // Создаем новый канал
      const newChannel = new Channel({
        userId: ctx.from.id,
        channelId: channelId,
        title: channelId, // Временно используем ID как название
        addedAt: new Date()
      });
      
      await newChannel.save();
      
      await ctx.reply(`Канал ${channelId} успешно добавлен!`);
      return ctx.wizard.selectStep(0);
    }
    
    return ctx.wizard.selectStep(0);
  },
  // Шаг 4: Обработка создания сети (название)
  async (ctx) => {
    if (ctx.session.action === 'create_network_name') {
      const networkName = ctx.message.text.trim();
      
      // Проверяем, существует ли уже сеть с таким названием
      const existingNetwork = await ChannelNetwork.findOne({
        userId: ctx.from.id,
        name: networkName
      });
      
      if (existingNetwork) {
        await ctx.reply('Сеть с таким названием уже существует. Пожалуйста, выберите другое название.');
        return ctx.wizard.selectStep(2);
      }
      
      // Сохраняем название сети
      ctx.session.networkName = networkName;
      
      // Получаем каналы пользователя
      const channels = await Channel.find({ userId: ctx.from.id });
      
      // Формируем сообщение
      let message = `*Выберите каналы для сети "${networkName}":*\n\n`;
      
      channels.forEach((channel, index) => {
        message += `${index + 1}. ${channel.title || channel.channelId} (${channel.channelId})\n`;
      });
      
      // Создаем клавиатуру
      const keyboard = [];
      
      channels.forEach((channel, index) => {
        keyboard.push([Markup.button.callback(
          `${channel.title || channel.channelId}`,
          `select_channel_${channel._id}`
        )]);
      });
      
      // Добавляем кнопки управления
      keyboard.push([
        Markup.button.callback('✅ Готово', 'finish_network'),
        Markup.button.callback('❌ Отмена', 'cancel_network')
      ]);
      
      // Инициализируем список выбранных каналов
      ctx.session.selectedChannels = [];
      
      // Отправляем сообщение с клавиатурой
      await ctx.replyWithMarkdown(message, Markup.inlineKeyboard(keyboard));
      
      return ctx.wizard.next();
    }
    
    return ctx.wizard.selectStep(0);
  },
  // Шаг 5: Обработка выбора каналов для сети
  async (ctx) => {
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      
      // Обработка выбора канала
      if (action.startsWith('select_channel_')) {
        const channelId = action.replace('select_channel_', '');
        
        // Проверяем, выбран ли уже этот канал
        if (ctx.session.selectedChannels.includes(channelId)) {
          // Удаляем канал из выбранных
          ctx.session.selectedChannels = ctx.session.selectedChannels.filter(id => id !== channelId);
        } else {
          // Добавляем канал в выбранные
          ctx.session.selectedChannels.push(channelId);
        }
        
        // Получаем каналы пользователя
        const channels = await Channel.find({ userId: ctx.from.id });
        
        // Формируем сообщение
        let message = `*Выберите каналы для сети "${ctx.session.networkName}":*\n\n`;
        
        channels.forEach((channel, index) => {
          const isSelected = ctx.session.selectedChannels.includes(channel._id.toString());
          message += `${isSelected ? '✅' : '⬜️'} ${channel.title || channel.channelId} (${channel.channelId})\n`;
        });
        
        // Создаем клавиатуру
        const keyboard = [];
        
        channels.forEach((channel, index) => {
          const isSelected = ctx.session.selectedChannels.includes(channel._id.toString());
          keyboard.push([Markup.button.callback(
            `${isSelected ? '✅' : '⬜️'} ${channel.title || channel.channelId}`,
            `select_channel_${channel._id}`
          )]);
        });
        
        // Добавляем кнопки управления
        keyboard.push([
          Markup.button.callback('✅ Готово', 'finish_network'),
          Markup.button.callback('❌ Отмена', 'cancel_network')
        ]);
        
        // Отправляем сообщение с клавиатурой
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard(keyboard).reply_markup
        });
        
        return ctx.wizard.selectStep(4);
      }
      
      // Обработка завершения создания сети
      else if (action === 'finish_network') {
        // Проверяем, выбраны ли каналы
        if (ctx.session.selectedChannels.length < 2) {
          await ctx.reply('Для создания сети необходимо выбрать как минимум 2 канала.');
          return ctx.wizard.selectStep(4);
        }
        
        // Создаем новую сеть
        const newNetwork = new ChannelNetwork({
          userId: ctx.from.id,
          name: ctx.session.networkName,
          channels: ctx.session.selectedChannels,
          createdAt: new Date()
        });
        
        await newNetwork.save();
        
        await ctx.reply(`Сеть "${ctx.session.networkName}" успешно создана!`);
        return ctx.wizard.selectStep(0);
      }
      
      // Обработка отмены создания сети
      else if (action === 'cancel_network') {
        await ctx.reply('Создание сети отменено.');
        return ctx.wizard.selectStep(0);
      }
    }
    
    return ctx.wizard.selectStep(0);
  }
);

// Обработка callback-запросов
channelsScene.action(/post_channel_.*/, (ctx) => {
  ctx.answerCbQuery();
  return ctx.wizard.next();
});

channelsScene.action(/post_network_.*/, (ctx) => {
  ctx.answerCbQuery();
  return ctx.wizard.next();
});

channelsScene.action(/purchase_channel_.*/, (ctx) => {
  ctx.answerCbQuery();
  return ctx.wizard.next();
});

channelsScene.action(/purchase_network_.*/, (ctx) => {
  ctx.answerCbQuery();
  return ctx.wizard.next();
});

channelsScene.action(/select_channel_.*/, (ctx) => {
  ctx.answerCbQuery();
  return ctx.wizard.selectStep(4);
});

channelsScene.action('finish_network', (ctx) => {
  ctx.answerCbQuery();
  return ctx.wizard.selectStep(4);
});

channelsScene.action('cancel_network', (ctx) => {
  ctx.answerCbQuery();
  return ctx.wizard.selectStep(0);
});

channelsScene.action('back_to_channels', (ctx) => {
  ctx.answerCbQuery();
  return ctx.wizard.selectStep(0);
});

module.exports = channelsScene; 