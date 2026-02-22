import Router from "koa-router";
import { dataStore } from "../DataStore.js";

const router = new Router();

// Получить все напоминания
router.get("/api/reminders", (ctx) => {
  ctx.body = dataStore.reminders;
});

// Добавить напоминание
router.post("/api/reminders", (ctx) => {
  const { text, triggerAt } = ctx.request.body;
  if (!text) {
    ctx.status = 400;
    ctx.body = { error: "Поле text обязательно" };
    return;
  }
  const reminder = dataStore.addReminder({
    text,
    triggerAt: triggerAt ? new Date(triggerAt) : undefined,
  });
  ctx.status = 201;
  ctx.body = reminder;
});

export default router;