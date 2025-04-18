const postService = require('./postService');
const { Post } = require('../models/post');
const bot = require('../bot');
const cron = require('node-cron');

class SchedulerService {
  constructor() {
    // Check for posts every minute
    this.job = cron.schedule('* * * * *', () => {
      this.processScheduledPosts();
    });
  }

  async processScheduledPosts() {
    try {
      const now = new Date();
      const posts = await Post.find({
        status: 'scheduled',
        scheduleTime: { $lte: now }
      });

      for (const post of posts) {
        try {
          // If post is for multiple channels, send to each
          for (const channelId of Array.isArray(post.channelId) ? post.channelId : [post.channelId]) {
            await this.sendPost(post, channelId);
          }
          
          await postService.markAsPublished(post._id);
          
          // If post is set to repeat, create next scheduled post
          if (post.settings.repeat) {
            const nextSchedule = this.calculateNextSchedule(post.scheduleTime, post.settings.repeatInterval);
            await postService.createPost(
              post.userId,
              post.channelId,
              post.content,
              nextSchedule,
              post.tags,
              post.settings
            );
          }
        } catch (error) {
          await postService.markAsFailed(post._id, error);
        }
      }
    } catch (error) {
      console.error('Error processing scheduled posts:', error);
    }
  }

  async sendPost(post, channelId) {
    const { content, settings } = post;
    
    // Handle different types of content
    if (content.type === 'text') {
      await bot.telegram.sendMessage(channelId, content.text, {
        parse_mode: 'HTML',
        disable_notification: settings.silent,
        reply_markup: settings.buttons
      });
    } else if (content.type === 'photo') {
      await bot.telegram.sendPhoto(channelId, content.photo, {
        caption: content.caption,
        parse_mode: 'HTML',
        disable_notification: settings.silent,
        reply_markup: settings.buttons
      });
    } else if (content.type === 'video') {
      await bot.telegram.sendVideo(channelId, content.video, {
        caption: content.caption,
        parse_mode: 'HTML',
        disable_notification: settings.silent,
        reply_markup: settings.buttons
      });
    } else if (content.type === 'document') {
      await bot.telegram.sendDocument(channelId, content.document, {
        caption: content.caption,
        parse_mode: 'HTML',
        disable_notification: settings.silent,
        reply_markup: settings.buttons
      });
    } else if (content.type === 'poll') {
      await bot.telegram.sendPoll(channelId, content.question, content.options, {
        is_anonymous: content.isAnonymous,
        type: content.pollType,
        disable_notification: settings.silent
      });
    }
  }

  calculateNextSchedule(currentSchedule, interval) {
    const next = new Date(currentSchedule);
    
    switch(interval.unit) {
      case 'hours':
        next.setHours(next.getHours() + interval.value);
        break;
      case 'days':
        next.setDate(next.getDate() + interval.value);
        break;
      case 'weeks':
        next.setDate(next.getDate() + (interval.value * 7));
        break;
      case 'months':
        next.setMonth(next.getMonth() + interval.value);
        break;
    }
    
    return next;
  }

  start() {
    this.job.start();
  }

  stop() {
    this.job.stop();
  }
}

module.exports = new SchedulerService(); 