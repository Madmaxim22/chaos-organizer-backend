import Koa from 'koa';
import koaBody from 'koa-body';
import serve from 'koa-static';
import path from 'path';
import { fileURLToPath } from 'url';
import router from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new Koa();

// Middleware для обработки JSON и multipart/form-data
app.use(koaBody.default({
  multipart: true,
  urlencoded: true,
  json: true,
}));

// Обслуживание статических файлов из папки public
app.use(serve(path.join(__dirname, '../public')));

// Подключение маршрутов
app.use(router.routes()).use(router.allowedMethods());

// Обработка 404
app.use((ctx) => {
  ctx.status = 404;
  ctx.body = { error: 'Not Found' };
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
  console.log(`📁 Static files served from ${path.join(__dirname, '../public')}`);
});

export default server;