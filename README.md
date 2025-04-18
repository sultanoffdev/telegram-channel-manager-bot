# Telegram Bot для управления каналами

Многофункциональный Telegram бот для управления каналами, который помогает автоматизировать постинг, анализировать аудиторию, управлять рекламой и защищать ваши каналы.

## Функциональные возможности

- **📝 Постинг** - планирование и публикация постов в каналах
- **📅 Календарь** - визуальное управление расписанием публикаций
- **🔍 Сканинг** - анализ каналов и пользователей
- **💰 Закупы** - управление рекламными закупками
- **📢 Мои каналы** - управление подключенными каналами
- **🛡 Защита и Приём** - защита от ботов и автоматический приём заявок
- **🔄 Сети каналов** - объединение каналов для синхронизированного управления
- **⚙️ Настройки** - персонализация бота

## Технологии

- Node.js
- Telegraf.js
- MongoDB/Mongoose
- Moment.js
- Node-schedule

## Установка

```bash
# Клонирование репозитория
git clone https://github.com/ваш-аккаунт/telegram-channel-manager-bot.git
cd telegram-channel-manager-bot

# Установка зависимостей
npm install

# Настройка переменных окружения
# Создайте файл .env и заполните его по образцу .env.example

# Запуск
npm start
```

## Настройка базы данных

### Локальная разработка с MongoDB

1. Установите [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Установите [MongoDB Compass](https://www.mongodb.com/try/download/compass) (графический интерфейс для MongoDB)
3. Запустите MongoDB локально: 
   - Windows: MongoDB запускается как служба при установке
   - Linux: `sudo systemctl start mongod`
   - macOS: `brew services start mongodb-community`
4. Подключитесь к MongoDB через MongoDB Compass используя строку: `mongodb://127.0.0.1:27017`
5. Создайте базу данных с именем `telegram_bot`

### Использование MongoDB Atlas (для продакшн)

1. Создайте бесплатный кластер на [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Создайте пользователя базы данных
3. Получите строку подключения и обновите ее в `.env`:
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/telegram_bot?retryWrites=true&w=majority
```

## Настройка

Для работы бота необходимо создать файл `.env` со следующими параметрами:

```
# Bot Configuration
BOT_TOKEN=ваш_токен_бота_от_BotFather
ADMIN_IDS=ваш_id_в_телеграм

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/telegram_bot

# Payment Configuration (опционально)
PAYMENT_TOKEN=ваш_платежный_токен
PAYMENT_PROVIDER_TOKEN=ваш_провайдер_токен

# Default Settings
DEFAULT_TIMEZONE=Europe/Moscow
```

## Использование

1. Запустите бота командой `/start`
2. Добавьте ваши каналы в разделе "Мои каналы"
3. Используйте интерфейс для управления постами, защитой и прочими функциями

## Деплой на Render

Для размещения бота на [Render](https://render.com/):

1. Создайте аккаунт на Render
2. Добавьте новый Web Service, подключив GitHub репозиторий
3. Настройте сервис:
   - **Name**: telegram-channel-manager-bot
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
   - **Environment Variables**: Добавьте все необходимые переменные из файла `.env`
   - Для работы webhook добавьте следующие переменные:
     ```
     IS_RENDER=true
     WEBHOOK_DOMAIN=https://ваш-домен-на-render.onrender.com
     ```

### Режимы работы бота

Бот может работать в двух режимах:

1. **Long Polling** (по умолчанию) - бот регулярно опрашивает Telegram API на наличие новых сообщений. Этот режим подходит для разработки и простого деплоя.

2. **Webhook** - Telegram отправляет уведомления на ваш сервер. Этот режим более эффективен для продакшн.
   
   Для активации webhook:
   - Установите переменную окружения `IS_RENDER=true`
   - Укажите домен вашего приложения `WEBHOOK_DOMAIN=https://your-app.onrender.com`

## Лицензия

MIT

## Автор

Ваше имя 