import fs from "fs/promises";
import Router from "koa-router";
import { dataStore } from "../DataStore.js";
import { applyArchive } from "../ArchiveService.js";

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

  if (!Array.isArray(archive.messages)) {
    ctx.status = 400;
    ctx.body = { error: "Архив должен содержать массив messages." };
    return;
  }

  const imported = applyArchive(dataStore, archive);

  ctx.body = {
    success: true,
    imported,
  };
});

export default router;
