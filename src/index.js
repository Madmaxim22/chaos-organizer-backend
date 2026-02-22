import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Koa from 'koa';
import koaBody from 'koa-body';
import cors from 'koa-cors';
import router from './routes/index.js';
import { dataStore } from './DataStore.js';
import { attach as attachWebSocket } from './WebSocketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загрузка .env из корня проекта (рядом с package.json)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = new Koa();

// CORS: в проде задайте CORS_ORIGIN (например https://your-user.github.io или несколько через запятую)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : null;
app.use(cors({
  origin: allowedOrigins
    ? (ctx) => { const o = ctx.request.get('origin') || ''; return allowedOrigins.includes(o) ? o : false; }
    : true,
  methods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
}));

// Middleware для обработки JSON и multipart/form-data
app.use(koaBody.default({
  multipart: true,
  urlencoded: true,
  json: true,
  formidable: {       // Настройки для обработки файлов
      maxFileSize: 1024 * 1024 * 1024, // 1 Гб
    },
  parsedMethods: ['POST', 'PUT', 'PATCH']
}));

// Подключение маршрутов
app.use(router.routes()).use(router.allowedMethods());

// Обработка 404
app.use((ctx) => {
  ctx.status = 404;
  ctx.body = { error: 'Not Found' };
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
attachWebSocket(server);

function saveStateOnExit() {
  dataStore.persistSync();
}
process.on('beforeExit', saveStateOnExit);
process.on('SIGINT', () => { saveStateOnExit(); process.exit(0); });
process.on('SIGTERM', () => { saveStateOnExit(); process.exit(0); });

export default server;