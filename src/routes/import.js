import fs from "fs/promises";
import Router from "koa-router";
import { dataStore } from "../DataStore.js";

const router = new Router();

/**
 * Получает объект архива из запроса: из загруженного файла (multipart) или из body.archive (JSON).
 * @param {Object} ctx - контекст Koa
 * @returns {Promise<Object|null>} archive или null
 */
async function getArchiveFromRequest(ctx) {
  const file = ctx.request.files?.file;
  if (file) {
    const single = Array.isArray(file) ? file[0] : file;
    const path = single?.filepath;
    if (path) {
      const raw = await fs.readFile(path, "utf-8");
      return JSON.parse(raw);
    }
  }
  return ctx.request.body?.archive ?? null;
}

// Импорт истории из архива JSON (файл или body.archive)
router.post("/api/import", async (ctx) => {
  let archive;
  try {
    archive = await getArchiveFromRequest(ctx);
  } catch (err) {
    ctx.status = 400;
    ctx.body = { error: "Не удалось прочитать архив. Проверьте, что файл — валидный JSON." };
    return;
  }

  if (!archive || typeof archive !== "object") {
    ctx.status = 400;
    ctx.body = { error: "Некорректный архив. Загрузите файл экспорта или передайте объект archive." };
    return;
  }

  // Валидация обязательных полей
  if (!Array.isArray(archive.messages)) {
    ctx.status = 400;
    ctx.body = { error: "Архив должен содержать массив messages." };
    return;
  }

  // Очистка текущих данных (опционально, можно добавить флаг merge)
  dataStore.clearAll();

  // Импорт сообщений
  archive.messages.forEach((msg) => {
    // Проверяем наличие обязательных полей
    if (msg.id && msg.type && msg.content && msg.timestamp) {
      dataStore.messages.push(msg);
    }
  });

  // Импорт избранного
  if (Array.isArray(archive.favorites)) {
    archive.favorites.forEach((id) => dataStore.favorites.add(id));
  }

  // Импорт напоминаний
  if (Array.isArray(archive.reminders)) {
    archive.reminders.forEach((rem) => dataStore.reminders.push(rem));
  }

  // Импорт стикеров
  if (Array.isArray(archive.stickers)) {
    archive.stickers.forEach((sticker) => dataStore.stickers.push(sticker));
  }

  // Импорт закреплённого сообщения
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

  ctx.body = {
    success: true,
    imported: {
      messages: dataStore.messages.length,
      favorites: dataStore.favorites.size,
      reminders: dataStore.reminders.length,
      stickers: dataStore.stickers.length,
    },
  };
});

export default router;