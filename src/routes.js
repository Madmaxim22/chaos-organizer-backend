import Router from 'koa-router';
import {
  messages,
  pinnedMessage,
  favorites,
  reminders,
  stickers,
  findMessageById,
  addMessage,
  deleteMessage,
  toggleFavorite,
  togglePin,
  addReminder,
  deleteReminder,
  addSticker,
  deleteSticker,
  findStickerById
} from './data.js';
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
  const sorted = messages.sort((a, b) => b.timestamp - a.timestamp); // новейшие первыми
  const paginated = sorted.slice(start, start + count);
  ctx.body = {
    messages: paginated,
    total: messages.length,
    offset: start,
    limit: count,
    pinned: pinnedMessage,
    favorites: Array.from(favorites),
  };
});

// Получить одно сообщение по ID
router.get('/api/messages/:id', (ctx) => {
  const message = findMessageById(ctx.params.id);
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
  const message = addMessage({ type, content, author, metadata, encrypted });
  ctx.status = 201;
  ctx.body = message;
});

// Удалить сообщение по ID
router.delete('/api/messages/:id', (ctx) => {
  const deleted = deleteMessage(ctx.params.id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'Сообщение не найдено' };
    return;
  }
  ctx.body = { success: true };
});

// Закрепить/открепить сообщение
router.put('/api/messages/:id/pin', (ctx) => {
  const pinned = togglePin(ctx.params.id);
  if (pinned === false && !findMessageById(ctx.params.id)) {
    ctx.status = 404;
    ctx.body = { error: 'Сообщение не найдено' };
    return;
  }
  ctx.body = { pinned };
});

// Добавить/удалить из избранного
router.put('/api/messages/:id/favorite', (ctx) => {
  const favorited = toggleFavorite(ctx.params.id);
  if (!findMessageById(ctx.params.id)) {
    ctx.status = 404;
    ctx.body = { error: 'Сообщение не найдено' };
    return;
  }
  ctx.body = { favorited };
});

// Получить все напоминания
router.get('/api/reminders', (ctx) => {
  ctx.body = reminders;
});

// Добавить напоминание
router.post('/api/reminders', (ctx) => {
  const { text, triggerAt } = ctx.request.body;
  if (!text) {
    ctx.status = 400;
    ctx.body = { error: 'Поле text обязательно' };
    return;
  }
  const reminder = addReminder({ text, triggerAt: triggerAt ? new Date(triggerAt) : undefined });
  ctx.status = 201;
  ctx.body = reminder;
});

// Удалить напоминание по ID
router.delete('/api/reminders/:id', (ctx) => {
  const deleted = deleteReminder(ctx.params.id);
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
  let filteredMessages = [...messages];
  
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
  const attachments = Util.groupAttachmentsByCategory(messages);
  ctx.body = attachments;
});

// Получить метаданные файлов
router.get('/api/files/metadata', (ctx) => {
  const metadata = Util.extractFileMetadata(messages);
  ctx.body = metadata;
});

// Получить стикеры
router.get('/api/stickers', (ctx) => {
  const { category, q } = ctx.query;
  let filteredStickers = [...stickers];
  
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
  const sticker = addSticker({ name, content, category });
  ctx.status = 201;
  ctx.body = sticker;
});

// Удалить стикер
router.delete('/api/stickers/:id', (ctx) => {
  const deleted = deleteSticker(ctx.params.id);
  if (!deleted) {
    ctx.status = 404;
    ctx.body = { error: 'Стикер не найден' };
    return;
  }
  ctx.body = { success: true };
});

export default router;