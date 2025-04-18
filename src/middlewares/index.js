const { User } = require('../models/user');

const setupMiddlewares = (bot) => {
  // User session middleware
  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();

    try {
      let user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user) {
        user = new User({
          telegramId: ctx.from.id,
          username: ctx.from.username
        });
        await user.save();
      }

      // Сохраняем только необходимые данные пользователя в сессии
      ctx.session.user = {
        telegramId: user.telegramId,
        username: user.username,
        timezone: user.timezone,
        language: user.language,
        channels: user.channels,
        subscription: user.subscription,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        autoApproveTimer: user.autoApproveTimer
      };
      
      return next();
    } catch (error) {
      console.error('Error in user middleware:', error);
      return next();
    }
  });

  // Error handling middleware
  bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
    ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  });
};

module.exports = {
  setupMiddlewares
}; 