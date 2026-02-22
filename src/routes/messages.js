import Router from "koa-router";
import { dataStore } from "../DataStore.js";
import { FileService } from "../FileService.js";
import { normalizeMessageCreate, formatMessageForResponse } from "../models.js";
import { parseChaosCommand, getBotResponse } from "../ChaosBot.js";
import { broadcast } from "../WebSocketService.js";

const router = new Router();

// Получить все сообщения (только пагинация: limit, offset)
router.get("/api/messages", (ctx) => {
  const offset = ctx.query.offset != null ? ctx.query.offset : 0;
  const limit = ctx.query.limit != null ? ctx.query.limit : 10;
  const start = parseInt(offset, 10);
  const count = parseInt(limit, 10);
  const sorted = dataStore.messages.sort((a, b) => b.timestamp - a.timestamp);
  const paginated = sorted.slice(start, start + count);
  ctx.body = {
    messages: paginated.map(formatMessageForResponse),
    total: dataStore.messages.length,
    offset: start,
    limit: count,
  };
});

// Добавить новое сообщение (поддерживает FormData с файлами и текстом)
router.post("/api/messages", async (ctx) => {
  try {
    const body = ctx.request.body;
    const files = ctx.request.files;

    console.log('POST /api/messages body:', body);
    console.log('POST /api/messages files:', files);

    // Сохраняем каждый файл и добавляем метаданные
    const fileMetadatas = [];
    
    
    // Обработка файлов из ctx.request.files
    if (files && typeof files === 'object') {
      const fileArray = Array.isArray(files.files) ? files.files : [files.files];

      for (const file of fileArray) {
        if (file && file.size > 0) {
          try {
            const fileMetadata = await FileService.saveUploadedFile(file);
            fileMetadatas.push(fileMetadata);
          } catch (fileError) {
            console.error('Ошибка при сохранении файла:', fileError);
          }
        }
      }
    }

    const inferredType =
      fileMetadatas.length > 0 && fileMetadatas[0].mimeType
        ? FileService.determineMessageType(fileMetadatas[0].mimeType)
        : undefined;

    const createData = normalizeMessageCreate(body, fileMetadatas, inferredType);
    const userMessage = dataStore.addMessage(createData);
    broadcast('new_message', formatMessageForResponse(userMessage));

    const content = (body && body.content) ? String(body.content).trim() : '';
    const chaosCommand = parseChaosCommand(content);

    if (chaosCommand && (!files || !Object.keys(files).length)) {
      const botText = getBotResponse(chaosCommand, { reminders: dataStore.reminders });
      const botTimestamp = new Date(userMessage.timestamp.getTime() + 1);
      const botMessage = dataStore.addMessage({
        author: 'Chaos Bot',
        content: botText,
        timestamp: botTimestamp,
      });
      broadcast('new_message', formatMessageForResponse(botMessage));
      ctx.status = 201;
      ctx.body = {
        message: formatMessageForResponse(userMessage),
        botReply: formatMessageForResponse(botMessage),
      };
      return;
    }

    ctx.status = 201;
    ctx.body = formatMessageForResponse(userMessage);
  } catch (error) {
    console.error('Ошибка при создании сообщения:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
});

// Удалить сообщение по ID
router.delete("/api/messages/:id", async (ctx) => {
  const message = dataStore.findMessageById(ctx.params.id);
  if (!message) {
    ctx.status = 404;
    ctx.body = { error: "Сообщение не найдено" };
    return;
  }

  // Удаляем файлы, связанные с сообщением
  if (message.metadata && Array.isArray(message.metadata) && message.metadata.length > 0) {
    for (const fileMetadata of message.metadata) {
      if (fileMetadata.id) {
        try {
          await FileService.deleteFileById(fileMetadata.id);
        } catch (error) {
          console.error(`Ошибка при удалении файла ${fileMetadata.id}:`, error);
          // Продолжаем удаление сообщения даже если файл не удалось удалить
        }
      }
    }
  }

  // Удаляем само сообщение
  const deleted = dataStore.deleteMessage(ctx.params.id);
  if (!deleted) {
    ctx.status = 500;
    ctx.body = { error: "Ошибка при удалении сообщения" };
    return;
  }

  broadcast('message_deleted', { id: ctx.params.id });
  ctx.body = { success: true };
});

// Закрепить/открепить сообщение (возвращаем полное сообщение для обновления UI)
router.patch("/api/messages/:id/pin", (ctx) => {
  dataStore.togglePin(ctx.params.id);
  const message = dataStore.findMessageById(ctx.params.id);
  if (!message) {
    ctx.status = 404;
    ctx.body = { error: "Сообщение не найдено" };
    return;
  }
  const formatted = formatMessageForResponse(message);
  broadcast('message_updated', formatted);
  ctx.body = formatted;
});

// Добавить/удалить из избранного
router.patch("/api/messages/:id/favorite", (ctx) => {
  const message = dataStore.findMessageById(ctx.params.id);
  if (!message) {
    ctx.status = 404;
    ctx.body = { error: "Сообщение не найдено" };
    return;
  }
  
  // Если передано конкретное значение favorite в теле запроса, устанавливаем его
  // Иначе переключаем состояние
  const desiredFavorite = ctx.request.body?.favorite;
  let favorited;
  
  if (desiredFavorite !== undefined && desiredFavorite !== null) {
    // Устанавливаем конкретное состояние (обрабатываем boolean и строковые значения)
    const favoriteValue = desiredFavorite === true || desiredFavorite === 'true';
    favorited = dataStore.setFavoriteForMessage(message, favoriteValue);
  } else {
    // Переключаем состояние (для обратной совместимости)
    favorited = dataStore.toggleFavoriteForMessage(message);
  }

  const formatted = formatMessageForResponse(message);
  broadcast('message_updated', formatted);
  ctx.body = formatted;
});

export default router;