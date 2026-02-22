import { MessageType } from "./models.js";

/**
 * Определяет тип сообщения по метаданным вложений и контенту.
 * @param {Object} msg - сообщение с content и metadata (массив или один объект с mimeType)
 * @returns {string} - text, link, image, video, audio, file
 */
function inferMessageType(msg) {
  const meta = msg.metadata;
  const list = meta && Array.isArray(meta) ? meta : meta ? [meta] : [];
  const first = list.find((m) => m && m.mimeType);
  if (first) {
    const m = (first.mimeType || '').toLowerCase();
    if (m.startsWith('image/')) return MessageType.IMAGE;
    if (m.startsWith('video/')) return MessageType.VIDEO;
    if (m.startsWith('audio/')) return MessageType.AUDIO;
    return MessageType.FILE;
  }
  const content = (msg.content || '').trim();
  if (/^https?:\/\/\S+$/i.test(content)) return MessageType.LINK;
  return MessageType.TEXT;
}

/**
 * Возвращает тип сообщения (из msg.type или вычисленный по вложениям/контенту).
 */
function getMessageType(msg) {
  if (msg.type && typeof msg.type === 'string') return msg.type;
  return inferMessageType(msg);
}

/**
 * Класс утилит для работы с данными Chaos Organizer
 * Методы для фильтрации, сортировки, пагинации и работы с метаданными
 */
export class Util {
  /**
   * Определяет тип сообщения по данным (metadata, content). Для использования при создании сообщения.
   * @param {Object} data - объект с content и metadata
   * @returns {string} - text, link, image, video, audio, file
   */
  static inferMessageTypeFromData(data) {
    return inferMessageType(data || {});
  }

  /**
   * Фильтрация сообщений по типу контента (один или несколько типов).
   * @param {Array} messages - массив сообщений
   * @param {string} type - один тип или несколько через запятую (text, image, video, audio, file, link)
   * @returns {Array} отфильтрованный массив сообщений
   */
  static filterMessagesByType(messages, type) {
    if (!type || typeof type !== 'string') return messages;
    const types = type.split(',').map((t) => t.trim()).filter(Boolean);
    if (types.length === 0) return messages;
    const set = new Set(types);
    return messages.filter((msg) => set.has(getMessageType(msg)));
  }

  /**
   * Фильтрация сообщений по дате
   * @param {Array} messages - массив сообщений
   * @param {Date} fromDate - начальная дата
   * @param {Date} toDate - конечная дата
   * @returns {Array} отфильтрованный массив сообщений
   */
  static filterMessagesByDate(messages, fromDate, toDate) {
    return messages.filter((msg) => {
      const msgDate = new Date(msg.timestamp);
      const start = fromDate ? new Date(fromDate) : new Date(0);
      const end = toDate ? new Date(toDate) : new Date();

      return msgDate >= start && msgDate <= end;
    });
  }

  /**
   * Проверяет, подходит ли сообщение по тексту запроса (content или имена файлов в metadata).
   * @param {Object} msg - сообщение
   * @param {string} lowerQuery - запрос в нижнем регистре
   * @returns {boolean}
   */
  static messageMatchesQuery(msg, lowerQuery) {
    const content = (msg.content || '').toLowerCase();
    if (content.includes(lowerQuery)) return true;
    const meta = msg.metadata;
    if (meta && Array.isArray(meta)) {
      return meta.some((m) => m && m.fileName && m.fileName.toLowerCase().includes(lowerQuery));
    }
    if (meta && meta.fileName && meta.fileName.toLowerCase().includes(lowerQuery)) return true;
    return false;
  }

  /**
   * Фильтрация сообщений по поисковому запросу (по тексту и/или именам вложений).
   * @param {Array} messages - массив сообщений
   * @param {string} query - поисковый запрос
   * @returns {Array} отфильтрованный массив сообщений
   */
  static searchMessages(messages, query) {
    if (!query || typeof query !== 'string' || !query.trim()) return messages;
    const lowerQuery = query.toLowerCase().trim();
    return messages.filter((msg) => Util.messageMatchesQuery(msg, lowerQuery));
  }

  /**
   * Поиск с учётом текста и типа:
   * - Если указан фильтр по типу (не все типы): только сообщения, где совпадают и текст, и тип.
   * - Если все типы (type не передан): поиск только по тексту сообщения.
   * @param {Array} messages - массив сообщений
   * @param {string} [query] - поисковый запрос (по content/имени файла)
   * @param {string} [typeFilter] - типы через запятую или пусто/не передан = все типы, тогда только по тексту
   * @returns {Array} отфильтрованный массив
   */
  static searchMessagesByQueryAndType(messages, query, typeFilter) {
    const hasQuery = query != null && String(query).trim() !== '';
    const hasTypeFilter = typeFilter != null && String(typeFilter).trim() !== '';
    const types = hasTypeFilter
      ? typeFilter.split(',').map((t) => t.trim()).filter(Boolean)
      : null;
    const typeSet = types && types.length > 0 ? new Set(types) : null;
    const lowerQuery = hasQuery ? String(query).toLowerCase().trim() : '';

    return messages.filter((msg) => {
      const textMatch = !hasQuery || Util.messageMatchesQuery(msg, lowerQuery);
      if (!typeSet) {
        return textMatch;
      }
      const msgType = getMessageType(msg);
      const typeMatch = typeSet.has(msgType);
      return textMatch && typeMatch;
    });
  }

  /**
   * Сортировка сообщений
   * @param {Array} messages - массив сообщений
   * @param {string} sortBy - поле для сортировки (timestamp, type, author)
   * @param {string} order - порядок (asc, desc)
   * @returns {Array} отсортированный массив сообщений
   */
  static sortMessages(messages, sortBy = "timestamp", order = "desc") {
    return [...messages].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      // Для дат конвертируем в число
      if (sortBy === "timestamp") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (order === "desc") {
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
      others: [],
    };

    messages.forEach((msg) => {
      if (msg.type === MessageType.IMAGE) {
        attachments.images.push(msg);
      } else if (msg.type === MessageType.VIDEO) {
        attachments.videos.push(msg);
      } else if (msg.type === MessageType.AUDIO) {
        attachments.audios.push(msg);
      } else if (msg.type === MessageType.FILE) {
        attachments.documents.push(msg);
      } else if (
        [MessageType.LINK, MessageType.TEXT].indexOf(msg.type) === -1
      ) {
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
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Определение типа файла по MIME-типу
   * @param {string} mimeType - MIME-тип файла
   * @returns {string} категория файла
   */
  static getFileCategory(mimeType) {
    if (!mimeType) return "other";

    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType === "application/pdf") return "document";
    if (mimeType.includes("zip") || mimeType.includes("compressed"))
      return "archive";

    return "other";
  }

  /**
   * Извлечение метаданных файлов из сообщений
   * @param {Array} messages - массив сообщений
   * @returns {Array} массив с метаданными файлов
   */
  static extractFileMetadata(messages) {
    return messages
      .filter((msg) => msg.metadata)
      .map((msg) => ({
        id: msg.id,
        fileName: msg.metadata.fileName,
        fileSize: msg.metadata.fileSize,
        mimeType: msg.metadata.mimeType,
        type: msg.type,
        timestamp: msg.timestamp,
        author: msg.author,
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
    return reminders.filter((reminder) => {
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
  static sortReminders(reminders, sortBy = "triggerAt", order = "asc") {
    return [...reminders].sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      // Для дат конвертируем в число
      if (["triggerAt", "createdAt"].includes(sortBy)) {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (order === "desc") {
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
    return stickers.filter((sticker) => sticker.category === category);
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
    return stickers.filter(
      (sticker) =>
        sticker.name.toLowerCase().includes(lowerQuery) ||
        sticker.content.toLowerCase().includes(lowerQuery),
    );
  }
}
