import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
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

// CORS middleware (PATCH нужен для favorite/pin и др.)
app.use(cors({
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
// Explicit HTTP server so WebSocket upgrade is on the same server (matches Render docs pattern).
const server = http.createServer(app.callback());
attachWebSocket(server);
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

function saveStateOnExit() {
  dataStore.persistSync();
}
process.on('beforeExit', saveStateOnExit);
process.on('SIGINT', () => { saveStateOnExit(); process.exit(0); });
process.on('SIGTERM', () => { saveStateOnExit(); process.exit(0); });

export default server;