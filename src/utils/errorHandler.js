/**
 * Utility for handling errors in the application
 */

/**
 * Handle error and respond to the user
 * @param {Error} error - The error that occurred
 * @param {Object} ctx - Telegraf context
 * @param {String} errorMessage - Custom error message to show to the user
 * @param {Function} callback - Optional callback to execute after handling error
 */
const handleError = async (error, ctx, errorMessage = 'Произошла ошибка. Пожалуйста, попробуйте позже.', callback = null) => {
  console.error('Error:', error);
  
  try {
    if (ctx && ctx.reply) {
      await ctx.reply(errorMessage);
    }
    
    if (callback && typeof callback === 'function') {
      callback();
    }
  } catch (replyError) {
    console.error('Error while handling error:', replyError);
  }
};

/**
 * Log error to console without user interaction
 * @param {Error} error - The error that occurred
 * @param {String} context - Context where the error occurred
 */
const logError = (error, context = 'General') => {
  console.error(`Error in ${context}:`, error);
};

module.exports = {
  handleError,
  logError
}; 