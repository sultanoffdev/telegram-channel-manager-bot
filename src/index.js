require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const mongoose = require('mongoose');
const express = require('express');
const { setupScenes } = require('./scenes');
const { setupCommands } = require('./commands');
const { setupMiddlewares } = require('./middlewares');
const { mainMenuKeyboard } = require('./keyboards/mainMenu');

console.log('Запуск бота...');
console.log('Проверка переменных окружения...');

// Проверяем наличие необходимых переменных окружения
if (!process.env.BOT_TOKEN) {
  console.error('Ошибка: BOT_TOKEN не найден в .env файле');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('Ошибка: MONGODB_URI не найден в .env файле');
  process.exit(1);
}

console.log('BOT_TOKEN найден:', process.env.BOT_TOKEN.substring(0, 10) + '...');
console.log('MONGODB_URI найден:', process.env.MONGODB_URI);

const bot = new Telegraf(process.env.BOT_TOKEN);

// Создаем Express сервер для прослушивания HTTP-запросов
const app = express();
const PORT = process.env.PORT || 3000;

// Определяем, будем ли использовать webhook (на основе наличия переменной окружения)
const isDevelopment = !process.env.IS_RENDER;
const webhookDomain = process.env.WEBHOOK_DOMAIN;

// Добавляем простой эндпоинт для проверки состояния (health check)
app.get('/', (req, res) => {
  res.send('Telegram bot is running!');
});

// Добавляем эндпоинт для webhook
app.use(express.json());

// Функция для запуска бота
async function startBot() {
  try {
    console.log('Подключение к MongoDB...');
    // Подключаемся к MongoDB с совместимыми опциями
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        dbName: 'telegram_bot'
      });
      console.log('✅ Подключено к MongoDB');
      
      // Проверка доступности базы данных
      const admin = mongoose.connection.db.admin();
      const serverInfo = await admin.serverInfo();
      console.log(`MongoDB версия: ${serverInfo.version}`);
      
      // Получение списка коллекций для проверки соединения
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`Доступные коллекции: ${collections.map(c => c.name).join(', ') || 'Нет коллекций'}`);
      
    } catch (dbError) {
      console.warn('⚠️ Ошибка подключения к MongoDB:', dbError.message);
      console.warn('⚠️ Полная информация об ошибке:', JSON.stringify(dbError, null, 2));
      console.warn('⚠️ Проверьте правильность строки подключения MONGODB_URI в файле .env');
      console.warn('⚠️ Продолжаем работу без базы данных. Некоторые функции будут недоступны.');
    }

    console.log('Настройка сессии...');
    // Настраиваем сессию
    bot.use(session());

    // Инициализируем сессию
    bot.use((ctx, next) => {
      if (!ctx.session) ctx.session = {};
      return next();
    });

    console.log('Настройка middleware...');
    // Настраиваем middleware
    setupMiddlewares(bot);

    console.log('Настройка сцен...');
    // Настраиваем сцены
    setupScenes(bot);

    console.log('Настройка команд...');
    // Настраиваем команды
    setupCommands(bot);

    // Функция отображения главного меню
    bot.command('menu', async (ctx) => {
      await ctx.reply('Главное меню:', mainMenuKeyboard);
    });

    console.log('Запуск бота...');
    // Запускаем бота: long polling в разработке, webhook в production
    if (isDevelopment) {
      console.log('Запуск в режиме long polling...');
      await bot.launch();
      console.log('✅ Бот успешно запущен в режиме long polling');
    } else {
      // Для webhook на Render
      if (!webhookDomain) {
        console.warn('⚠️ WEBHOOK_DOMAIN не задан в переменных окружения, будет использован long polling');
        await bot.launch();
        console.log('✅ Бот запущен в режиме long polling');
      } else {
        console.log(`Настройка webhook на домене ${webhookDomain}...`);
        const secretPath = `/telegraf/${bot.secretPathComponent()}`;
        await bot.telegram.setWebhook(`${webhookDomain}${secretPath}`);
        
        // Настраиваем обработчик webhook
        app.use(bot.webhookCallback(secretPath));
        console.log('✅ Бот успешно запущен в режиме webhook');
      }
    }

    // Запускаем HTTP-сервер
    app.listen(PORT, () => {
      console.log(`✅ HTTP-сервер запущен на порту ${PORT}`);
    });

    // Включаем graceful stop
    process.once('SIGINT', () => {
      console.log('Получен сигнал SIGINT, останавливаем бота...');
      bot.stop('SIGINT');
    });
    process.once('SIGTERM', () => {
      console.log('Получен сигнал SIGTERM, останавливаем бота...');
      bot.stop('SIGTERM');
    });
  } catch (error) {
    console.error('❌ Ошибка при запуске бота:', error);
    process.exit(1);
  }
}

// Запускаем бота
startBot(); 