# Chaos Organizer Backend

Бэкенд для проекта **Chaos Organizer** — органайзера в стиле мессенджера: сообщения, вложения, напоминания, стикеры и встроенный бот.

## Технологии

- **Фреймворк:** [Koa](https://koajs.com/) (koa-router, koa-body, koa-cors)
- **Протоколы:** HTTP (REST), WebSocket (`ws`)
- **Данные:** в памяти процесса с сохранением в `data/state.json`
- **Файлы:** загрузка через multipart, хранение на диске, раздача по ID

## Требования

- Node.js (рекомендуется 18+)
- npm

## Установка и запуск

1. Клонируйте репозиторий и перейдите в каталог:

   ```bash
   cd chaos-organizer-backend
   ```

2. Установите зависимости:

   ```bash
   npm install
   ```

3. (Опционально) Создайте файл `.env` в корне проекта:

   ```env
   PORT=3000
   API_YANDEX_MAPS_KEY=your_key   # для /api/static-map
   CORS_ORIGIN=https://your-user.github.io   # для деплоя: origin фронта (GitHub Pages), через запятую — несколько
   ```

4. Запуск:

   ```bash
   npm start
   ```

   Или в режиме разработки с автоперезапуском:

   ```bash
   npm run dev
   ```

Сервер по умолчанию доступен на `http://localhost:3000`.

## Сводка эндпоинтов

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Информация о сервере |
| GET | `/api/messages` | Список сообщений (пагинация) |
| GET | `/api/messages/:id` | Одно сообщение |
| POST | `/api/messages` | Создать сообщение |
| DELETE | `/api/messages/:id` | Удалить сообщение |
| PATCH | `/api/messages/:id/pin` | Закрепить/открепить |
| PATCH | `/api/messages/:id/favorite` | В избранное |
| GET | `/api/search/messages` | Поиск сообщений |
| GET | `/api/files/:fileId` | Скачать файл |
| GET | `/api/files/images/:fileId` | Изображение |
| GET | `/api/files/videos/:fileId` | Видео |
| GET | `/api/files/audio/:fileId` | Аудио |
| GET | `/api/files/messages/:id` | Файлы сообщения |
| GET | `/api/reminders` | Список напоминаний |
| POST | `/api/reminders` | Создать напоминание |
| GET | `/api/export` | Экспорт архива |
| POST | `/api/import` | Импорт архива |
| GET | `/api/static-map` | Статическая карта (Yandex) |
| WS | `/ws` | WebSocket (события в реальном времени) |

## API (подробно)

### Проверка работы

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Информация о сервере и список эндпоинтов |

### Сообщения

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/messages` | Список сообщений (пагинация: `?offset=0&limit=10`) |
| POST | `/api/messages` | Создать сообщение (JSON или FormData с файлами). Команды бота обрабатываются при отправке текста, например «@chaos: погода». |
| DELETE | `/api/messages/:id` | Удалить сообщение |
| PATCH | `/api/messages/:id/pin` | Закрепить/открепить сообщение |
| PATCH | `/api/messages/:id/favorite` | Добавить/убрать из избранного (тело: `{ "favorite": true \| false }`) |

### Поиск

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/search/messages` | Поиск по сообщениям: `?q=текст&type=...&favorite=true&dateFrom=...&dateTo=...` |

### Файлы

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/files/:fileId` | Скачать файл по ID |
| GET | `/api/files/images/:fileId` | Изображение (для `<img>`) |
| GET | `/api/files/videos/:fileId` | Видео (для `<video>`) |
| GET | `/api/files/audio/:fileId` | Аудио |
| GET | `/api/files/messages/:id` | Метаданные файлов сообщения |

### Напоминания

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/reminders` | Список напоминаний |
| POST | `/api/reminders` | Создать: `{ "text": "...", "triggerAt": "ISO date" }` |

### Экспорт и импорт

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/export` | Скачать архив в JSON (сообщения, напоминания, стикеры, избранное, закреплённое) |
| POST | `/api/import` | Импорт архива: тело `{ "archive": { ... } }` или загрузка JSON-файла (multipart `file`) |

### Карта (Yandex Static API)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/static-map` | Прокси статической карты: `?lat=...&lon=...&w=640&h=400&z=16`. Требуется `API_YANDEX_MAPS_KEY` в `.env`. |

## WebSocket

Подключение по пути **`/ws`** (тот же хост и порт, что и HTTP).

Сервер рассылает события в формате:

```json
{ "event": "new_message" | "message_updated" | "message_deleted", "payload": { ... } }
```

- `new_message` — добавлено новое сообщение (в `payload` — объект сообщения).
- `message_updated` — обновлено (pin/favorite) (в `payload` — полное сообщение).
- `message_deleted` — удалено (в `payload` — `{ "id": "..." }`).

## Структура проекта

```
chaos-organizer-backend/
├── src/
│   ├── index.js           # Точка входа, Koa, CORS, body, WebSocket
│   ├── DataStore.js       # Хранение сообщений, напоминаний, стикеров, состояние
│   ├── WebSocketService.js
│   ├── FileService.js
│   ├── ChaosBot.js
│   ├── models.js
│   ├── Util.js
│   └── routes/
│       ├── index.js       # Сводный роутер, поиск
│       ├── messages.js
│       ├── files.js
│       ├── reminders.js
│       ├── import.js
│       ├── export.js
│       └── staticMap.js
├── data/
│   └── state.json         # Персистентное состояние (создаётся при первом сохранении)
├── package.json
├── .env                   # Опционально: PORT, API_YANDEX_MAPS_KEY, CORS_ORIGIN
└── README.md
```

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `PORT` | Порт HTTP-сервера (по умолчанию `3000`) |
| `API_YANDEX_MAPS_KEY` | Ключ Yandex Static API для эндпоинта `/api/static-map` |
| `CORS_ORIGIN` | Разрешённый origin для CORS (например `https://your-user.github.io` для GitHub Pages; несколько — через запятую). Не задано — разрешён любой origin |

## Зависимости (основные)

- **koa**, **koa-router**, **koa-body**, **koa-cors** — сервер и маршрутизация
- **ws** — WebSocket
- **uuid** — идентификаторы
- **dotenv** — загрузка `.env`
- **jszip**, **@zip.js/zip.js** — работа с архивами
- **http-event-stream** — SSE (если используется в других частях)

Разработка: **nodemon**, **eslint**.

## Лицензия

MIT. Автор: Maksim Muhomedyarov (madmaxim22@gmail.com).
