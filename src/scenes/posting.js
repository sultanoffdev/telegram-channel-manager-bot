const { Scenes } = require('telegraf');
const { Markup } = require('telegraf');
const schedule = require('node-schedule');
const { Post } = require('../models/post');
const { User } = require('../models/user');

const postingScene = new Scenes.WizardScene(
  'posting',
  // Шаг 1: Выбор действия
  async (ctx) => {
    try {
      await ctx.reply(
        '📝 Управление постами\n\n' +
        'Выберите действие:',
        Markup.keyboard([
          ['📄 Контентный пост', '📣 Рекламный пост'],
          ['✏️ Редактировать пост', '📅 Запланированные посты'],
          ['🔙 Назад']
        ]).resize()
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error('Error in posting scene step 1:', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  // Шаг 2: Обработка выбора действия
  async (ctx) => {
    try {
      if (ctx.message.text === '🔙 Назад') {
        return ctx.scene.leave();
      }

      if (ctx.message.text === '📄 Контентный пост' || ctx.message.text === '📣 Рекламный пост') {
        const user = await User.findOne({ telegramId: ctx.from.id });
        const channels = user?.channels || [];
        
        if (channels.length === 0) {
          await ctx.reply('У вас пока нет добавленных каналов. Добавьте канал в разделе "Мои каналы"');
          return ctx.scene.leave();
        }

        // Создаем клавиатуру с каналами и опцией "Выбрать несколько"
        const keyboard = [
          ...channels.map(channel => [Markup.button.callback(channel.title, `channel_${channel.id}`)]),
          [Markup.button.callback('📢 Выбрать несколько каналов', 'select_multiple')]
        ];

        await ctx.reply(
          '1️⃣ Выберите канал или сеть каналов для публикации:',
          Markup.inlineKeyboard(keyboard)
        );
        
        // Определяем тип поста (контентный или рекламный)
        ctx.session.postType = 'new';
        ctx.session.contentType = ctx.message.text === '📄 Контентный пост' ? 'content' : 'ad';
        return ctx.wizard.next();
      }

      if (ctx.message.text === '✏️ Редактировать пост') {
        const posts = await Post.find({
          userId: ctx.from.id,
          status: 'scheduled'
        }).sort({ scheduleTime: 1 });

        if (posts.length === 0) {
          await ctx.reply('У вас нет запланированных постов для редактирования.');
          return ctx.wizard.selectStep(0);
        }

        const keyboard = posts.map(post => {
          const date = new Date(post.scheduleTime);
          const dateStr = date.toLocaleString('ru-RU');
          const contentType = post.tags && post.tags.includes('ad') ? '📣 Реклама' : '📄 Контент';
          return [Markup.button.callback(`${dateStr} - ${contentType} - ${post.content.text?.substring(0, 20) || 'Медиа контент'}...`, `edit_post_${post._id}`)];
        });

        await ctx.reply(
          'Выберите пост для редактирования:',
          Markup.inlineKeyboard(keyboard)
        );
        ctx.session.postType = 'edit';
        return ctx.wizard.next();
      }

      if (ctx.message.text === '📅 Запланированные посты') {
        const posts = await Post.find({
          userId: ctx.from.id,
          status: 'scheduled'
        }).sort({ scheduleTime: 1 });

        if (posts.length === 0) {
          await ctx.reply('У вас нет запланированных постов.');
          return ctx.wizard.selectStep(0);
        }

        let message = '📅 Запланированные посты:\n\n';
        posts.forEach((post, index) => {
          const date = new Date(post.scheduleTime);
          const contentType = post.tags && post.tags.includes('ad') ? '📣 Реклама' : '📄 Контент';
          message += `${index + 1}. ${date.toLocaleString('ru-RU')} - ${contentType}\n`;
          message += `Каналы: ${post.channelId.length}\n`;
          if (post.content.text) {
            message += `Текст: ${post.content.text.substring(0, 50)}${post.content.text.length > 50 ? '...' : ''}\n`;
          } else {
            message += `Контент: Медиа\n`;
          }
          message += `Метки: ${post.tags ? post.tags.join(', ') : 'Нет'}\n\n`;
        });

        await ctx.reply(message);
        return ctx.wizard.selectStep(0);
      }

      await ctx.reply('Пожалуйста, выберите действие из меню.');
      return ctx.wizard.selectStep(0);
    } catch (error) {
      console.error('Error in posting scene step 2:', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  // Шаг 3: Получение контента
  async (ctx) => {
    try {
      if (ctx.session.postType === 'new') {
        if (ctx.callbackQuery) {
          if (ctx.callbackQuery.data === 'select_multiple') {
            const user = await User.findOne({ telegramId: ctx.from.id });
            const channels = user?.channels || [];
            
            const keyboard = channels.map(channel => [
              Markup.button.callback(
                channel.title + (ctx.session.selectedChannels?.includes(channel.id) ? ' ✅' : ''),
                `toggle_${channel.id}`
              )
            ]);
            keyboard.push([Markup.button.callback('✅ Подтвердить выбор', 'confirm_channels')]);

            await ctx.editMessageText(
              '1️⃣ Выберите каналы для публикации:',
              Markup.inlineKeyboard(keyboard)
            );
            return;
          }

          if (ctx.callbackQuery.data === 'confirm_channels') {
            if (!ctx.session.selectedChannels?.length) {
              await ctx.reply('Пожалуйста, выберите хотя бы один канал.');
              return;
            }
          } else if (ctx.callbackQuery.data.startsWith('toggle_')) {
            const channelId = ctx.callbackQuery.data.replace('toggle_', '');
            ctx.session.selectedChannels = ctx.session.selectedChannels || [];
            
            const index = ctx.session.selectedChannels.indexOf(channelId);
            if (index === -1) {
              ctx.session.selectedChannels.push(channelId);
            } else {
              ctx.session.selectedChannels.splice(index, 1);
            }

            const user = await User.findOne({ telegramId: ctx.from.id });
            const channels = user?.channels || [];
            
            const keyboard = channels.map(channel => [
              Markup.button.callback(
                channel.title + (ctx.session.selectedChannels.includes(channel.id) ? ' ✅' : ''),
                `toggle_${channel.id}`
              )
            ]);
            keyboard.push([Markup.button.callback('✅ Подтвердить выбор', 'confirm_channels')]);

            await ctx.editMessageText(
              '1️⃣ Выберите каналы для публикации:',
              Markup.inlineKeyboard(keyboard)
            );
            return;
          } else {
            ctx.session.selectedChannels = [ctx.callbackQuery.data.replace('channel_', '')];
          }

          // Запрашиваем контент в зависимости от типа поста
          let message = '2️⃣ Отправьте контент для публикации:\n\n';
          
          if (ctx.session.contentType === 'content') {
            message += '📄 Контентный пост может содержать:\n' +
                      '- Текст\n' +
                      '- Фото\n' +
                      '- Видео\n' +
                      '- Документ\n' +
                      '- Опрос\n' +
                      '- Или их комбинацию';
          } else if (ctx.session.contentType === 'ad') {
            message += '📣 Рекламный пост может содержать:\n' +
                      '- Текст с ссылками/хэштегами\n' +
                      '- Фото с подписью\n' +
                      '- Видео с подписью\n' +
                      '- Кнопки и другие элементы для продвижения';
          }
          
          await ctx.reply(message);
          return ctx.wizard.next();
        }
      } else if (ctx.session.postType === 'edit') {
        if (ctx.callbackQuery) {
          const postId = ctx.callbackQuery.data.replace('edit_post_', '');
          const post = await Post.findById(postId);
          
          if (!post) {
            await ctx.reply('Пост не найден.');
            return ctx.wizard.selectStep(0);
          }

          ctx.session.editingPost = post;
          ctx.session.selectedChannels = post.channelId;
          ctx.session.contentType = post.tags && post.tags.includes('ad') ? 'ad' : 'content';
          
          await ctx.reply(
            '✏️ Отправьте новый контент для поста:\n\n' +
            '- Текст\n' +
            '- Фото\n' +
            '- Видео\n' +
            '- Документ\n' +
            '- Опрос\n' +
            '- Или их комбинацию'
          );
          return ctx.wizard.next();
        }
      }

      await ctx.reply('Пожалуйста, выберите канал или действие.');
      return ctx.wizard.selectStep(1);
    } catch (error) {
      console.error('Error in posting scene step 3:', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  // Шаг 4: Настройка параметров публикации
  async (ctx) => {
    try {
      // Сохраняем контент поста
      ctx.session.content = ctx.message;
      
      // Добавляем метку о типе поста если это новый пост
      if (ctx.session.postType === 'new') {
        ctx.session.tags = ctx.session.tags || [];
        if (ctx.session.contentType === 'ad' && !ctx.session.tags.includes('ad')) {
          ctx.session.tags.push('ad');
        }
      }

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('🏷 Добавить метки', 'add_tags'),
          Markup.button.callback('⚙️ Настройки', 'settings')
        ],
        [
          Markup.button.callback('📝 Опубликовать сейчас', 'publish_now'),
          Markup.button.callback('📅 Запланировать', 'schedule')
        ]
      ]);

      await ctx.reply(
        '3️⃣ Выберите действие с постом:',
        keyboard
      );
      return ctx.wizard.next();
    } catch (error) {
      console.error('Error in posting scene step 4:', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  },
  // Шаг 5: Обработка действий с постом
  async (ctx) => {
    try {
      if (!ctx.callbackQuery) {
        await ctx.reply('Пожалуйста, выберите действие из меню.');
        return;
      }

      const action = ctx.callbackQuery.data;

      if (action === 'add_tags') {
        await ctx.reply(
          'Введите метки через запятую (например: #реклама, #анонс, #новость)'
        );
        ctx.session.awaitingTags = true;
        return;
      }

      if (action === 'settings') {
        // Расширенные настройки в зависимости от типа поста
        let settingsKeyboard = [];
        
        // Общие настройки для всех типов постов
        settingsKeyboard.push([
          Markup.button.callback('🔁 Автоповтор', 'toggle_repeat'),
          Markup.button.callback('🔕 Без уведомления', 'toggle_silent')
        ]);
        
        // Дополнительные настройки для контентных постов
        if (ctx.session.contentType === 'content') {
          settingsKeyboard.push([
            Markup.button.callback('📊 Защита от копирования', 'toggle_protection')
          ]);
        }
        
        // Дополнительные настройки для рекламных постов
        if (ctx.session.contentType === 'ad') {
          settingsKeyboard.push([
            Markup.button.callback('🔗 Кнопки', 'add_buttons')
          ]);
        }
        
        settingsKeyboard.push([Markup.button.callback('✅ Готово', 'settings_done')]);

        // Создаем текст сообщения с текущими настройками
        let settingsText = '⚙️ Настройки публикации:\n\n';
        settingsText += `🔁 Автоповтор: ${ctx.session.settings?.repeat ? '✅' : '❌'}\n`;
        settingsText += `🔕 Без уведомления: ${ctx.session.settings?.silent ? '✅' : '❌'}\n`;
        
        if (ctx.session.contentType === 'content') {
          settingsText += `📊 Защита от копирования: ${ctx.session.settings?.protection ? '✅' : '❌'}\n`;
        }
        
        if (ctx.session.contentType === 'ad') {
          settingsText += `🔗 Кнопки: ${ctx.session.settings?.buttons ? '✅' : '❌'}\n`;
        }

        await ctx.editMessageText(
          settingsText,
          Markup.inlineKeyboard(settingsKeyboard)
        );
        return;
      }

      if (action === 'publish_now') {
        // Публикуем пост сейчас
        const postData = {
          userId: ctx.from.id,
          channelId: ctx.session.selectedChannels,
          content: ctx.session.content,
          scheduleTime: new Date(),
          status: 'scheduled',
          tags: ctx.session.tags || [],
          settings: ctx.session.settings || {}
        };

        let post;
        if (ctx.session.postType === 'edit' && ctx.session.editingPost) {
          // Обновляем существующий пост
          post = await Post.findByIdAndUpdate(
            ctx.session.editingPost._id,
            { $set: postData },
            { new: true }
          );
        } else {
          // Создаем новый пост
          post = new Post(postData);
          await post.save();
        }

        // Публикуем в каждый выбранный канал
        for (const channelId of ctx.session.selectedChannels) {
          try {
            if (ctx.session.content.photo) {
              // Отправка фото
              await ctx.telegram.sendPhoto(channelId, ctx.session.content.photo[0].file_id, {
                caption: ctx.session.content.caption || '',
                parse_mode: 'HTML',
                disable_notification: ctx.session.settings?.silent
              });
            } else if (ctx.session.content.video) {
              // Отправка видео
              await ctx.telegram.sendVideo(channelId, ctx.session.content.video.file_id, {
                caption: ctx.session.content.caption || '',
                parse_mode: 'HTML',
                disable_notification: ctx.session.settings?.silent
              });
            } else if (ctx.session.content.document) {
              // Отправка документа
              await ctx.telegram.sendDocument(channelId, ctx.session.content.document.file_id, {
                caption: ctx.session.content.caption || '',
                parse_mode: 'HTML',
                disable_notification: ctx.session.settings?.silent
              });
            } else if (ctx.session.content.text) {
              // Отправка текста
              await ctx.telegram.sendMessage(channelId, ctx.session.content.text, {
                parse_mode: 'HTML',
                disable_notification: ctx.session.settings?.silent
              });
            }
          } catch (error) {
            console.error(`Error publishing to channel ${channelId}:`, error);
          }
        }

        // Обновляем статус поста на опубликованный
        await Post.findByIdAndUpdate(post._id, { status: 'published' });

        await ctx.reply('✅ Пост успешно опубликован!');
        return ctx.scene.leave();
      }

      if (action === 'schedule') {
        await ctx.reply(
          'Введите дату и время публикации в формате ДД.ММ.ГГГГ ЧЧ:ММ\n' +
          'Например: 25.04.2024 15:30'
        );
        ctx.session.awaitingSchedule = true;
        return;
      }

      // Обработка настроек
      if (action.startsWith('toggle_')) {
        ctx.session.settings = ctx.session.settings || {};
        const setting = action.replace('toggle_', '');
        ctx.session.settings[setting] = !ctx.session.settings[setting];

        // Формируем клавиатуру в зависимости от типа поста
        let settingsKeyboard = [];
        
        settingsKeyboard.push([
          Markup.button.callback('🔁 Автоповтор', 'toggle_repeat'),
          Markup.button.callback('🔕 Без уведомления', 'toggle_silent')
        ]);
        
        if (ctx.session.contentType === 'content') {
          settingsKeyboard.push([
            Markup.button.callback('📊 Защита от копирования', 'toggle_protection')
          ]);
        }
        
        if (ctx.session.contentType === 'ad') {
          settingsKeyboard.push([
            Markup.button.callback('🔗 Кнопки', 'add_buttons')
          ]);
        }
        
        settingsKeyboard.push([Markup.button.callback('✅ Готово', 'settings_done')]);

        // Создаем текст с текущими настройками
        let settingsText = '⚙️ Настройки публикации:\n\n';
        settingsText += `🔁 Автоповтор: ${ctx.session.settings.repeat ? '✅' : '❌'}\n`;
        settingsText += `🔕 Без уведомления: ${ctx.session.settings.silent ? '✅' : '❌'}\n`;
        
        if (ctx.session.contentType === 'content') {
          settingsText += `📊 Защита от копирования: ${ctx.session.settings.protection ? '✅' : '❌'}\n`;
        }
        
        if (ctx.session.contentType === 'ad') {
          settingsText += `🔗 Кнопки: ${ctx.session.settings.buttons ? '✅' : '❌'}\n`;
        }

        await ctx.editMessageText(
          settingsText,
          Markup.inlineKeyboard(settingsKeyboard)
        );
        return;
      }

      if (action === 'settings_done') {
        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback('📝 Опубликовать сейчас', 'publish_now'),
            Markup.button.callback('📅 Запланировать', 'schedule')
          ]
        ]);

        await ctx.editMessageText(
          '3️⃣ Выберите действие с постом:',
          keyboard
        );
        return;
      }

    } catch (error) {
      console.error('Error in posting scene step 5:', error);
      await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
      return ctx.scene.leave();
    }
  }
);

// Обработка текстовых сообщений для тегов и расписания
postingScene.on('text', async (ctx) => {
  try {
    if (ctx.session.awaitingTags) {
      ctx.session.tags = ctx.message.text.split(',').map(tag => tag.trim());
      
      // Добавляем метку о типе поста, если она отсутствует
      if (ctx.session.contentType === 'ad' && !ctx.session.tags.includes('ad')) {
        ctx.session.tags.push('ad');
      }
      
      ctx.session.awaitingTags = false;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('📝 Опубликовать сейчас', 'publish_now'),
          Markup.button.callback('📅 Запланировать', 'schedule')
        ]
      ]);

      await ctx.reply(
        `✅ Метки добавлены: ${ctx.session.tags.join(', ')}\n\n` +
        'Выберите действие:',
        keyboard
      );
      return;
    }

    if (ctx.session.awaitingSchedule) {
      const scheduleTime = ctx.message.text;
      const [datePart, timePart] = scheduleTime.split(' ');
      const [day, month, year] = datePart.split('.');
      const [hours, minutes] = timePart.split(':');
      
      const jobDate = new Date(year, month - 1, day, hours, minutes);

      if (isNaN(jobDate.getTime())) {
        await ctx.reply('❌ Неверный формат даты. Попробуйте еще раз в формате ДД.ММ.ГГГГ ЧЧ:ММ');
        return;
      }

      if (jobDate <= new Date()) {
        await ctx.reply('❌ Дата публикации должна быть в будущем. Попробуйте еще раз.');
        return;
      }

      // Подготовка данных поста
      const postData = {
        userId: ctx.from.id,
        channelId: ctx.session.selectedChannels,
        content: ctx.session.content,
        scheduleTime: jobDate,
        status: 'scheduled',
        tags: ctx.session.tags || [],
        settings: ctx.session.settings || {}
      };

      let post;
      if (ctx.session.postType === 'edit' && ctx.session.editingPost) {
        // Обновляем существующий пост
        post = await Post.findByIdAndUpdate(
          ctx.session.editingPost._id,
          { $set: postData },
          { new: true }
        );
        
        // Отменяем предыдущее расписание, если оно было
        const jobName = `post_${ctx.session.editingPost._id}`;
        const existingJob = schedule.scheduledJobs[jobName];
        if (existingJob) {
          existingJob.cancel();
        }
      } else {
        // Создаем новый пост
        post = new Post(postData);
        await post.save();
      }

      // Планируем публикацию с уникальным именем задачи
      const jobName = `post_${post._id}`;
      schedule.scheduleJob(jobName, jobDate, async () => {
        try {
          for (const channelId of post.channelId) {
            try {
              if (post.content.photo) {
                // Отправка фото
                await ctx.telegram.sendPhoto(channelId, post.content.photo[0].file_id, {
                  caption: post.content.caption || '',
                  parse_mode: 'HTML',
                  disable_notification: post.settings?.silent
                });
              } else if (post.content.video) {
                // Отправка видео
                await ctx.telegram.sendVideo(channelId, post.content.video.file_id, {
                  caption: post.content.caption || '',
                  parse_mode: 'HTML',
                  disable_notification: post.settings?.silent
                });
              } else if (post.content.document) {
                // Отправка документа
                await ctx.telegram.sendDocument(channelId, post.content.document.file_id, {
                  caption: post.content.caption || '',
                  parse_mode: 'HTML',
                  disable_notification: post.settings?.silent
                });
              } else if (post.content.text) {
                // Отправка текста
                await ctx.telegram.sendMessage(channelId, post.content.text, {
                  parse_mode: 'HTML',
                  disable_notification: post.settings?.silent
                });
              }
            } catch (channelError) {
              console.error(`Error publishing to channel ${channelId}:`, channelError);
            }
          }
          
          // Обновляем статус поста
          await Post.findByIdAndUpdate(post._id, { status: 'published' });
          
          // Если включен автоповтор, создаем новый пост на следующий период
          if (post.settings?.repeat) {
            // Базовая логика для повтора (например, через 24 часа)
            const nextDate = new Date(jobDate.getTime() + 24 * 60 * 60 * 1000);
            
            const newPost = new Post({
              ...postData,
              scheduleTime: nextDate
            });
            await newPost.save();
            
            // Планируем публикацию нового поста
            const newJobName = `post_${newPost._id}`;
            schedule.scheduleJob(newJobName, nextDate, /* такая же функция */);
          }
        } catch (error) {
          console.error('Error publishing scheduled post:', error);
          await Post.findByIdAndUpdate(post._id, { status: 'failed' });
        }
      });

      // Формируем сообщение о запланированном посте
      let postType = ctx.session.contentType === 'ad' ? '📣 Рекламный' : '📄 Контентный';
      await ctx.reply(
        '✅ Пост успешно запланирован!\n\n' +
        `📅 Дата публикации: ${jobDate.toLocaleString('ru-RU')}\n` +
        `📢 Каналы: ${ctx.session.selectedChannels.length}\n` +
        `📝 Тип: ${postType}\n` +
        (ctx.session.tags && ctx.session.tags.length > 0 ? `🏷 Метки: ${ctx.session.tags.join(', ')}\n` : '') +
        '\nВы можете просмотреть запланированные посты в разделе "📅 Запланированные посты"'
      );

      ctx.session.awaitingSchedule = false;
      return ctx.scene.leave();
    }
  } catch (error) {
    console.error('Error handling text message:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    return ctx.scene.leave();
  }
});

// Обработка callback-запросов
postingScene.action(/.*/, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    return ctx.wizard.next();
  } catch (error) {
    console.error('Error in posting scene action:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
    return ctx.scene.leave();
  }
});

module.exports = postingScene; 