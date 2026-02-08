import { MessageType, generateId } from './models.js';

/**
 * Демо-сообщения для инициализации
 */
export const demoMessages = [
  {
    id: generateId(),
    type: MessageType.TEXT,
    content: 'Добро пожаловать в Chaos Organizer!',
    timestamp: new Date(Date.now() - 3600000 * 24 * 2), // 2 дня назад
    author: 'Система',
    encrypted: false,
    pinned: false,
    favorite: false,
  },
  {
    id: generateId(),
    type: MessageType.LINK,
    content: 'https://github.com/chaos-organizer',
    timestamp: new Date(Date.now() - 3600000 * 24 * 1), // 1 день назад
    author: 'Пользователь',
    encrypted: false,
    pinned: false,
    favorite: true,
  },
  {
    id: generateId(),
    type: MessageType.IMAGE,
    content: '/uploads/demo-image.jpg',
    timestamp: new Date(Date.now() - 3600000 * 12), // 12 часов назад
    author: 'Пользователь',
    metadata: {
      fileName: 'demo-image.jpg',
      fileSize: 1024 * 512,
      mimeType: 'image/jpeg',
      dimensions: { width: 800, height: 600 },
    },
    encrypted: false,
    pinned: true,
    favorite: false,
  },
  {
    id: generateId(),
    type: MessageType.VIDEO,
    content: '/uploads/demo-video.mp4',
    timestamp: new Date(Date.now() - 3600000 * 6), // 6 часов назад
    author: 'Пользователь',
    metadata: {
      fileName: 'demo-video.mp4',
      fileSize: 1024 * 1024 * 5,
      mimeType: 'video/mp4',
      dimensions: { width: 1280, height: 720 },
      duration: 120,
    },
    encrypted: false,
    pinned: false,
    favorite: true,
  },
  {
    id: generateId(),
    type: MessageType.AUDIO,
    content: '/uploads/demo-audio.mp3',
    timestamp: new Date(Date.now() - 3600000 * 3), // 3 часа назад
    author: 'Пользователь',
    metadata: {
      fileName: 'demo-audio.mp3',
      fileSize: 1024 * 1024 * 2,
      mimeType: 'audio/mpeg',
      duration: 180,
    },
    encrypted: true,
    pinned: false,
    favorite: false,
  },
  {
    id: generateId(),
    type: MessageType.FILE,
    content: '/uploads/document.pdf',
    timestamp: new Date(Date.now() - 3600000 * 1), // 1 час назад
    author: 'Пользователь',
    metadata: {
      fileName: 'document.pdf',
      fileSize: 1024 * 300,
      mimeType: 'application/pdf',
    },
    encrypted: false,
    pinned: false,
    favorite: false,
  },
  {
    id: generateId(),
    type: MessageType.TEXT,
    content: 'Не забудьте проверить напоминания!',
    timestamp: new Date(),
    author: 'Бот',
    encrypted: false,
    pinned: false,
    favorite: false,
  },
];

/**
 * Демо-стикеры/эмодзи для инициализации
 */
export const demoStickers = [
  {
    id: generateId(),
    name: 'smile',
    content: '😊',
    category: 'faces',
    createdAt: new Date(),
  },
  {
    id: generateId(),
    name: 'heart',
    content: '❤️',
    category: 'symbols',
    createdAt: new Date(),
  },
  {
    id: generateId(),
    name: 'thumbs-up',
    content: '👍',
    category: 'gestures',
    createdAt: new Date(),
  },
];

/**
 * Демо-напоминания для инициализации
 */
export const demoReminders = [
  {
    id: generateId(),
    text: 'Последний день лета',
    triggerAt: new Date(Date.now() + 3600000 * 2), // через 2 часа
    createdAt: new Date(),
    notified: false,
  },
  {
    id: generateId(),
    text: 'Встреча с командой',
    triggerAt: new Date(Date.now() + 3600000 * 24), // через 24 часа
    createdAt: new Date(),
    notified: false,
  },
];