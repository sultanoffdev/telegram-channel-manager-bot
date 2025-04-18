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

// Добавляем простой эндпоинт для проверки состояния (health check)
app.get('/', (req, res) => {
  res.send('Telegram bot is running!');
});

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
    } catch (dbError) {
      console.warn('⚠️ Ошибка подключения к MongoDB:', dbError.message);
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
    // Запускаем бота
    await bot.launch();
    console.log('✅ Бот успешно запущен');

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