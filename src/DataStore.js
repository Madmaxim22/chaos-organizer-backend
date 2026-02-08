/**
 * Класс для управления данными в памяти Chaos Organizer
 */
import { demoMessages, demoReminders, demoStickers } from './demo-data.js';
import { generateId, MessageType } from './models.js';

export class DataStore {
  constructor() {
    /** @type {Array<import('./models.js').Message>} */
    this.messages = [];
    /** @type {import('./models.js').Message | null} */
    this.pinnedMessage = null;
    /** @type {Set<string>} */
    this.favorites = new Set();
    /** @type {Array<import('./models.js').Reminder>} */
    this.reminders = [];
    /** @type {Array<import('./models.js').Sticker>} */
    this.stickers = [];

    this.initDemoData();
  }

  /**
   * Инициализация демо-данных
   */
  initDemoData() {
    // Очищаем коллекции
    this.messages.length = 0;
    this.favorites.clear();
    this.reminders.length = 0;
    this.stickers.length = 0;
    this.pinnedMessage = null;

    // Добавляем демо-сообщения
    this.messages.push(...demoMessages);

    // Устанавливаем закреплённое сообщение
    const pinned = demoMessages.find(m => m.pinned);
    if (pinned) {
      this.pinnedMessage = pinned;
    }

    // Добавляем избранные сообщения
    demoMessages.forEach(m => {
      if (m.favorite) {
        this.favorites.add(m.id);
      }
    });

    // Добавляем демо-напоминания
    this.reminders.push(...demoReminders);

    // Добавляем демо-стикеры
    this.stickers.push(...demoStickers);

    console.log(`Демо-данные инициализированы: ${this.messages.length} сообщений, ${this.reminders.length} напоминаний, ${this.stickers.length} стикеров`);
  }

  /**
   * Найти сообщение по ID
   * @param {string} id
   * @returns {import('./models.js').Message | undefined}
   */
  findMessageById(id) {
    return this.messages.find(m => m.id === id);
  }

  /**
   * Добавить новое сообщение
   * @param {Partial<import('./models.js').Message>} data
   * @returns {import('./models.js').Message}
   */
  addMessage(data) {
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
    this.messages.push(message);
    return message;
  }

  /**
   * Удалить сообщение по ID
   * @param {string} id
   * @returns {boolean}
   */
  deleteMessage(id) {
    const index = this.messages.findIndex(m => m.id === id);
    if (index === -1) return false;
    this.messages.splice(index, 1);
    // Если удаляемое сообщение было закреплено, сбрасываем pinnedMessage
    if (this.pinnedMessage && this.pinnedMessage.id === id) {
      this.pinnedMessage = null;
    }
    // Удаляем из избранного
    this.favorites.delete(id);
    return true;
  }

  /**
   * Переключить избранное для сообщения
   * @param {string} id
   * @returns {boolean} новое состояние (true - добавлено в избранное, false - удалено)
   */
  toggleFavorite(id) {
    if (this.favorites.has(id)) {
      this.favorites.delete(id);
      const msg = this.findMessageById(id);
      if (msg) msg.favorite = false;
      return false;
    } else {
      this.favorites.add(id);
      const msg = this.findMessageById(id);
      if (msg) msg.favorite = true;
      return true;
    }
  }

  /**
   * Закрепить/открепить сообщение
   * @param {string} id
   * @returns {boolean} новое состояние (true - закреплено, false - откреплено)
   */
  togglePin(id) {
    const msg = this.findMessageById(id);
    if (!msg) return false;
    if (this.pinnedMessage && this.pinnedMessage.id === id) {
      // Открепляем
      this.pinnedMessage = null;
      msg.pinned = false;
      return false;
    } else {
      // Если уже есть другое закреплённое, открепляем его
      if (this.pinnedMessage) {
        this.pinnedMessage.pinned = false;
      }
      this.pinnedMessage = msg;
      msg.pinned = true;
      return true;
    }
  }

  /**
   * Добавить напоминание
   * @param {Partial<import('./models.js').Reminder>} data
   * @returns {import('./models.js').Reminder}
   */
  addReminder(data) {
    const reminder = {
      id: generateId(),
      text: data.text || '',
      triggerAt: data.triggerAt || new Date(),
      createdAt: new Date(),
      notified: false,
    };
    this.reminders.push(reminder);
    return reminder;
  }

  /**
   * Удалить напоминание по ID
   * @param {string} id
   * @returns {boolean}
   */
  deleteReminder(id) {
    const index = this.reminders.findIndex(r => r.id === id);
    if (index === -1) return false;
    this.reminders.splice(index, 1);
    return true;
  }

  /**
   * Добавить стикер/эмодзи
   * @param {Partial<import('./models.js').Sticker>} data
   * @returns {import('./models.js').Sticker}
   */
  addSticker(data) {
    const sticker = {
      id: generateId(),
      name: data.name || 'unnamed',
      content: data.content || '',
      category: data.category || 'general',
      createdAt: new Date(),
    };
    this.stickers.push(sticker);
    return sticker;
  }

  /**
   * Удалить стикер по ID
   * @param {string} id
   * @returns {boolean}
   */
  deleteSticker(id) {
    const index = this.stickers.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.stickers.splice(index, 1);
    return true;
  }

  /**
   * Найти стикер по ID
   * @param {string} id
   * @returns {import('./models.js').Sticker | undefined}
   */
  findStickerById(id) {
    return this.stickers.find(s => s.id === id);
  }

  /**
   * Сбросить закреплённое сообщение (для импорта)
   */
  resetPinnedMessage() {
    this.pinnedMessage = null;
  }

  /**
   * Очистить все данные (для импорта)
   */
  clearAll() {
    this.messages.length = 0;
    this.favorites.clear();
    this.reminders.length = 0;
    this.stickers.length = 0;
    this.pinnedMessage = null;
  }
}

// Экспорт единственного экземпляра хранилища
export const dataStore = new DataStore();
