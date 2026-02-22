/**
 * WebSocket-сервис для рассылки событий клиентам (новые сообщения, удаление, обновление).
 * Подключается к существующему HTTP-серверу Koa по пути /ws.
 */
import { WebSocketServer } from 'ws';

const WS_PATH = '/ws';
const clients = new Set();
let wss = null;

/**
 * Подключает WebSocket-сервер к существующему HTTP-серверу.
 * @param {import('http').Server} server - HTTP-сервер (результат app.listen())
 */
export function attach(server) {
  if (wss) {
    wss.close();
    clients.clear();
  }

  wss = new WebSocketServer({ server, path: WS_PATH });

  wss.on('connection', (ws, req) => {
    clients.add(ws);
    console.log(`WebSocket: клиент подключён (всего: ${clients.size}), path: ${req.url}`);

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`WebSocket: клиент отключён (осталось: ${clients.size})`);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      clients.delete(ws);
    });
  });

  wss.on('error', (err) => {
    console.error('WebSocketServer error:', err.message);
  });

  console.log(`WebSocket-сервер доступен по пути ${WS_PATH}`);
}

/**
 * Рассылает событие всем подключённым клиентам.
 * @param {string} event - тип события: new_message | message_updated | message_deleted
 * @param {Object} payload - данные (например, сообщение или { id } для удаления)
 */
export function broadcast(event, payload) {
  if (clients.size === 0) return;
  const data = JSON.stringify({ event, payload });
  clients.forEach((ws) => {
    if (ws.readyState === 1) {
      try {
        ws.send(data);
      } catch (err) {
        console.error('WebSocket send error:', err.message);
      }
    }
  });
}
