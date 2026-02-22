import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { MessageType } from './models.js';
import { Util } from './Util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DATA_FILE = 'data/state.json';
const PERSIST_DEBOUNCE_MS = 800;

/**
 * Восстановление полей-дат из ISO-строк в объектах
 */
function restoreDates(obj, dateFields) {
  if (!obj) return;
  for (const key of dateFields) {
    if (obj[key] && typeof obj[key] === 'string') {
      obj[key] = new Date(obj[key]);
    }
  }
}

/**
 * Класс для управления данными в памяти Chaos Organizer
 */
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

    this._dataFilePath = path.resolve(path.join(__dirname, '..', process.env.DATA_FILE || DEFAULT_DATA_FILE));
    this._persistTimer = null;

    if (!this.loadFromFile()) {
      console.log('Файл состояния отсутствует или пуст — хранилище запущено с пустыми данными');
    }
  }

  /**
   * Загрузить состояние из файла. Возвращает true, если загрузка успешна.
   * @returns {boolean}
   */
  loadFromFile() {
    try {
      const raw = fs.readFileSync(this._dataFilePath, 'utf8');
      const archive = JSON.parse(raw);
      if (!archive || !Array.isArray(archive.messages)) {
        return false;
      }
      this.clearAll();
      for (const msg of archive.messages) {
        restoreDates(msg, ['timestamp']);
        // Тип пересчитываем по metadata/content, чтобы исправить старые записи с type: "text"
        msg.type = Util.inferMessageTypeFromData(msg);
        this.messages.push(msg);
      }
      if (Array.isArray(archive.reminders)) {
        for (const rem of archive.reminders) {
          restoreDates(rem, ['triggerAt', 'createdAt']);
          this.reminders.push(rem);
        }
      }
      if (Array.isArray(archive.stickers)) {
        for (const sticker of archive.stickers) {
          restoreDates(sticker, ['createdAt']);
          this.stickers.push(sticker);
        }
      }
      if (Array.isArray(archive.favorites)) {
        archive.favorites.forEach((id) => this.favorites.add(id));
      }
      if (archive.pinnedMessage && archive.pinnedMessage.id) {
        const pinned = this.messages.find((m) => m.id === archive.pinnedMessage.id);
        if (pinned) {
          pinned.pinned = true;
          this.pinnedMessage = pinned;
        }
      }
      console.log(`Данные загружены из ${this._dataFilePath}: ${this.messages.length} сообщений, ${this.reminders.length} напоминаний, ${this.stickers.length} стикеров`);
      return true;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn('Ошибка загрузки файла состояния:', err.message);
      }
      return false;
    }
  }

  /**
   * Собрать снимок состояния для сохранения
   */
  _snapshot() {
    return {
      messages: this.messages,
      reminders: this.reminders,
      stickers: this.stickers,
      favorites: Array.from(this.favorites),
      pinnedMessage: this.pinnedMessage,
    };
  }

  /**
   * Синхронно сохранить состояние в файл
   */
  persistSync() {
    try {
      const dir = path.dirname(this._dataFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const snapshot = this._snapshot();
      fs.writeFileSync(this._dataFilePath, JSON.stringify(snapshot, null, 2), 'utf8');
    } catch (err) {
      console.error('Ошибка сохранения состояния:', err);
    }
  }

  /**
   * Асинхронно сохранить состояние в файл
   */
  async persist() {
    try {
      const dir = path.dirname(this._dataFilePath);
      await fs.promises.mkdir(dir, { recursive: true });
      const snapshot = this._snapshot();
      await fs.promises.writeFile(this._dataFilePath, JSON.stringify(snapshot, null, 2), 'utf8');
    } catch (err) {
      console.error('Ошибка сохранения состояния:', err);
    }
  }

  /**
   * Отложенное сохранение (debounce)
   */
  schedulePersist() {
    if (this._persistTimer) clearTimeout(this._persistTimer);
    this._persistTimer = setTimeout(() => {
      this._persistTimer = null;
      this.persist();
    }, PERSIST_DEBOUNCE_MS);
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
    const wantPinned = data.pinned || false;
    // Закреплённым может быть только одно сообщение: при добавлении с pinned: true снимаем предыдущее
    if (wantPinned && this.pinnedMessage) {
      this.pinnedMessage.pinned = false;
      this.pinnedMessage = null;
    }

    const message = {
      id: uuidv4(),
      type: data.type || Util.inferMessageTypeFromData(data),
      author: data.author,
      content: data.content || '',
      timestamp: data.timestamp instanceof Date ? data.timestamp : new Date(),
      metadata: data.metadata,
      encrypted: data.encrypted || false,
      pinned: wantPinned,
      favorite: data.favorite || false,
    };
    this.messages.push(message);

    if (message.pinned) {
      this.pinnedMessage = message;
    }

    // Если сообщение создается с favorite: true, добавляем его в Set избранных
    if (message.favorite) {
      this.favorites.add(message.id);
    }

    this.schedulePersist();
    return message;
  }

  /**
   * Обновить сообщение по ID
   * @param {string} id
   * @param {Partial<import('./models.js').Message>} updates
   * @returns {import('./models.js').Message | null}
   */
  updateMessage(id, updates) {
    const message = this.findMessageById(id);
    if (!message) return null;
    Object.assign(message, updates);
    this.schedulePersist();
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
    this.schedulePersist();
    return true;
  }

  /**
   * Установить состояние избранного для сообщения
   * @param {string} id
   * @param {boolean} favorite - желаемое состояние (true - добавить в избранное, false - удалить)
   * @returns {boolean} новое состояние
   */
  setFavorite(id, favorite) {
    const msg = this.findMessageById(id);
    if (!msg) return false;
    return this.setFavoriteForMessage(msg, favorite);
  }

  /**
   * Установить состояние избранного для уже найденного сообщения
   * (чтобы не искать сообщение повторно)
   * @param {import('./models.js').Message} message
   * @param {boolean} favorite
   * @returns {boolean} новое состояние
   */
  setFavoriteForMessage(message, favorite) {
    const id = message.id;
    if (favorite) {
      this.favorites.add(id);
      message.favorite = true;
      this.schedulePersist();
      return true;
    }

    this.favorites.delete(id);
    message.favorite = false;
    this.schedulePersist();
    return false;
  }

  /**
   * Переключить избранное для сообщения
   * @param {string} id
   * @returns {boolean} новое состояние (true - добавлено в избранное, false - удалено)
   */
  toggleFavorite(id) {
    const msg = this.findMessageById(id);
    if (!msg) return false;
    return this.toggleFavoriteForMessage(msg);
  }

  /**
   * Переключить избранное для уже найденного сообщения
   * (чтобы не искать сообщение повторно)
   * @param {import('./models.js').Message} message
   * @returns {boolean} новое состояние
   */
  toggleFavoriteForMessage(message) {
    const id = message.id;
    const nextState = !this.favorites.has(id);
    return this.setFavoriteForMessage(message, nextState);
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
      this.schedulePersist();
      return false;
    } else {
      // Если уже есть другое закреплённое, открепляем его
      if (this.pinnedMessage) {
        this.pinnedMessage.pinned = false;
      }
      this.pinnedMessage = msg;
      msg.pinned = true;
      this.schedulePersist();
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
      id: uuidv4(),
      text: data.text || '',
      triggerAt: data.triggerAt || new Date(),
      createdAt: new Date(),
      notified: false,
    };
    this.reminders.push(reminder);
    this.schedulePersist();
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
    this.schedulePersist();
    return true;
  }

  /**
   * Добавить стикер/эмодзи
   * @param {Partial<import('./models.js').Sticker>} data
   * @returns {import('./models.js').Sticker}
   */
  addSticker(data) {
    const sticker = {
      id: uuidv4(),
      name: data.name || 'unnamed',
      content: data.content || '',
      category: data.category || 'general',
      createdAt: new Date(),
    };
    this.stickers.push(sticker);
    this.schedulePersist();
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
    this.schedulePersist();
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
    this.schedulePersist();
  }
}

// Экспорт единственного экземпляра хранилища
export const dataStore = new DataStore();
