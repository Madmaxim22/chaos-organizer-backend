import Router from 'koa-router';
import { dataStore } from './DataStore.js';
import { Util } from './Util.js';

const router = new Router();

// Базовый маршрут для проверки работоспособности
router.get('/', (ctx) => {
  ctx.body = {
    message: 'Chaos Organizer Backend is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      messages: '/api/messages',
      reminders: '/api/reminders',
      commands: '/api/commands',
      attachments: '/api/attachments',
      export: '/api/export',
      import: '/api/import',
      events: '/api/events',
    },
  };
});

// Получить все сообщения (с пагинацией)
router.get('/api/messages', (ctx) => {
  const { offset = 0, limit = 10 } = ctx.query;
  const start = parseInt(offset, 10);
  const count = parseInt(limit, 10);
  const sorted = dataStore.messages.sort((a, b) => b.timestamp - a.timestamp); // новейшие первыми
  const paginated = sorted.slice(start, start + count);
  ctx.body = {
    messages: paginated,
    total: dataStore.messages.length,
    offset: start,
    limit: count,
    pinned: dataStore.pinnedMessage,
    favorites: Array.from(dataStore.favorites),
  };
});

// Получить одно сообщение по ID
router.get('/api/messages/:id', (ctx) => {
  const message = dataStore.findMessageById(ctx.params.id);
  if (!message) {
    ctx.status = 404;
    ctx.body = { error: 'Сообщение не найдено' };
    return;
  }
  ctx.body = message;
});

// Добавить новое сообщение
router.post('/api/messages', (ctx) => {
  const { type, content, author, metadata, encrypted } = ctx.request.body;
  if (!type || !content) {
    ctx.status = 400;
    ctx.body = { error: 'Поля type и content обязательны' };
    return;
  }
  const message = dataStore.addMessage({ type, content, author, metadata, encrypted });
  ctx.status = 201;
  ctx.body = message;
});

// Удалить сообщение по ID
router.delete('/api/messages/:id', (ctx) => {
  const deleted = dataStore.deleteMessage(ctx.params.id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'Сообщение не найдено' };
    return;
  }
  ctx.body = { success: true };
});

// Закрепить/открепить сообщение
router.put('/api/messages/:id/pin', (ctx) => {
  const pinned = dataStore.togglePin(ctx.params.id);
  if (pinned === false && !dataStore.findMessageById(ctx.params.id)) {
    ctx.status = 404;
    ctx.body = { error: 'Сообщение не найдено' };
    return;
  }
  ctx.body = { pinned };
});

// Добавить/удалить из избранного
router.put('/api/messages/:id/favorite', (ctx) => {
  const favorited = dataStore.toggleFavorite(ctx.params.id);
  if (!dataStore.findMessageById(ctx.params.id)) {
    ctx.status = 404;
    ctx.body = { error: 'Сообщение не найдено' };
    return;
  }
  ctx.body = { favorited };
});

// Получить все напоминания
router.get('/api/reminders', (ctx) => {
  ctx.body = dataStore.reminders;
});

// Добавить напоминание
router.post('/api/reminders', (ctx) => {
  const { text, triggerAt } = ctx.request.body;
  if (!text) {
    ctx.status = 400;
    ctx.body = { error: 'Поле text обязательно' };
    return;
  }
  const reminder = dataStore.addReminder({ text, triggerAt: triggerAt ? new Date(triggerAt) : undefined });
  ctx.status = 201;
  ctx.body = reminder;
});

// Удалить напоминание по ID
router.delete('/api/reminders/:id', (ctx) => {
  const deleted = dataStore.deleteReminder(ctx.params.id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'Напоминание не найдено' };
    return;
  }
  ctx.body = { success: true };
});

// Поиск по сообщениям
router.get('/api/messages/search', (ctx) => {
  const { q, type, dateFrom, dateTo } = ctx.query;
  let filteredMessages = [...dataStore.messages];
  
  if (q) {
    filteredMessages = Util.searchMessages(filteredMessages, q);
  }
  
  if (type) {
    filteredMessages = Util.filterMessagesByType(filteredMessages, type);
  }
  
  if (dateFrom || dateTo) {
    filteredMessages = Util.filterMessagesByDate(
      filteredMessages,
      dateFrom ? new Date(dateFrom) : null,
      dateTo ? new Date(dateTo) : null
    );
  }
  
  const sorted = Util.sortMessages(filteredMessages, 'timestamp', 'desc');
  
  ctx.body = {
    messages: sorted,
    total: sorted.length
  };
});

// Получить вложения по категориям
router.get('/api/attachments', (ctx) => {
  const attachments = Util.groupAttachmentsByCategory(dataStore.messages);
  ctx.body = attachments;
});

// Получить метаданные файлов
router.get('/api/files/metadata', (ctx) => {
  const metadata = Util.extractFileMetadata(dataStore.messages);
  ctx.body = metadata;
});

// Получить стикеры
router.get('/api/stickers', (ctx) => {
  const { category, q } = ctx.query;
  let filteredStickers = [...dataStore.stickers];
  
  if (category) {
    filteredStickers = Util.filterStickersByCategory(filteredStickers, category);
  }
  
  if (q) {
    filteredStickers = Util.searchStickers(filteredStickers, q);
  }
  
  ctx.body = filteredStickers;
});

// Добавить стикер
router.post('/api/stickers', (ctx) => {
  const { name, content, category } = ctx.request.body;
  if (!name || !content) {
    ctx.status = 400;
    ctx.body = { error: 'Поля name и content обязательны' };
    return;
  }
  const sticker = dataStore.addSticker({ name, content, category });
  ctx.status = 201;
  ctx.body = sticker;
});

// Удалить стикер
router.delete('/api/stickers/:id', (ctx) => {
  const deleted = dataStore.deleteSticker(ctx.params.id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'Стикер не найден' };
    return;
  }
  ctx.body = { success: true };
});

// Обработка команд бота
router.post('/api/commands', (ctx) => {
  const { command } = ctx.request.body;
  if (!command) {
    ctx.status = 400;
    ctx.body = { error: 'Поле command обязательно' };
    return;
  }

  const lowerCommand = command.toLowerCase().trim();
  let response = '';
  let type = 'text';

  // Минимум 5 команд согласно BACKEND.md
  if (lowerCommand.startsWith('@chaos: погода') || lowerCommand.includes('погода')) {
    response = 'Сегодня солнечно, +20°C. Идеальный день для прогулки!';
  } else if (lowerCommand.startsWith('@chaos: помощь') || lowerCommand.includes('помощь')) {
    response = 'Доступные команды: @chaos: погода, @chaos: помощь, @chaos: гороскоп, @chaos: анекдот, @chaos: время. Также вы можете добавлять сообщения, искать, закреплять и добавлять в избранное.';
  } else if (lowerCommand.startsWith('@chaos: гороскоп') || lowerCommand.includes('гороскоп')) {
    response = 'Овен: Сегодня вас ждёт неожиданная встреча. Будьте готовы к новым возможностям!';
  } else if (lowerCommand.startsWith('@chaos: анекдот') || lowerCommand.includes('анекдот')) {
    response = 'Программист на пляже: "Море – это как база данных: волны – это транзакции, песок – это кэш, а ракушки – это потерянные данные."';
  } else if (lowerCommand.startsWith('@chaos: время') || lowerCommand.includes('время')) {
    response = `Текущее время сервера: ${new Date().toLocaleString('ru-RU')}`;
  } else if (lowerCommand.startsWith('@chaos: привет') || lowerCommand.includes('привет')) {
    response = 'Привет! Я бот Chaos Organizer. Чем могу помочь?';
  } else {
    response = `Команда "${command}" не распознана. Используйте @chaos: помощь для списка команд.`;
  }

  ctx.body = {
    command,
    response,
    type,
    timestamp: new Date().toISOString(),
  };
});

 // Экспорт истории в формате JSON
router.get('/api/export', (ctx) => {
  const archive = {
    meta: {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      totalMessages: dataStore.messages.length,
      totalReminders: dataStore.reminders.length,
      totalStickers: dataStore.stickers.length,
      favoritesCount: dataStore.favorites.size,
      pinnedMessageId: dataStore.pinnedMessage ? dataStore.pinnedMessage.id : null,
    },
    messages: dataStore.messages,
    reminders: dataStore.reminders,
    stickers: dataStore.stickers,
    favorites: Array.from(dataStore.favorites),
    pinnedMessage: dataStore.pinnedMessage,
  };

  // Установка заголовков для скачивания файла
  ctx.set('Content-Disposition', 'attachment; filename="chaos-organizer-backup.json"');
  ctx.set('Content-Type', 'application/json');
  ctx.body = JSON.stringify(archive, null, 2);
});

 // Импорт истории из архива JSON
router.post('/api/import', (ctx) => {
  const { archive } = ctx.request.body;
  if (!archive || typeof archive !== 'object') {
    ctx.status = 400;
    ctx.body = { error: 'Некорректный архив. Ожидается объект archive.' };
    return;
  }

  // Валидация обязательных полей
  if (!Array.isArray(archive.messages)) {
    ctx.status = 400;
    ctx.body = { error: 'Архив должен содержать массив messages.' };
    return;
  }

  // Очистка текущих данных (опционально, можно добавить флаг merge)
  dataStore.clearAll();

  // Импорт сообщений
  archive.messages.forEach(msg => {
    // Проверяем наличие обязательных полей
    if (msg.id && msg.type && msg.content && msg.timestamp) {
      dataStore.messages.push(msg);
    }
  });

  // Импорт избранного
  if (Array.isArray(archive.favorites)) {
    archive.favorites.forEach(id => dataStore.favorites.add(id));
  }

  // Импорт напоминаний
  if (Array.isArray(archive.reminders)) {
    archive.reminders.forEach(rem => dataStore.reminders.push(rem));
  }

  // Импорт стикеров
  if (Array.isArray(archive.stickers)) {
    archive.stickers.forEach(sticker => dataStore.stickers.push(sticker));
  }

  // Импорт закреплённого сообщения
  if (archive.pinnedMessage && archive.pinnedMessage.id) {
    const pinned = dataStore.messages.find(m => m.id === archive.pinnedMessage.id);
    if (pinned) {
      dataStore.pinnedMessage = pinned;
      pinned.pinned = true;
    }
  }

  ctx.body = {
    success: true,
    imported: {
      messages: dataStore.messages.length,
      favorites: dataStore.favorites.size,
      reminders: dataStore.reminders.length,
      stickers: dataStore.stickers.length,
    },
  };
});

export default router; // Chaos Organizer API routes