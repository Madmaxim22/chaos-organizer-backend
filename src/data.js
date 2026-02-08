/**
 * Коллекции данных в памяти и демо-данные
 */

import { demoMessages, demoReminders, demoStickers } from './demo-data.js';
import { Util } from './Util.js';
import { generateId, MessageType } from './models.js';

/**
 * Коллекция сообщений (массив)
 * @type {Array<import('./models.js').Message>}
 */
export const messages = [];

/**
 * Закреплённое сообщение (одно или null)
 * @type {import('./models.js').Message | null}
 */
export let pinnedMessage = null;

/**
 * Избранные сообщения (Set ID)
 * @type {Set<string>}
 */
export const favorites = new Set();

/**
 * Напоминания (массив)
 * @type {Array<import('./models.js').Reminder>}
 */
export const reminders = [];

/**
 * Кастомные стикеры/эмодзи (массив)
 * @type {Array<import('./models.js').Sticker>}
 */
export const stickers = [];

/**
 * Инициализация демо-данных
 */
function initDemoData() {
  // Очищаем коллекции
  messages.length = 0;
  favorites.clear();
  reminders.length = 0;
  stickers.length = 0;
  pinnedMessage = null;

  // Добавляем демо-сообщения
  messages.push(...demoMessages);

  // Устанавливаем закреплённое сообщение
  const pinned = demoMessages.find(m => m.pinned);
  if (pinned) {
    pinnedMessage = pinned;
  }

  // Добавляем избранные сообщения
  demoMessages.forEach(m => {
    if (m.favorite) {
      favorites.add(m.id);
    }
  });

  // Добавляем демо-напоминания
  reminders.push(...demoReminders);

  // Добавляем демо-стикеры
  stickers.push(...demoStickers);

  console.log(`Демо-данные инициализированы: ${messages.length} сообщений, ${reminders.length} напоминаний, ${stickers.length} стикеров`);
}

// Автоматически инициализируем демо-данные при импорте
initDemoData();

/**
 * Вспомогательные функции для работы с данными
 */

/**
 * Найти сообщение по ID
 * @param {string} id
 * @returns {import('./models.js').Message | undefined}
 */
export function findMessageById(id) {
  return messages.find(m => m.id === id);
}

/**
 * Добавить новое сообщение
 * @param {Partial<import('./models.js').Message>} data
 * @returns {import('./models.js').Message}
 */
export function addMessage(data) {
  const message = {
    id: generateId(),
    type: data.type || MessageType.TEXT,
    content: data.content || '',
    timestamp: new Date(),
    author: data.author || 'Пользователь',
    metadata: data.metadata,
    encrypted: data.encrypted || false,
    pinned: data.pinned || false,
    favorite: data.favorite || false,
  };
  messages.push(message);
  return message;
}

/**
 * Удалить сообщение по ID
 * @param {string} id
 * @returns {boolean}
 */
export function deleteMessage(id) {
  const index = messages.findIndex(m => m.id === id);
  if (index === -1) return false;
  messages.splice(index, 1);
  // Если удаляемое сообщение было закреплено, сбрасываем pinnedMessage
  if (pinnedMessage && pinnedMessage.id === id) {
    pinnedMessage = null;
  }
  // Удаляем из избранного
  favorites.delete(id);
  return true;
}

/**
 * Переключить избранное для сообщения
 * @param {string} id
 * @returns {boolean} новое состояние (true - добавлено в избранное, false - удалено)
 */
export function toggleFavorite(id) {
  if (favorites.has(id)) {
    favorites.delete(id);
    const msg = findMessageById(id);
    if (msg) msg.favorite = false;
    return false;
  } else {
    favorites.add(id);
    const msg = findMessageById(id);
    if (msg) msg.favorite = true;
    return true;
  }
}

/**
 * Закрепить/открепить сообщение
 * @param {string} id
 * @returns {boolean} новое состояние (true - закреплено, false - откреплено)
 */
export function togglePin(id) {
  const msg = findMessageById(id);
  if (!msg) return false;
  if (pinnedMessage && pinnedMessage.id === id) {
    // Открепляем
    pinnedMessage = null;
    msg.pinned = false;
    return false;
  } else {
    // Если уже есть другое закреплённое, открепляем его
    if (pinnedMessage) {
      pinnedMessage.pinned = false;
    }
    pinnedMessage = msg;
    msg.pinned = true;
    return true;
  }
}

/**
 * Добавить напоминание
 * @param {Partial<import('./models.js').Reminder>} data
 * @returns {import('./models.js').Reminder}
 */
export function addReminder(data) {
  const reminder = {
    id: generateId(),
    text: data.text || '',
    triggerAt: data.triggerAt || new Date(),
    createdAt: new Date(),
    notified: false,
  };
  reminders.push(reminder);
  return reminder;
}

/**
 * Удалить напоминание по ID
 * @param {string} id
 * @returns {boolean}
 */
export function deleteReminder(id) {
  const index = reminders.findIndex(r => r.id === id);
  if (index === -1) return false;
  reminders.splice(index, 1);
  return true;
}

/**
 * Добавить стикер/эмодзи
 * @param {Partial<import('./models.js').Sticker>} data
 * @returns {import('./models.js').Sticker}
 */
export function addSticker(data) {
  const sticker = {
    id: generateId(),
    name: data.name || 'unnamed',
    content: data.content || '',
    category: data.category || 'general',
    createdAt: new Date(),
  };
  stickers.push(sticker);
  return sticker;
}

/**
 * Удалить стикер по ID
 * @param {string} id
 * @returns {boolean}
 */
export function deleteSticker(id) {
  const index = stickers.findIndex(s => s.id === id);
  if (index === -1) return false;
  stickers.splice(index, 1);
  return true;
}

/**
 * Найти стикер по ID
 * @param {string} id
 * @returns {import('./models.js').Sticker | undefined}
 */
export function findStickerById(id) {
  return stickers.find(s => s.id === id);
}