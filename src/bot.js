require('dotenv').config();
const { Telegraf } = require('telegraf');

// Создаем инстанс бота
const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = bot; 