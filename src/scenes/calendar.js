const { Scenes } = require('telegraf');
const { Markup } = require('telegraf');
const moment = require('moment-timezone');
const { Post } = require('../models/post');
const postService = require('../services/postService');
const { AdPost } = require('../models/adPost');
const adPostService = require('../services/adPostService');

const calendarScene = new Scenes.WizardScene(
  'calendar',
  // Шаг 1: Показ календаря с выбором типа отображаемых постов
  async (ctx) => {
    // Инициализация текущего месяца, если не задан
    if (!ctx.session.currentMonth) {
      ctx.session.currentMonth = moment().tz(ctx.session.user?.timezone || 'Europe/Moscow');
    } else {
      // Преобразуем строку обратно в объект moment
      ctx.session.currentMonth = moment(ctx.session.currentMonth).tz(ctx.session.user?.timezone || 'Europe/Moscow');
    }
    
    // Инициализация фильтра типов постов, по умолчанию показываем все
    if (!ctx.session.postFilter) {
      ctx.session.postFilter = 'all';
    }
    
    const currentMonth = ctx.session.currentMonth;
    const monthStart = currentMonth.clone().startOf('month');
    const monthEnd = currentMonth.clone().endOf('month');
    
    // Получаем контентные посты из базы данных
    const contentPosts = await Post.find({
      userId: ctx.from.id,
      scheduleTime: {
        $gte: monthStart.toDate(),
        $lte: monthEnd.toDate()
      },
      status: { $ne: 'deleted' }
    }).sort({ scheduleTime: 1 });
    
    // Получаем рекламные посты
    const adPosts = await AdPost.find({
      userId: ctx.from.id,
      startDate: { $lte: monthEnd.toDate() },
      endDate: { $gte: monthStart.toDate() },
      status: { $in: ['active', 'scheduled', 'pending'] }
    }).sort({ startDate: 1 });
    
    // Объединяем и фильтруем посты согласно выбранному фильтру
    let allPosts = [];
    
    if (ctx.session.postFilter === 'all' || ctx.session.postFilter === 'content') {
      // Конвертируем контентные посты для отображения в календаре
      allPosts = allPosts.concat(contentPosts.map(post => ({
        _id: post._id,
        date: moment(post.scheduleTime),
        type: 'content',
        status: post.status,
        title: truncateText(post.content.text || 'Медиа контент', 30),
        channelId: post.channelId
      })));
    }
    
    if (ctx.session.postFilter === 'all' || ctx.session.postFilter === 'ad') {
      // Конвертируем рекламные посты для отображения в календаре
      allPosts = allPosts.concat(adPosts.map(post => ({
        _id: post._id,
        date: moment(post.startDate), // используем дату начала для рекламных постов
        type: 'ad',
        status: post.status,
        title: truncateText(post.content || 'Рекламный пост', 30),
        budget: post.budget
      })));
    }
    
    // Создаем календарь
    const calendar = generateCalendar(currentMonth, allPosts);
    
    // Определяем текст для текущего фильтра
    let filterText = '';
    switch(ctx.session.postFilter) {
      case 'all': filterText = 'Все посты'; break;
      case 'content': filterText = 'Контентные посты'; break;
      case 'ad': filterText = 'Рекламные посты'; break;
    }
    
    // Отправляем календарь
    await ctx.reply(
      `📅 Календарь на ${currentMonth.format('MMMM YYYY')}\n📌 Фильтр: ${filterText}\n\n${calendar}`,
      Markup.keyboard([
        ['⬅️ Предыдущий месяц', '➡️ Следующий месяц'],
        ['📄 Контентные посты', '📣 Рекламные посты', '🔄 Все посты'],
        ['📝 Добавить пост', '🔙 Назад']
      ]).resize()
    );
    
    return ctx.wizard.next();
  },
  // Шаг 2: Обработка действий с календарем
  async (ctx) => {
    try {
      if (ctx.message.text === '🔙 Назад') {
        return ctx.scene.leave();
      } else if (ctx.message.text === '📝 Добавить пост') {
        return ctx.scene.enter('posting');
      } else if (ctx.message.text === '⬅️ Предыдущий месяц') {
        ctx.session.currentMonth = ctx.session.currentMonth.subtract(1, 'month');
        return ctx.wizard.selectStep(0);
      } else if (ctx.message.text === '➡️ Следующий месяц') {
        ctx.session.currentMonth = ctx.session.currentMonth.add(1, 'month');
        return ctx.wizard.selectStep(0);
      } else if (ctx.message.text === '📄 Контентные посты') {
        ctx.session.postFilter = 'content';
        return ctx.wizard.selectStep(0);
      } else if (ctx.message.text === '📣 Рекламные посты') {
        ctx.session.postFilter = 'ad';
        return ctx.wizard.selectStep(0);
      } else if (ctx.message.text === '🔄 Все посты') {
        ctx.session.postFilter = 'all';
        return ctx.wizard.selectStep(0);
      } else if (ctx.message.text.match(/^\d{1,2}$/)) {
        // Пользователь выбрал день месяца
        const day = parseInt(ctx.message.text);
        const currentMonth = ctx.session.currentMonth;
        
        // Проверяем, что день существует в текущем месяце
        if (day < 1 || day > currentMonth.daysInMonth()) {
          await ctx.reply('Пожалуйста, выберите корректный день месяца.');
          return ctx.wizard.selectStep(1);
        }
        
        // Устанавливаем выбранный день
        const selectedDate = currentMonth.clone().date(day);
        
        // Получаем посты на выбранную дату
        const startOfDay = selectedDate.clone().startOf('day');
        const endOfDay = selectedDate.clone().endOf('day');
        
        // Получаем контентные посты на выбранную дату
        const contentPosts = await Post.find({
          userId: ctx.from.id,
          scheduleTime: {
            $gte: startOfDay.toDate(),
            $lte: endOfDay.toDate()
          },
          status: { $ne: 'deleted' }
        }).sort({ scheduleTime: 1 });
        
        // Получаем рекламные посты, активные в выбранную дату
        const adPosts = await AdPost.find({
          userId: ctx.from.id,
          startDate: { $lte: endOfDay.toDate() },
          endDate: { $gte: startOfDay.toDate() },
          status: { $in: ['active', 'scheduled', 'pending'] }
        }).sort({ startDate: 1 });
        
        // Объединяем и фильтруем посты согласно выбранному фильтру
        let postsToShow = [];
        
        if (ctx.session.postFilter === 'all' || ctx.session.postFilter === 'content') {
          postsToShow = postsToShow.concat(contentPosts.map(post => ({
            _id: post._id,
            time: moment(post.scheduleTime).format('HH:mm'),
            type: 'content',
            status: post.status,
            title: post.content.text || 'Медиа контент',
            channelId: post.channelId instanceof Array ? post.channelId.join(', ') : post.channelId,
            original: post
          })));
        }
        
        if (ctx.session.postFilter === 'all' || ctx.session.postFilter === 'ad') {
          postsToShow = postsToShow.concat(adPosts.map(post => ({
            _id: post._id,
            time: moment(post.startDate).format('HH:mm'),
            type: 'ad',
            status: post.status,
            title: post.content || 'Рекламный пост',
            budget: post.budget,
            original: post
          })));
        }
        
        if (postsToShow.length === 0) {
          await ctx.reply(
            `На ${selectedDate.format('DD.MM.YYYY')} запланированных постов нет.`,
            Markup.keyboard([
              ['📝 Добавить пост на эту дату'],
              ['🔙 Вернуться к календарю']
            ]).resize()
          );
          
          ctx.session.selectedDate = selectedDate.format();
          ctx.session.action = 'add_post';
          return ctx.wizard.next();
        } else {
          // Показываем список постов на выбранную дату
          let message = `📅 Посты на ${selectedDate.format('DD.MM.YYYY')}:\n\n`;
          
          postsToShow.forEach((post, index) => {
            const icon = post.type === 'content' ? '📄' : '📣';
            const status = getStatusEmoji(post.status);
            message += `${index + 1}. ${icon} ${post.time} ${status} - ${truncateText(post.title, 30)}\n`;
          });
          
          // Создаем клавиатуру с постами
          const keyboard = [];
          postsToShow.forEach((post, index) => {
            const icon = post.type === 'content' ? '📄' : '📣';
            const status = getStatusEmoji(post.status);
            keyboard.push([Markup.button.callback(
              `${index + 1}. ${icon} ${post.time} ${status} - ${truncateText(post.title, 25)}`,
              `post_${post.type}_${post._id}`
            )]);
          });
          
          keyboard.push([Markup.button.callback('📝 Добавить пост', 'add_post')]);
          keyboard.push([Markup.button.callback('🔙 Вернуться к календарю', 'back_to_calendar')]);
          
          await ctx.reply(
            message,
            Markup.inlineKeyboard(keyboard)
          );
          
          ctx.session.selectedDate = selectedDate.format();
          ctx.session.postsForDate = postsToShow; // Сохраняем для использования в следующем шаге
          return ctx.wizard.next();
        }
      } else {
        await ctx.reply('Пожалуйста, выберите день месяца или действие из меню.');
        return ctx.wizard.selectStep(1);
      }
    } catch (error) {
      console.error('Error handling calendar action:', error);
      await ctx.reply('Произошла ошибка при обработке действия. Пожалуйста, попробуйте снова.');
      return ctx.wizard.selectStep(0);
    }
  },
  // Шаг 3: Обработка выбора поста или действия
  async (ctx) => {
    if (ctx.callbackQuery) {
      if (ctx.callbackQuery.data === 'back_to_calendar') {
        return ctx.wizard.selectStep(0);
      } else if (ctx.callbackQuery.data === 'add_post') {
        ctx.session.action = 'add_post';
        return ctx.scene.enter('posting', { date: ctx.session.selectedDate });
      } else if (ctx.callbackQuery.data.startsWith('post_')) {
        const [, postType, postId] = ctx.callbackQuery.data.split('_');
        
        try {
          let post;
          if (postType === 'content') {
            post = await postService.getPostById(postId, ctx.from.id);
          } else if (postType === 'ad') {
            post = await adPostService.getAdPostById(postId, ctx.from.id);
          }
          
          if (!post) {
            await ctx.reply('Пост не найден.');
            return ctx.wizard.selectStep(0);
          }
          
          // Показываем детали поста и действия
          let message = '';
          let keyboard = [];
          
          if (postType === 'content') {
            const postTime = moment(post.scheduleTime).format('DD.MM.YYYY HH:mm');
            message = `📄 <b>Контентный пост на ${postTime}</b>\n\n`;
            
            if (post.channelId instanceof Array) {
              message += `<b>Каналы:</b> ${post.channelId.join(', ')}\n`;
            } else {
              message += `<b>Канал:</b> ${post.channelId}\n`;
            }
            
            message += `<b>Статус:</b> ${getStatusEmoji(post.status)} ${getStatusText(post.status)}\n\n`;
            
            if (post.content.text) {
              message += `<b>Содержание:</b>\n${post.content.text.substring(0, 200)}${post.content.text.length > 200 ? '...' : ''}\n\n`;
            } else if (post.content.photo) {
              message += `<b>Содержание:</b> Фото с подписью\n\n`;
            } else if (post.content.video) {
              message += `<b>Содержание:</b> Видео с подписью\n\n`;
            } else {
              message += `<b>Содержание:</b> Медиа контент\n\n`;
            }
            
            if (post.tags && post.tags.length > 0) {
              message += `<b>Метки:</b> ${post.tags.join(', ')}\n`;
            }
            
            keyboard = [
              [Markup.button.callback('✏️ Редактировать пост', `edit_content_${post._id}`)],
              [Markup.button.callback('🗑 Удалить пост', `delete_content_${post._id}`)],
              [Markup.button.callback('🔙 Вернуться к списку постов', `back_to_posts`)]
            ];
          } else if (postType === 'ad') {
            const startDate = moment(post.startDate).format('DD.MM.YYYY');
            const endDate = moment(post.endDate).format('DD.MM.YYYY');
            
            message = `📣 <b>Рекламный пост</b>\n\n`;
            message += `<b>Период:</b> ${startDate} - ${endDate}\n`;
            message += `<b>Бюджет:</b> ${post.budget} руб.\n`;
            message += `<b>Статус:</b> ${getStatusEmoji(post.status)} ${getStatusText(post.status)}\n\n`;
            
            if (post.content) {
              message += `<b>Содержание:</b>\n${post.content.substring(0, 200)}${post.content.length > 200 ? '...' : ''}\n\n`;
            }
            
            if (post.targetCategories && post.targetCategories.length > 0) {
              message += `<b>Целевые категории:</b> ${post.targetCategories.join(', ')}\n`;
            }
            
            if (post.keywords && post.keywords.length > 0) {
              message += `<b>Ключевые слова:</b> ${post.keywords.join(', ')}\n`;
            }
            
            keyboard = [
              [Markup.button.callback('✏️ Редактировать пост', `edit_ad_${post._id}`)],
              [Markup.button.callback('🗑 Удалить пост', `delete_ad_${post._id}`)],
              [Markup.button.callback('📊 Статистика', `stats_ad_${post._id}`)],
              [Markup.button.callback('🔙 Вернуться к списку постов', `back_to_posts`)]
            ];
          }
          
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard(keyboard)
          });
          
          ctx.session.selectedPostId = postId;
          ctx.session.selectedPostType = postType;
          return ctx.wizard.next();
        } catch (error) {
          console.error('Error getting post details:', error);
          await ctx.reply('Произошла ошибка при получении информации о посте. Пожалуйста, попробуйте снова.');
          return ctx.wizard.selectStep(0);
        }
      }
    } else if (ctx.message.text === '📝 Добавить пост на эту дату') {
      ctx.session.action = 'add_post';
      return ctx.scene.enter('posting', { date: ctx.session.selectedDate });
    } else if (ctx.message.text === '🔙 Вернуться к календарю') {
      return ctx.wizard.selectStep(0);
    } else {
      await ctx.reply('Пожалуйста, выберите действие из меню.');
      return ctx.wizard.selectStep(2);
    }
  },
  // Шаг 4: Обработка действий с выбранным постом
  async (ctx) => {
    if (ctx.callbackQuery) {
      const action = ctx.callbackQuery.data;
      
      if (action === 'back_to_posts') {
        // Возвращаемся к списку постов на выбранную дату
        return ctx.wizard.selectStep(2);
      } else if (action === 'back_to_calendar') {
        return ctx.wizard.selectStep(0);
      } else if (action.startsWith('edit_')) {
        const [, postType, postId] = action.split('_');
        
        if (postType === 'content') {
          return ctx.scene.enter('posting', { postId, edit: true });
        } else if (postType === 'ad') {
          // Переходим в сцену редактирования рекламных постов
          // Если такой сцены нет, создайте ее или адаптируйте существующую
          await ctx.reply(
            'Переход к редактированию рекламного поста...',
            Markup.removeKeyboard()
          );
          return ctx.scene.enter('purchases', { action: 'edit_ad', postId });
        }
      } else if (action.startsWith('delete_')) {
        const [, postType, postId] = action.split('_');
        
        // Подтверждение удаления
        await ctx.reply(
          'Вы уверены, что хотите удалить этот пост?',
          Markup.inlineKeyboard([
            [Markup.button.callback('✅ Да, удалить', `confirm_delete_${postType}_${postId}`)],
            [Markup.button.callback('❌ Нет, отменить', 'back_to_posts')]
          ])
        );
      } else if (action.startsWith('confirm_delete_')) {
        const [, , postType, postId] = action.split('_');
        
        try {
          if (postType === 'content') {
            await postService.deletePost(postId, ctx.from.id);
            await ctx.reply('Контентный пост успешно удален.');
          } else if (postType === 'ad') {
            await adPostService.deleteAdPost(postId, ctx.from.id);
            await ctx.reply('Рекламный пост успешно удален.');
          }
          
          return ctx.wizard.selectStep(0);
        } catch (error) {
          console.error('Error deleting post:', error);
          await ctx.reply(`Ошибка при удалении поста: ${error.message}`);
          return ctx.wizard.selectStep(0);
        }
      } else if (action.startsWith('stats_')) {
        const [, , postId] = action.split('_');
        
        try {
          const adPost = await adPostService.getAdPostById(postId, ctx.from.id);
          
          if (!adPost) {
            await ctx.reply('Рекламный пост не найден.');
            return ctx.wizard.selectStep(0);
          }
          
          // Показываем статистику рекламного поста
          const message = `
📊 <b>Статистика рекламного поста</b>

<b>Просмотры:</b> ${adPost.stats?.views || 0}
<b>Клики:</b> ${adPost.stats?.clicks || 0}
<b>Взаимодействия:</b> ${adPost.stats?.interactions || 0}
<b>Конверсии:</b> ${adPost.stats?.conversions || 0}

<b>CTR:</b> ${calculateCTR(adPost.stats?.views, adPost.stats?.clicks)}%
<b>Стоимость клика:</b> ${calculateCPC(adPost.budget, adPost.stats?.clicks)} руб.
<b>Стоимость просмотра:</b> ${calculateCPM(adPost.budget, adPost.stats?.views)} руб.
          `;
          
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('🔙 Вернуться к посту', 'back_to_post')],
              [Markup.button.callback('📊 Подробный отчет', `detailed_stats_${postId}`)]
            ])
          });
        } catch (error) {
          console.error('Error getting ad post stats:', error);
          await ctx.reply('Произошла ошибка при получении статистики. Пожалуйста, попробуйте снова.');
          return ctx.wizard.selectStep(0);
        }
      } else if (action === 'back_to_post') {
        // Возвращаемся к просмотру поста
        return ctx.wizard.selectStep(3);
      }
    } else {
      await ctx.reply('Пожалуйста, используйте кнопки для навигации.');
      return ctx.wizard.selectStep(0);
    }
  }
);

// Функция для усечения текста
function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Функция для вычисления CTR
function calculateCTR(views, clicks) {
  if (!views || views === 0 || !clicks) return '0.00';
  return ((clicks / views) * 100).toFixed(2);
}

// Функция для вычисления стоимости клика
function calculateCPC(budget, clicks) {
  if (!budget || !clicks || clicks === 0) return '0.00';
  return (budget / clicks).toFixed(2);
}

// Функция для вычисления стоимости 1000 просмотров
function calculateCPM(budget, views) {
  if (!budget || !views || views === 0) return '0.00';
  return ((budget / views) * 1000).toFixed(2);
}

// Функция для генерации календаря
function generateCalendar(month, posts) {
  const firstDay = month.clone().startOf('month');
  const lastDay = month.clone().endOf('month');
  const daysInMonth = lastDay.date();
  const startingDay = firstDay.day(); // 0 = воскресенье, 1 = понедельник и т.д.
  
  // Создаем объект дней с постами
  const daysWithPosts = {};
  posts.forEach(post => {
    const day = post.date.date();
    if (!daysWithPosts[day]) {
      daysWithPosts[day] = { content: 0, ad: 0 };
    }
    daysWithPosts[day][post.type]++;
  });
  
  // Заголовки дней недели
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  let calendar = weekDays.join(' ') + '\n';
  
  // Добавляем пустые дни в начале месяца
  let dayCount = 1;
  let week = '';
  for (let i = 0; i < startingDay; i++) {
    week += '   ';
  }
  
  // Добавляем дни месяца
  for (let i = 1; i <= daysInMonth; i++) {
    // Если это начало недели и не первый день месяца
    if ((startingDay + i - 1) % 7 === 0 && i > 1) {
      calendar += week + '\n';
      week = '';
    }
    
    // Добавляем день с индикатором типа постов
    if (daysWithPosts[i]) {
      // Маркировка дня в зависимости от типов постов
      if (daysWithPosts[i].content > 0 && daysWithPosts[i].ad > 0) {
        week += `[${i}]`; // Есть оба типа постов
      } else if (daysWithPosts[i].content > 0) {
        week += `(${i})`; // Только контентные посты
      } else if (daysWithPosts[i].ad > 0) {
        week += `{${i}}`; // Только рекламные посты
      }
    } else {
      // Нет постов на этот день
      week += `${i.toString().padStart(2, ' ')} `;
    }
    
    dayCount++;
  }
  
  // Добавляем последнюю неделю
  calendar += week;
  
  // Добавляем легенду
  calendar += '\n\n[день] - есть контентные и рекламные посты';
  calendar += '\n(день) - есть контентные посты';
  calendar += '\n{день} - есть рекламные посты';
  
  return calendar;
}

// Функция для получения эмодзи статуса
function getStatusEmoji(status) {
  switch (status) {
    case 'scheduled':
      return '🕒';
    case 'published':
      return '✅';
    case 'active':
      return '✅';
    case 'pending':
      return '⏳';
    case 'failed':
      return '❌';
    case 'rejected':
      return '❌';
    case 'deleted':
      return '🗑';
    case 'completed':
      return '🏁';
    default:
      return '❓';
  }
}

// Функция для получения текста статуса
function getStatusText(status) {
  switch (status) {
    case 'scheduled':
      return 'Запланирован';
    case 'published':
      return 'Опубликован';
    case 'active':
      return 'Активен';
    case 'pending':
      return 'Ожидает подтверждения';
    case 'failed':
      return 'Ошибка публикации';
    case 'rejected':
      return 'Отклонен';
    case 'deleted':
      return 'Удален';
    case 'completed':
      return 'Завершен';
    default:
      return 'Неизвестно';
  }
}

// Обработка callback-запросов
calendarScene.action(/.*/, (ctx) => {
  ctx.answerCbQuery();
  return ctx.wizard.next();
});

module.exports = calendarScene; 