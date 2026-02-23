import Router from "koa-router";
import { dataStore } from "../DataStore.js";
import { buildArchive } from "../ArchiveService.js";

const router = new Router();

router.get("/api/export", (ctx) => {
  const archive = buildArchive(dataStore);

  ctx.set(
    "Content-Disposition",
    'attachment; filename="chaos-organizer-backup.json"',
  );
  ctx.set("Content-Type", "application/json");
  ctx.body = JSON.stringify(archive, null, 2);
});

export default router;
