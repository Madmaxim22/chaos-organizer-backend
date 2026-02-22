import Router from "koa-router";
import { dataStore } from "../DataStore.js";

const router = new Router();

// Экспорт истории в формате JSON
router.get("/api/export", (ctx) => {
  const archive = {
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

  // Установка заголовков для скачивания файла
  ctx.set(
    "Content-Disposition",
    'attachment; filename="chaos-organizer-backup.json"',
  );
  ctx.set("Content-Type", "application/json");
  ctx.body = JSON.stringify(archive, null, 2);
});

export default router;