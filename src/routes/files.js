import Router from "koa-router";
import { dataStore } from "../DataStore.js";
import { FileService } from "../FileService.js";
import path from 'path';
import fsPromises from 'fs/promises';
import fs from 'fs';

const router = new Router();

// Скачивание файла по ID метаданных (message.metadata.id)
router.get("/api/files/:fileId", async (ctx) => {
  const { fileId } = ctx.params;
  const fileData = await FileService.getFileById(fileId);
  
  if (!fileData) {
    ctx.status = 404;
    ctx.body = { error: "Файл не найден" };
    return;
  }
  
  try {
    await fsPromises.access(fileData.filePath);
    const stats = await fsPromises.stat(fileData.filePath);
    const fileName = path.basename(fileData.filePath);
    
    ctx.set('Content-Disposition', `attachment; filename="${fileName}"`);
    ctx.set('Content-Type', 'application/octet-stream');
    ctx.set('Content-Length', stats.size);
    ctx.body = fs.createReadStream(fileData.filePath);
  } catch (err) {
    ctx.status = 404;
    ctx.body = { error: "Файл не найден на диске" };
  }
});

// Отображение изображения по ID метаданных (для использования в тегах img)
router.get("/api/files/images/:fileId", async (ctx) => {
  const { fileId } = ctx.params;
  const fileData = await FileService.getFileById(fileId);
  
  if (!fileData) {
    ctx.status = 404;
    ctx.body = { error: "Изображение не найдено" };
    return;
  }
  
  try {
    await fsPromises.access(fileData.filePath);
    const stats = await fsPromises.stat(fileData.filePath);
    const fileName = path.basename(fileData.filePath);
    const ext = path.extname(fileName).toLowerCase();
    
    // Определяем MIME-тип на основе расширения файла
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    ctx.set('Content-Type', contentType);
    ctx.set('Content-Length', stats.size);
    ctx.body = fs.createReadStream(fileData.filePath);
  } catch (err) {
    console.error('Ошибка при чтении файла:', err);
    ctx.status = 404;
    ctx.body = { error: "Изображение не найдено на диске" };
  }
});

// Отображение видео по ID метаданных (для использования в тегах video)
router.get("/api/files/videos/:fileId", async (ctx) => {
  const { fileId } = ctx.params;
  const fileData = await FileService.getFileById(fileId);
  
  if (!fileData) {
    ctx.status = 404;
    ctx.body = { error: "Видео не найдено" };
    return;
  }
  
  try {
    await fsPromises.access(fileData.filePath);
    const stats = await fsPromises.stat(fileData.filePath);
    const fileName = path.basename(fileData.filePath);
    const ext = path.extname(fileName).toLowerCase();
    
    // Определяем MIME-тип на основе расширения файла
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.ogv': 'video/ogg',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.wmv': 'video/x-ms-wmv',
      '.flv': 'video/x-flv',
      '.mkv': 'video/x-matroska',
      '.mpeg': 'video/mpeg',
      '.mpg': 'video/mpeg',
      '.3gp': 'video/3gpp',
      '.m4v': 'video/x-m4v'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const fileSize = stats.size;
    ctx.set('Content-Type', contentType);
    ctx.set('Accept-Ranges', 'bytes');

    const rangeHeader = ctx.get('range');
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.slice(6).split('-');
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const endClamped = Math.min(end, fileSize - 1);
      const startClamped = Math.min(start, endClamped);
      const chunkLength = endClamped - startClamped + 1;

      ctx.status = 206;
      ctx.set('Content-Range', `bytes ${startClamped}-${endClamped}/${fileSize}`);
      ctx.set('Content-Length', chunkLength);
      ctx.body = fs.createReadStream(fileData.filePath, { start: startClamped, end: endClamped });
    } else {
      ctx.set('Content-Length', fileSize);
      ctx.body = fs.createReadStream(fileData.filePath);
    }
  } catch (err) {
    console.error('Ошибка при чтении файла:', err);
    ctx.status = 404;
    ctx.body = { error: "Видео не найдено на диске" };
  }
});

// Отображение аудио по ID метаданных (для использования в тегах audio)
router.get("/api/files/audio/:fileId", async (ctx) => {
  const { fileId } = ctx.params;
  const fileData = await FileService.getFileById(fileId);
  
  if (!fileData) {
    ctx.status = 404;
    ctx.body = { error: "Аудио не найдено" };
    return;
  }
  
  try {
    await fsPromises.access(fileData.filePath);
    const stats = await fsPromises.stat(fileData.filePath);
    const fileName = path.basename(fileData.filePath);
    const ext = path.extname(fileName).toLowerCase();
    
    // Определяем MIME-тип на основе расширения файла
    const mimeTypes = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.oga': 'audio/ogg',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.m4a': 'audio/mp4',
      '.wma': 'audio/x-ms-wma',
      '.opus': 'audio/opus'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    ctx.set('Content-Type', contentType);
    ctx.set('Content-Length', stats.size);
    ctx.body = fs.createReadStream(fileData.filePath);
  } catch (err) {
    console.error('Ошибка при чтении файла:', err);
    ctx.status = 404;
    ctx.body = { error: "Аудио не найдено на диске" };
  }
});

// Скачивание всех вложений сообщения по ID сообщения в виде ZIP-архива
router.get("/api/files/messages/:id", async (ctx) => {
  const message = dataStore.findMessageById(ctx.params.id);
  
  if (!message) {
    ctx.status = 404;
    ctx.body = { error: "Сообщение не найдено" };
    return;
  }
  
  try {
    // Проверяем, есть ли у сообщения метаданные с файлами
    const metadataList = message.metadata && Array.isArray(message.metadata) ? message.metadata : [message.metadata].filter(Boolean);
    
    if (!metadataList.length) {
      ctx.status = 404;
      ctx.body = { error: "У сообщения нет вложений" };
      return;
    }
    
    const zipBuffer = await FileService.createAttachmentsZip(metadataList);
    
    ctx.set('Content-Disposition', `attachment; filename="message-${message.id}-attachments.zip"`);
    ctx.set('Content-Type', 'application/zip');
    ctx.set('Content-Length', zipBuffer.length);
    ctx.body = zipBuffer;
  } catch (error) {
    console.error('Ошибка при создании архива вложений:', error);
    ctx.status = 500;
    ctx.body = { error: 'Ошибка при создании архива вложений' };
  }
});

export default router;