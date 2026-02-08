import { MessageType } from './models.js';

/**
 * Класс утилит для работы с данными Chaos Organizer
 * Методы для фильтрации, сортировки, пагинации и работы с метаданными
 */
export class Util {
  /**
   * Фильтрация сообщений по типу контента
   * @param {Array} messages - массив сообщений
   * @param {string} type - тип сообщения (text, image, video, audio, file)
   * @returns {Array} отфильтрованный массив сообщений
   */
  static filterMessagesByType(messages, type) {
    if (!type) return messages;
    return messages.filter(msg => msg.type === type);
  }

  /**
   * Фильтрация сообщений по дате
   * @param {Array} messages - массив сообщений
   * @param {Date} fromDate - начальная дата
   * @param {Date} toDate - конечная дата
   * @returns {Array} отфильтрованный массив сообщений
   */
  static filterMessagesByDate(messages, fromDate, toDate) {
    return messages.filter(msg => {
      const msgDate = new Date(msg.timestamp);
      const start = fromDate ? new Date(fromDate) : new Date(0);
      const end = toDate ? new Date(toDate) : new Date();
      
      return msgDate >= start && msgDate <= end;
    });
  }

  /**
   * Фильтрация сообщений по поисковому запросу
   * @param {Array} messages - массив сообщений
   * @param {string} query - поисковый запрос
   * @returns {Array} отфильтрованный массив сообщений
   */
  static searchMessages(messages, query) {
    if (!query) return messages;
    
    const lowerQuery = query.toLowerCase();
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(lowerQuery) ||
      (msg.metadata && msg.metadata.fileName && msg.metadata.fileName.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Сортировка сообщений
   * @param {Array} messages - массив сообщений
   * @param {string} sortBy - поле для сортировки (timestamp, type, author)
   * @param {string} order - порядок (asc, desc)
   * @returns {Array} отсортированный массив сообщений
   */
  static sortMessages(messages, sortBy = 'timestamp', order = 'desc') {
    return [...messages].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      
      // Для дат конвертируем в число
      if (sortBy === 'timestamp') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      
      if (order === 'desc') {
        return valB > valA ? 1 : -1;
      } else {
        return valA > valB ? 1 : -1;
      }
    });
  }

  /**
   * Пагинация сообщений
   * @param {Array} messages - массив сообщений
   * @param {number} offset - смещение
   * @param {number} limit - количество элементов
   * @returns {Array} ограниченный массив сообщений
   */
  static paginateMessages(messages, offset = 0, limit = 10) {
    return messages.slice(offset, offset + limit);
  }

  /**
   * Группировка вложений по категориям
   * @param {Array} messages - массив сообщений
   * @returns {Object} объект с категориями вложений
   */
  static groupAttachmentsByCategory(messages) {
    const attachments = {
      images: [],
      videos: [],
      audios: [],
      documents: [],
      others: []
    };
    
    messages.forEach(msg => {
      if (msg.type === MessageType.IMAGE) {
        attachments.images.push(msg);
      } else if (msg.type === MessageType.VIDEO) {
        attachments.videos.push(msg);
      } else if (msg.type === MessageType.AUDIO) {
        attachments.audios.push(msg);
      } else if (msg.type === MessageType.FILE) {
        attachments.documents.push(msg);
      } else if ([MessageType.LINK, MessageType.TEXT].indexOf(msg.type) === -1) {
        attachments.others.push(msg);
      }
    });
    
    return attachments;
  }

  /**
   * Получение размера файла в человекочитаемом формате
   * @param {number} bytes - размер в байтах
   * @returns {string} размер файла с единицами измерения
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Определение типа файла по MIME-типу
   * @param {string} mimeType - MIME-тип файла
   * @returns {string} категория файла
   */
  static getFileCategory(mimeType) {
    if (!mimeType) return 'other';
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'document';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
    
    return 'other';
  }

  /**
   * Извлечение метаданных файлов из сообщений
   * @param {Array} messages - массив сообщений
   * @returns {Array} массив с метаданными файлов
   */
  static extractFileMetadata(messages) {
    return messages
      .filter(msg => msg.metadata)
      .map(msg => ({
        id: msg.id,
        fileName: msg.metadata.fileName,
        fileSize: msg.metadata.fileSize,
        mimeType: msg.metadata.mimeType,
        type: msg.type,
        timestamp: msg.timestamp,
        author: msg.author
      }));
  }

  /**
   * Фильтрация напоминаний по дате срабатывания
   * @param {Array} reminders - массив напоминаний
   * @param {Date} fromDate - начальная дата
   * @param {Date} toDate - конечная дата
   * @returns {Array} отфильтрованный массив напоминаний
   */
  static filterRemindersByDate(reminders, fromDate, toDate) {
    return reminders.filter(reminder => {
      const reminderDate = new Date(reminder.triggerAt);
      const start = fromDate ? new Date(fromDate) : new Date(0);
      const end = toDate ? new Date(toDate) : new Date();
      
      return reminderDate >= start && reminderDate <= end;
    });
  }

  /**
   * Сортировка напоминаний
   * @param {Array} reminders - массив напоминаний
   * @param {string} sortBy - поле для сортировки (triggerAt, createdAt, text)
   * @param {string} order - порядок (asc, desc)
   * @returns {Array} отсортированный массив напоминаний
   */
  static sortReminders(reminders, sortBy = 'triggerAt', order = 'asc') {
    return [...reminders].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      
      // Для дат конвертируем в число
      if (['triggerAt', 'createdAt'].includes(sortBy)) {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      
      if (order === 'desc') {
        return valB > valA ? 1 : -1;
      } else {
        return valA > valB ? 1 : -1;
      }
    });
  }

  /**
   * Фильтрация стикеров по категории
   * @param {Array} stickers - массив стикеров
   * @param {string} category - категория
   * @returns {Array} отфильтрованный массив стикеров
   */
  static filterStickersByCategory(stickers, category) {
    if (!category) return stickers;
    return stickers.filter(sticker => sticker.category === category);
  }

  /**
   * Поиск стикеров по имени
   * @param {Array} stickers - массив стикеров
   * @param {string} query - поисковый запрос
   * @returns {Array} найденные стикеры
   */
  static searchStickers(stickers, query) {
    if (!query) return stickers;
    
    const lowerQuery = query.toLowerCase();
    return stickers.filter(sticker =>
      sticker.name.toLowerCase().includes(lowerQuery) ||
      sticker.content.toLowerCase().includes(lowerQuery)
    );
  }
}