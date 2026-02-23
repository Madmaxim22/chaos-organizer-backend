/**
 * Сервис формирования и применения архива экспорта/импорта.
 */

/**
 * Собрать объект архива для экспорта из хранилища.
 * @param {import('./DataStore.js').DataStore} dataStore
 * @returns {Object} архив (messages, reminders, stickers, favorites, pinnedMessage, meta)
 */
export function buildArchive(dataStore) {
  return {
    meta: {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      totalMessages: dataStore.messages.length,
      totalReminders: dataStore.reminders.length,
      totalStickers: dataStore.stickers.length,
      favoritesCount: dataStore.favorites.size,
      pinnedMessageId: dataStore.pinnedMessage
        ? dataStore.pinnedMessage.id
        : null,
    },
    messages: dataStore.messages,
    reminders: dataStore.reminders,
    stickers: dataStore.stickers,
    favorites: Array.from(dataStore.favorites),
    pinnedMessage: dataStore.pinnedMessage,
  };
}

/**
 * Применить импортированный архив к хранилищу: очистка и загрузка сообщений, избранного, напоминаний, стикеров, закреплённого.
 * @param {import('./DataStore.js').DataStore} dataStore
 * @param {Object} archive - объект архива (должен содержать messages — массив)
 * @returns {{ messages: number, favorites: number, reminders: number, stickers: number }} счётчики импортированных сущностей
 */
export function applyArchive(dataStore, archive) {
  dataStore.clearAll();

  archive.messages.forEach((msg) => {
    if (msg.id && msg.type && msg.content && msg.timestamp) {
      dataStore.messages.push(msg);
    }
  });

  if (Array.isArray(archive.favorites)) {
    archive.favorites.forEach((id) => dataStore.favorites.add(id));
  }

  if (Array.isArray(archive.reminders)) {
    archive.reminders.forEach((rem) => dataStore.reminders.push(rem));
  }

  if (Array.isArray(archive.stickers)) {
    archive.stickers.forEach((sticker) => dataStore.stickers.push(sticker));
  }

  if (archive.pinnedMessage && archive.pinnedMessage.id) {
    const pinned = dataStore.messages.find(
      (m) => m.id === archive.pinnedMessage.id,
    );
    if (pinned) {
      dataStore.pinnedMessage = pinned;
      pinned.pinned = true;
    }
  }

  dataStore.schedulePersist();

  return {
    messages: dataStore.messages.length,
    favorites: dataStore.favorites.size,
    reminders: dataStore.reminders.length,
    stickers: dataStore.stickers.length,
  };
}
