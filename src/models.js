import { v4 as uuidv4 } from 'uuid';

/**
 * Модели данных для Chaos Organizer (Backend)
 * Соответствуют спецификации из BACKEND.md
 */

/**
 * Типы сообщений
 */
export const MessageType = {
  TEXT: 'text',
  LINK: 'link',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file'
};

/**
 * Модель сообщения
 * @typedef {Object} Message
 * @property {string} id - UUID v4
 * @property {MessageType} type - тип сообщения
 * @property {string} content - текст или URL
 * @property {Date} timestamp - время создания
 * @property {string} [author] - опционально, автор
 * @property {Object} [metadata] - метаданные файла
 * @property {string} [metadata.fileName]
 * @property {number} [metadata.fileSize]
 * @property {string} [metadata.mimeType]
 * @property {Object} [metadata.dimensions] - { width, height }
 * @property {number} [metadata.duration] - длительность в секундах
 * @property {boolean} [encrypted] - зашифровано ли сообщение
 * @property {boolean} [pinned] - закреплено ли сообщение
 * @property {boolean} [favorite] - в избранном ли
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

/**
 * Генерация UUID v4 с использованием библиотеки uuid
 * @returns {string}
 */
export function generateId() {
  return uuidv4();
}
