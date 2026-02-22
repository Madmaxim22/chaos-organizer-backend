/**
 * Модели данных для Chaos Organizer (Backend)
 * Соответствуют спецификации из BACKEND.md
 */

/**
 * Типы сообщений
 */
export const MessageType = {
  TEXT: "text",
  LINK: "link",
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  FILE: "file",
};

/**
 * Модель сообщения
 * @typedef {Object} Message
 * @property {string} id - UUID v4
 * @property {MessageType} type - тип сообщения
 * @property {string} author - тип сообщения
 * @property {string} content - основной текст сообщения или URL
 * @property {Date} timestamp - время создания
 * @property {boolean} [encrypted] - зашифровано ли сообщение
 * @property {boolean} [pinned] - закреплено ли сообщение
 * @property {boolean} [favorite] - в избранном ли
 * @property {Object} [metadata] - метаданные файла
 * @property {string} [metadata.id]
 * @property {string} [metadata.fileName]
 * @property {number} [metadata.fileSize]
 * @property {string} [metadata.mimeType]
 * @property {string} [metadata.fileExtension]
 * @property {File} file - Файл (может быть пустым)
 */

/**
 * Модель напоминания
 * @typedef {Object} Reminder
 * @property {string} id - UUID v4
 * @property {string} text - текст напоминания
 * @property {Date} triggerAt - когда должно сработать
 * @property {Date} createdAt - когда создано
 * @property {boolean} [notified] - было ли уведомление отправлено
 */

/**
 * Модель для кастомных стикеров/эмодзи
 * @typedef {Object} Sticker
 * @property {string} id - UUID v4
 * @property {string} name - имя стикера/эмодзи
 * @property {string} content - содержимое (путь к файлу или юникод)
 * @property {string} category - категория
 * @property {Date} createdAt - дата создания
 */

// --- Сообщения: ввод (создание) и вывод (ответ API) ---

/**
 * Нормализует тело запроса и метаданные файлов в объект для dataStore.addMessage().
 * @param {Object} body - ctx.request.body (author, content, encrypted, pinned, favorite как строки)
 * @param {Array<Object>} fileMetadatas - массив метаданных сохранённых файлов
 * @param {string} [inferredType] - тип сообщения по MIME первого вложения
 * @returns {Partial<Message>} объект для addMessage
 */
export function normalizeMessageCreate(body, fileMetadatas = [], inferredType) {
  const pinned = body.pinned === 'true' || body.pinned === true;
  const encrypted = body.encrypted === 'true' || body.encrypted === true;
  const favorite = body.favorite === 'true' || body.favorite === true;
  return {
    author: body.author ?? '',
    content: body.content ?? '',
    type: inferredType,
    pinned,
    encrypted,
    favorite,
    metadata: Array.isArray(fileMetadatas) && fileMetadatas.length > 0 ? fileMetadatas : undefined,
  };
}

/**
 * Форматирует сообщение из DataStore для ответа API (единый вид, timestamp в ISO).
 * @param {Message} message - сообщение из хранилища
 * @returns {Object} объект для ctx.body (timestamp — строка ISO)
 */
export function formatMessageForResponse(message) {
  if (!message) return null;
  const timestamp = message.timestamp instanceof Date
    ? message.timestamp.toISOString()
    : (typeof message.timestamp === 'string' ? message.timestamp : new Date().toISOString());
  return {
    id: message.id,
    type: message.type,
    author: message.author,
    content: message.content,
    timestamp,
    metadata: message.metadata ?? [],
    encrypted: !!message.encrypted,
    pinned: !!message.pinned,
    favorite: !!message.favorite,
  };
}

