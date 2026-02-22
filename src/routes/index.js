import Router from "koa-router";
import { dataStore } from "../DataStore.js";
import { Util } from "../Util.js";
import { formatMessageForResponse } from "../models.js";
import messagesRouter from "./messages.js";
import remindersRouter from "./reminders.js";
import filesRouter from "./files.js";
import importRouter from "./import.js";
import exportRouter from "./export.js";
import staticMapRouter from "./staticMap.js";

const router = new Router();

// Базовый маршрут для проверки работоспособности
router.get("/", (ctx) => {
  ctx.body = {
    message: "Chaos Organizer Backend is running",
    timestamp: new Date().toISOString(),
    endpoints: {
      messages: "/api/messages",
      search: "/api/search/messages",
      reminders: "/api/reminders",
      attachments: "/api/attachments",
      export: "/api/export",
      import: "/api/import",
      events: "/api/events",
    },
  };
});

// Поиск/фильтрация сообщений — отдельный путь, без конфликта с /api/messages/:id
router.get("/api/search/messages", (ctx) => {
  const rawQ = ctx.query.q;
  const q = rawQ != null ? String(Array.isArray(rawQ) ? rawQ[0] : rawQ).trim() : "";
  const type = ctx.query.type;
  const dateFrom = ctx.query.dateFrom;
  const dateTo = ctx.query.dateTo;
  const favorite = ctx.query.favorite;

  let filteredMessages = [...dataStore.messages];
  filteredMessages = Util.searchMessagesByQueryAndType(filteredMessages, q || undefined, type || undefined);
  if (favorite === "true" || favorite === true) {
    filteredMessages = filteredMessages.filter((msg) => msg.favorite === true);
  }
  if (dateFrom || dateTo) {
    filteredMessages = Util.filterMessagesByDate(
      filteredMessages,
      dateFrom ? new Date(dateFrom) : null,
      dateTo ? new Date(dateTo) : null,
    );
  }
  const sorted = Util.sortMessages(filteredMessages, "timestamp", "desc");
  const messagesWithType = sorted.map((msg) => ({
    ...msg,
    type: msg.type || Util.inferMessageTypeFromData(msg),
  }));
  ctx.body = {
    messages: messagesWithType.map(formatMessageForResponse),
    total: messagesWithType.length,
  };
});

// Подключение всех подроутеров
router.use(messagesRouter.routes(), messagesRouter.allowedMethods());
router.use(remindersRouter.routes(), remindersRouter.allowedMethods());
router.use(filesRouter.routes(), filesRouter.allowedMethods());
router.use(importRouter.routes(), importRouter.allowedMethods());
router.use(exportRouter.routes(), exportRouter.allowedMethods());
router.use(staticMapRouter.routes(), staticMapRouter.allowedMethods());

export default router;