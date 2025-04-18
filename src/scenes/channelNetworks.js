const { Scenes, Markup } = require('telegraf');
const channelNetworkService = require('../services/channelNetworkService');
const channelService = require('../services/channelService');
const moment = require('moment-timezone');
const { handleError } = require('../utils/errorHandler');

// Create a scene for managing channel networks
const channelNetworksScene = new Scenes.WizardScene(
  'channelNetworks',
  // Step 1: Display channel networks menu and options
  async (ctx) => {
    const userId = ctx.from.id;
    
    try {
      const userChannels = await channelService.getUserChannels(userId);
      
      if (userChannels.length === 0) {
        await ctx.reply('У вас пока нет добавленных каналов. Сначала добавьте каналы в разделе "Мои каналы".');
        return ctx.scene.leave();
      }
      
      await ctx.reply(
        '🔄 *Сети каналов*\n\n' +
        'Управляйте вашими сетями каналов для синхронизированного постинга и анализа.',
        {
          parse_mode: 'Markdown',
          ...Markup.keyboard([
            ['📊 Мои сети', '➕ Создать сеть'],
            ['🔙 Назад']
          ]).resize()
        }
      );
      
      return ctx.wizard.next();
    } catch (error) {
      console.error('Error in channel networks scene:', error);
      await ctx.reply('Произошла ошибка при загрузке данных о каналах. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  
  // Step 2: Handle user actions
  async (ctx) => {
    const userId = ctx.from.id;
    
    if (ctx.message && ctx.message.text === '🔙 Назад') {
      await displayMainMenu(ctx);
      return ctx.scene.leave();
    }
    
    if (ctx.message && ctx.message.text === '📊 Мои сети') {
      // Placeholder for listing user's channel networks
      await ctx.reply(
        '🔄 *Ваши сети каналов*\n\n' +
        'У вас пока нет созданных сетей каналов.\n' +
        'Создайте новую сеть, нажав "➕ Создать сеть".',
        {
          parse_mode: 'Markdown'
        }
      );
      return;
    }
    
    if (ctx.message && ctx.message.text === '➕ Создать сеть') {
      try {
        const userChannels = await channelService.getUserChannels(userId);
        
        if (userChannels.length < 2) {
          await ctx.reply('Для создания сети необходимо иметь как минимум 2 канала. Добавьте больше каналов в разделе "Мои каналы".');
          return;
        }
        
        ctx.wizard.state.creatingNetwork = true;
        ctx.wizard.state.selectedChannels = [];
        
        const channelButtons = userChannels.map(channel => 
          Markup.button.callback(channel.title, `select_channel:${channel.id}`)
        );
        
        await ctx.reply(
          '👥 *Создание новой сети каналов*\n\n' +
          'Выберите каналы, которые хотите добавить в сеть:',
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              ...channelButtons.map(button => [button]),
              [Markup.button.callback('✅ Готово', 'network_channels_done')]
            ])
          }
        );
        
        return ctx.wizard.next();
      } catch (error) {
        console.error('Error getting user channels:', error);
        await ctx.reply('Произошла ошибка при загрузке списка каналов. Пожалуйста, попробуйте позже.');
      }
    }
  },
  
  // Step 3: Handle channel selection for network creation
  async (ctx) => {
    // This would handle the callback queries for channel selection
    if (ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;
      
      if (data.startsWith('select_channel:')) {
        const channelId = data.split(':')[1];
        const selectedChannels = ctx.wizard.state.selectedChannels || [];
        
        // Toggle channel selection
        const index = selectedChannels.indexOf(channelId);
        if (index === -1) {
          selectedChannels.push(channelId);
        } else {
          selectedChannels.splice(index, 1);
        }
        
        ctx.wizard.state.selectedChannels = selectedChannels;
        
        await ctx.answerCbQuery(`Канал ${index === -1 ? 'добавлен' : 'удален'}`);
        return;
      }
      
      if (data === 'network_channels_done') {
        const selectedChannels = ctx.wizard.state.selectedChannels || [];
        
        if (selectedChannels.length < 2) {
          await ctx.answerCbQuery('Выберите как минимум 2 канала для создания сети');
          return;
        }
        
        await ctx.answerCbQuery();
        await ctx.reply(
          '✏️ Введите название для вашей новой сети каналов:',
          {
            reply_markup: { remove_keyboard: true }
          }
        );
        
        return ctx.wizard.next();
      }
    }
  },
  
  // Step 4: Handle network name input
  async (ctx) => {
    if (!ctx.message || !ctx.message.text) {
      await ctx.reply('Пожалуйста, введите текстовое название для сети каналов.');
      return;
    }
    
    const networkName = ctx.message.text;
    const selectedChannels = ctx.wizard.state.selectedChannels || [];
    
    // Here you would save the network to the database
    await ctx.reply(
      '✅ *Сеть каналов успешно создана!*\n\n' +
      `Название: ${networkName}\n` +
      `Количество каналов: ${selectedChannels.length}\n\n` +
      'Теперь вы можете управлять этой сетью и создавать синхронизированные посты.',
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          ['📊 Мои сети', '➕ Создать сеть'],
          ['🔙 Назад']
        ]).resize()
      }
    );
    
    ctx.wizard.state = {};
    return ctx.wizard.selectStep(1);
  }
);

// Register action handlers
channelNetworksScene.action(/select_channel:(.+)/, (ctx) => {
  // This is handled in step 3
  return;
});

channelNetworksScene.action('network_channels_done', (ctx) => {
  // This is handled in step 3
  return;
});

// Helper function to display the main menu
async function displayMainMenu(ctx) {
  await ctx.reply(
    '🤖 Главное меню',
    {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['📝 Постинг', '📅 Календарь'],
        ['📢 Мои каналы', '🔍 Сканинг'],
        ['💰 Закупы', '💵 Финансы'],
        ['🛡 Защита и Приём', '🔄 Сети каналов'],
        ['⚙️ Настройки']
      ]).resize()
    }
  );
}

module.exports = channelNetworksScene; 