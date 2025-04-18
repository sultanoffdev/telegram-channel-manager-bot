const { Scenes } = require('telegraf');
const postingScene = require('./posting');
const scanningScene = require('./scanning');
const purchasesScene = require('./purchases');
const calendarScene = require('./calendar');
const channelsScene = require('./channels');
const protectionScene = require('./protection');
const settingsScene = require('./settings');
const financeScene = require('./finance');
const channelNetworksScene = require('./channelNetworks');

const setupScenes = (bot) => {
  const stage = new Scenes.Stage([
    postingScene,
    scanningScene,
    purchasesScene,
    calendarScene,
    channelsScene,
    protectionScene,
    settingsScene,
    financeScene,
    channelNetworksScene
  ]);

  bot.use(stage.middleware());

  // Handle main menu buttons
  bot.hears('📝 Постинг', (ctx) => ctx.scene.enter('posting'));
  bot.hears('🔍 Сканинг', (ctx) => ctx.scene.enter('scanning'));
  bot.hears('💰 Закупы', (ctx) => ctx.scene.enter('purchases'));
  bot.hears('📅 Календарь', (ctx) => ctx.scene.enter('calendar'));
  bot.hears('💵 Финансы', (ctx) => ctx.scene.enter('finance'));
  bot.hears('📢 Мои каналы', (ctx) => ctx.scene.enter('channels'));
  bot.hears('🛡 Защита и Приём', (ctx) => ctx.scene.enter('protection'));
  bot.hears('🔄 Сети каналов', (ctx) => ctx.scene.enter('channelNetworks'));
  bot.hears('⚙️ Настройки', (ctx) => ctx.scene.enter('settings'));
};

module.exports = {
  setupScenes
}; 