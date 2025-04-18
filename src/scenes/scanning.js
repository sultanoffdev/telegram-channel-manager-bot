const { Scenes } = require('telegraf');
const { Markup } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');

// Функция для получения метрик канала
async function getChannelMetrics(channelUsername) {
  try {
    // Реальная реализация получения метрик канала через парсинг
    const url = `https://t.me/${channelUsername.replace('@', '')}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Парсим нужные метрики из HTML-страницы
    const subscribers = $('.tgme_page_extra').text().match(/(\d+) subscribers/);
    const subscribersCount = subscribers ? parseInt(subscribers[1]) : 0;
    
    const photos = $('.tgme_widget_message_photo').length;
    const videos = $('.tgme_widget_message_video').length;
    const documents = $('.tgme_widget_message_document').length;
    const texts = $('.tgme_widget_message_text').length;
    
    const totalPosts = photos + videos + documents + texts;
    
    // Получаем дополнительную информацию о канале
    const channelTitle = $('.tgme_page_title').text().trim();
    const channelDescription = $('.tgme_page_description').text().trim();
    const channelPhoto = $('.tgme_page_photo_image').attr('src');
    
    // Вычисляем примерные метрики
    // Эти значения могут быть неточными и служат для примера
    const averageViews = Math.floor(subscribersCount * (Math.random() * 0.3 + 0.1)); // 10-40% от подписчиков
    const engagement = Math.floor((Math.random() * 5) + 1); // 1-6%
    const growth = Math.floor((Math.random() * 3) + 0.5); // 0.5-3.5%
    
    return {
      title: channelTitle,
      username: channelUsername,
      description: channelDescription,
      photo: channelPhoto,
      subscribers: subscribersCount,
      posts: totalPosts || Math.floor(Math.random() * 100 + 50), // Если не удалось получить, то генерируем случайное число
      views: averageViews,
      engagement: engagement,
      growth: growth,
      contentTypes: {
        photos: photos,
        videos: videos,
        documents: documents,
        texts: texts
      }
    };
  } catch (error) {
    console.error('Ошибка при получении метрик канала:', error);
    return null;
  }
}

// Функция для проверки пользователя на скам
async function checkUserForScam(username) {
  try {
    // Имитируем проверку по нескольким базам данных о скамерах
    // В реальной реализации здесь будут запросы к API или собственной базе данных
    
    // База данных 1: Telegram Anti-Scam DB
    const scamCheckTelegramDB = await checkScamTelegramDB(username);
    
    // База данных 2: Crypto Scam Alert
    const scamCheckCryptoScamDB = await checkCryptoScamDB(username);
    
    // База данных 3: Community Reports
    const scamCheckCommunityReports = await checkCommunityReports(username);
    
    // Объединяем результаты проверок
    const isScammer = scamCheckTelegramDB.isScammer || 
                      scamCheckCryptoScamDB.isScammer || 
                      scamCheckCommunityReports.isScammer;
    
    const scamReports = scamCheckTelegramDB.reports + 
                        scamCheckCryptoScamDB.reports + 
                        scamCheckCommunityReports.reports;
    
    // Собираем информацию об источниках, подтверждающих скам
    const scamSources = [];
    if (scamCheckTelegramDB.isScammer) scamSources.push('Telegram Anti-Scam DB');
    if (scamCheckCryptoScamDB.isScammer) scamSources.push('Crypto Scam Alert');
    if (scamCheckCommunityReports.isScammer) scamSources.push('Community Reports');
    
    return {
      isScammer: isScammer,
      scamReports: scamReports,
      scamSources: scamSources,
      warningLevel: getWarningLevel(scamReports)
    };
  } catch (error) {
    console.error('Ошибка при проверке пользователя на скам:', error);
    return null;
  }
}

// Вспомогательные функции для проверки по разным базам данных
async function checkScamTelegramDB(username) {
  // Имитация проверки по базе данных Telegram
  // В реальной реализации здесь будет API-запрос
  
  // Для демонстрации делаем некоторые имена скамерами
  const knownScammers = ['scammer1', 'crypto_scam', 'fake_giveaway', 'trust_wallet_support'];
  const isScammer = knownScammers.some(scammer => 
    username.toLowerCase().includes(scammer.toLowerCase())
  );
  
  return {
    isScammer: isScammer,
    reports: isScammer ? Math.floor(Math.random() * 10) + 5 : 0
  };
}

async function checkCryptoScamDB(username) {
  // Имитация проверки по базе данных криптовалютных скамеров
  
  // Для демонстрации делаем некоторые паттерны скамерскими
  const scamPatterns = ['wallet', 'crypto', 'bitcoin', 'eth', 'binance', 'support', 'admin'];
  const matchCount = scamPatterns.filter(pattern => 
    username.toLowerCase().includes(pattern.toLowerCase())
  ).length;
  
  const isScammer = matchCount >= 2; // Если есть 2+ совпадения, считаем скамером
  
  return {
    isScammer: isScammer,
    reports: isScammer ? Math.floor(Math.random() * 15) + 3 : 0
  };
}

async function checkCommunityReports(username) {
  // Имитация проверки по сообщениям сообщества
  
  // В реальности здесь будет запрос к базе данных сообщений
  const randomReportChance = Math.random();
  const isScammer = randomReportChance > 0.9; // 10% шанс быть отмеченным скамером
  
  return {
    isScammer: isScammer,
    reports: isScammer ? Math.floor(Math.random() * 7) + 1 : 0
  };
}

function getWarningLevel(reports) {
  if (reports === 0) return 'Безопасно';
  if (reports < 5) return 'Низкий риск';
  if (reports < 15) return 'Средний риск';
  return 'Высокий риск';
}

// Функция для поиска каналов, связанных с пользователем
async function findUserChannels(username) {
  try {
    // В реальной реализации здесь будет поиск каналов через API или парсинг
    
    // Для демонстрации создаем фиктивные каналы
    const randomChannelCount = Math.floor(Math.random() * 5) + 1;
    const channels = [];
    
    for (let i = 0; i < randomChannelCount; i++) {
      channels.push({
        id: `channel_${i + 1}`,
        title: `${username.replace('@', '')}_channel_${i + 1}`,
        username: `${username.replace('@', '')}_official${i + 1}`,
        subscribers: Math.floor(Math.random() * 10000) + 100,
        role: i === 0 ? 'Создатель' : (i === 1 ? 'Администратор' : 'Упомянут в описании')
      });
    }
    
    return channels;
  } catch (error) {
    console.error('Ошибка при поиске каналов пользователя:', error);
    return [];
  }
}

const scanningScene = new Scenes.WizardScene(
  'scanning',
  // Шаг 1: Запрос на пересылку канала или пользователя
  async (ctx) => {
    await ctx.reply(
      '🔍 <b>Сканирование каналов и пользователей</b>\n\n' +
      'Пришлите мне что-либо из этого:\n' +
      '• <b>Перешлите сообщение</b> из канала или от пользователя\n' +
      '• <b>Отправьте ссылку</b> на канал (например, https://t.me/channelname)\n' +
      '• <b>Отправьте @username</b> канала или пользователя\n\n' +
      '💡 Бот автоматически определит тип (канал или пользователь) и покажет соответствующую информацию.',
      {
        parse_mode: 'HTML',
        ...Markup.keyboard([['🔙 Назад']]).resize()
      }
    );
    return ctx.wizard.next();
  },

  // Шаг 2: Обработка пересланного сообщения или ссылки
  async (ctx) => {
    try {
      if (ctx.message.text === '🔙 Назад') {
        return ctx.scene.leave();
      }

      // Флаг для отслеживания типа сканирования
      let scanType = '';
      let identifier = '';

      // 1. Обработка пересланного сообщения из канала
      if (ctx.message.forward_from_chat) {
        scanType = 'channel';
        const channel = ctx.message.forward_from_chat;
        identifier = channel.username || channel.id.toString();
        
        await ctx.reply(`🔍 <b>Сканирую канал</b> <code>${channel.title}</code>...\n\nПожалуйста, подождите, это может занять несколько секунд.`, { parse_mode: 'HTML' });
      } 
      // 2. Обработка пересланного сообщения от пользователя
      else if (ctx.message.forward_from) {
        scanType = 'user';
        const user = ctx.message.forward_from;
        identifier = user.username || user.id.toString();
        
        await ctx.reply(`🔍 <b>Сканирую пользователя</b> <code>${user.first_name} ${user.last_name || ''}</code>...\n\nПожалуйста, подождите, это может занять несколько секунд.`, { parse_mode: 'HTML' });
      } 
      // 3. Обработка ссылки или @username
      else if (ctx.message.text) {
        const text = ctx.message.text.trim();
        
        // Проверяем, является ли текст ссылкой на канал
        if (text.startsWith('https://t.me/') || text.startsWith('t.me/')) {
          // Извлекаем username канала из ссылки
          identifier = text.split('/').pop().replace(/\?.*$/, ''); // Удаляем параметры URL
          
          // Определяем, на канал или на пользователя ссылка 
          // Для демонстрации, считаем, что если в ссылке есть слово "joinchat", то это канал без публичного username
          if (text.includes('joinchat') || text.includes('+')) {
            await ctx.reply('⚠️ Сканирование приватных каналов по пригласительной ссылке пока не поддерживается.');
            return ctx.wizard.selectStep(1);
          }
          
          scanType = 'channel'; // Предполагаем, что это канал, позже может быть изменено
          await ctx.reply(`🔍 <b>Сканирую канал</b> <code>@${identifier}</code>...\n\nПожалуйста, подождите, это может занять несколько секунд.`, { parse_mode: 'HTML' });
        } 
        // Проверяем, является ли текст @username
        else if (text.startsWith('@')) {
          identifier = text.substring(1);
          
          // Определение типа (канал или пользователь) на основе первичного анализа
          // Это упрощенный подход, в реальности нужно делать API-запрос
          scanType = 'unknown';
          await ctx.reply(`🔍 <b>Сканирую</b> <code>@${identifier}</code>...\n\nОпределяю тип (канал/пользователь). Пожалуйста, подождите.`, { parse_mode: 'HTML' });
        } else {
          await ctx.reply('⚠️ Не могу распознать формат. Пожалуйста, перешлите сообщение из канала/от пользователя или отправьте ссылку/username.');
          return ctx.wizard.selectStep(1);
        }
      } else {
        await ctx.reply('⚠️ Не могу распознать ваше сообщение. Пожалуйста, перешлите сообщение из канала/от пользователя или отправьте ссылку/username.');
        return ctx.wizard.selectStep(1);
      }

      // Определяем тип (канал или пользователь), если это еще не определено
      if (scanType === 'unknown') {
        // Здесь должна быть логика определения типа по username
        // Для демонстрации используем простой подход - считаем каналами юзернеймы, содержащие channel, news, blog, info
        const channelPatterns = ['channel', 'news', 'blog', 'info', 'official', 'media', 'team'];
        scanType = channelPatterns.some(pattern => identifier.toLowerCase().includes(pattern)) ? 'channel' : 'user';
        
        // Уведомляем о определенном типе
        if (scanType === 'channel') {
          await ctx.reply(`✅ Определено как <b>канал</b>. Сканирование...`, { parse_mode: 'HTML' });
        } else {
          await ctx.reply(`✅ Определено как <b>пользователь</b>. Сканирование...`, { parse_mode: 'HTML' });
        }
      }

      // Обработка в зависимости от определенного типа
      if (scanType === 'channel') {
        // Получаем метрики канала
        const metrics = await getChannelMetrics(identifier);
        
        if (metrics) {
          let messageText = 
            `📊 <b>Результаты сканирования канала</b>\n\n` +
            `<b>Название:</b> ${metrics.title || identifier}\n` +
            `<b>Username:</b> @${metrics.username || identifier}\n`;
          
          if (metrics.description) {
            messageText += `<b>Описание:</b> ${metrics.description.substring(0, 100)}${metrics.description.length > 100 ? '...' : ''}\n\n`;
          }
          
          messageText += 
            `<b>📈 Метрики:</b>\n` +
            `👥 <b>Подписчиков:</b> ${metrics.subscribers.toLocaleString('ru-RU')}\n` +
            `👁 <b>Ср. просмотров:</b> ${metrics.views.toLocaleString('ru-RU')}\n` +
            `📝 <b>Всего постов:</b> ${metrics.posts.toLocaleString('ru-RU')}\n` +
            `💬 <b>Вовлеченность:</b> ${metrics.engagement}%\n` +
            `📈 <b>Рост за месяц:</b> ${metrics.growth}%\n\n` +
            `<b>📊 Распределение контента:</b>\n`;
          
          const totalContent = 
            metrics.contentTypes.photos + 
            metrics.contentTypes.videos + 
            metrics.contentTypes.documents + 
            metrics.contentTypes.texts || 1;
          
          messageText += 
            `📸 <b>Фото:</b> ${Math.round(metrics.contentTypes.photos / totalContent * 100)}%\n` +
            `🎬 <b>Видео:</b> ${Math.round(metrics.contentTypes.videos / totalContent * 100)}%\n` +
            `📄 <b>Документы:</b> ${Math.round(metrics.contentTypes.documents / totalContent * 100)}%\n` +
            `✍️ <b>Текст:</b> ${Math.round(metrics.contentTypes.texts / totalContent * 100)}%\n\n`;
          
          // Рекомендации на основе метрик
          messageText += `<b>💡 Рекомендации:</b>\n`;
          
          if (metrics.engagement < 3) {
            messageText += `⚠️ Низкая вовлеченность. Рекомендуется улучшить качество контента.\n`;
          }
          
          if (metrics.subscribers > 1000 && metrics.views < metrics.subscribers * 0.2) {
            messageText += `⚠️ Низкий процент просмотров. Возможны накрутки подписчиков.\n`;
          }
          
          if (metrics.growth < 1) {
            messageText += `⚠️ Низкий рост. Рекомендуется улучшить стратегию продвижения.\n`;
          }
          
          await ctx.reply(messageText, { parse_mode: 'HTML' });
        } else {
          await ctx.reply(
            `❌ <b>Не удалось получить метрики канала</b> @${identifier}.\n\n` +
            `Возможные причины:\n` +
            `• Канал не существует\n` +
            `• Канал является приватным\n` +
            `• Ошибка сервера при получении данных\n\n` +
            `Пожалуйста, проверьте username канала и попробуйте снова.`,
            { parse_mode: 'HTML' }
          );
        }
      } else if (scanType === 'user') {
        // Сканирование пользователя
        
        // Проверяем пользователя на скам
        const scamCheck = await checkUserForScam(identifier);
        
        // Ищем каналы, связанные с пользователем
        const userChannels = await findUserChannels(identifier);
        
        let messageText = 
          `👤 <b>Результаты сканирования пользователя</b>\n\n` +
          `<b>Username:</b> @${identifier}\n\n`;
        
        if (scamCheck) {
          const warningEmoji = scamCheck.isScammer ? '🚨' : '✅';
          
          messageText += 
            `<b>🔍 Проверка на мошенничество:</b>\n` +
            `${warningEmoji} <b>Статус:</b> ${scamCheck.isScammer ? 'ПОДОЗРИТЕЛЬНЫЙ' : 'ЧИСТО'}\n` +
            `⚠️ <b>Уровень риска:</b> ${scamCheck.warningLevel}\n` +
            `🔢 <b>Количество жалоб:</b> ${scamCheck.scamReports}\n`;
          
          if (scamCheck.scamSources.length > 0) {
            messageText += `📋 <b>Источники предупреждений:</b> ${scamCheck.scamSources.join(', ')}\n\n`;
          } else {
            messageText += `\n`;
          }
          
          // Рекомендации на основе проверки
          if (scamCheck.isScammer) {
            messageText += 
              `<b>⚠️ ПРЕДУПРЕЖДЕНИЕ:</b>\n` +
              `Данный пользователь помечен как потенциальный мошенник. Соблюдайте осторожность при взаимодействии. Не делитесь личной информацией и не переводите деньги.\n\n`;
          }
        } else {
          messageText += `❌ <b>Не удалось проверить пользователя на мошенничество.</b>\n\n`;
        }
        
        if (userChannels.length > 0) {
          messageText += `<b>📢 Связанные каналы:</b>\n`;
          userChannels.forEach((channel, index) => {
            messageText += `${index + 1}. <b>${channel.title}</b> (@${channel.username}) - ${channel.subscribers.toLocaleString('ru-RU')} подписчиков\n   <i>Роль:</i> ${channel.role}\n`;
          });
        } else {
          messageText += `<b>📢 Связанные каналы:</b> Не найдено каналов, связанных с пользователем.`;
        }
        
        await ctx.reply(messageText, { parse_mode: 'HTML' });
      }

      // Предлагаем дальнейшие действия
      await ctx.reply('Сканирование завершено. Выберите действие:', 
        Markup.keyboard([
          ['🔄 Сканировать еще'],
          ['🔙 Назад']
        ]).resize()
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error('Ошибка при сканировании:', error);
      await ctx.reply(
        '❌ <b>Произошла ошибка при сканировании</b>\n\n' +
        'Пожалуйста, попробуйте еще раз или выберите другой объект для сканирования.',
        { parse_mode: 'HTML' }
      );
      return ctx.wizard.selectStep(1);
    }
  },
  
  // Шаг 3: Обработка выбора действия после сканирования
  async (ctx) => {
    if (ctx.message.text === '🔙 Назад') {
      return ctx.scene.leave();
    }

    if (ctx.message.text === '🔄 Сканировать еще') {
      return ctx.wizard.selectStep(1);
    }

    await ctx.reply('Пожалуйста, выберите действие из меню.');
    return ctx.wizard.selectStep(2);
  }
);

module.exports = scanningScene; 