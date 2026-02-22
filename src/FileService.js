import { v4 as uuidv4 } from 'uuid';
import fsPromises from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MessageType } from './models.js';
import JSZip from 'jszip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Сервис для работы с загруженными файлами
 */
export class FileService {
  /**
   * Определить тип сообщения по MIME-типу файла
   * @param {string} mimeType - MIME-тип файла
   * @returns {string} тип сообщения (MessageType)
   */
  static determineMessageType(mimeType) {
    if (!mimeType) return MessageType.TEXT;
    if (mimeType.startsWith('image/')) return MessageType.IMAGE;
    if (mimeType.startsWith('video/')) return MessageType.VIDEO;
    if (mimeType.startsWith('audio/')) return MessageType.AUDIO;
    // Если это PDF, архив, документ - считаем файлом
    if (mimeType === 'application/pdf' || mimeType.includes('zip') || mimeType.includes('document')) {
      return MessageType.FILE;
    }
    // По умолчанию файл
    return MessageType.FILE;
  }

  /**
   * Определить MIME-тип по расширению файла (fallback, если загрузчик не передал mimetype).
   * @param {string} ext - расширение с точкой (например .jpg)
   * @returns {string}
   */
  static getMimeTypeByExtension(ext) {
    const e = (ext || '').toLowerCase();
    const map = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
      '.webp': 'image/webp', '.svg': 'image/svg+xml', '.bmp': 'image/bmp',
      '.mp4': 'video/mp4', '.webm': 'video/webm', '.avi': 'video/x-msvideo', '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
      '.pdf': 'application/pdf', '.zip': 'application/zip', '.msi': 'application/octet-stream',
    };
    return map[e] || '';
  }

  /**
   * Получить путь к папке uploads (абсолютный)
   * @returns {string}
   */
  static getUploadsDir() {
    return path.join(__dirname, '../uploads');
  }

  /**
   * Сохранить загруженный файл в папку uploads
   * @param {Object} file - объект файла из koa-body 
   * @returns {Promise<Object>} объект с метаданными файла { fileName, filePath, fileSize, mimeType }
   */
  static async saveUploadedFile(file) {
    const uploadsDir = this.getUploadsDir();
    
    // Создаем директорию uploads, если она не существует
    await fsPromises.mkdir(uploadsDir, { recursive: true });

    const originalName = file.originalFilename || file.name || 'file';
    const ext = path.extname(originalName) || '';
    const id = uuidv4();
    const fileName = `${id}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    // Проверяем, что file.filepath существует
    if (!file.filepath) {
      throw new Error('Путь к файлу отсутствует');
    }

    // Логируем пути для отладки
    console.log('Временный файл:', file.filepath);
    console.log('Целевой файл:', filePath);
    
    try {
      // Проверяем существование исходного файла
      await fsPromises.access(file.filepath);
    } catch (error) {
      // Выводим список файлов в директории для отладки
      const tempDir = path.dirname(file.filepath);
      throw new Error(`Исходный файл не найден: ${file.filepath}. Ошибка: ${error.message}`);
    }

    // Убедимся, что поток записи завершен
    if (file._writeStream && !file._writeStream.destroyed) {
      // Ждем завершения записи
      await new Promise((resolve, reject) => {
        file._writeStream.on('close', resolve);
        file._writeStream.on('error', reject);
        
        // Закрываем поток, если он еще открыт
        if (!file._writeStream.closed) {
          file._writeStream.end();
        }
      });
    }

    try {
      // Перемещаем файл из временного места в целевую папку
      await fsPromises.rename(file.filepath, filePath);
    } catch (renameError) {
      throw renameError;
    }

    const mimeType =
      file.mimetype ||
      FileService.getMimeTypeByExtension(ext) ||
      'application/octet-stream';

    return {
      id,
      fileName: originalName,
      fileExtension: ext,
      fileSize: file.size,
      mimeType,
    };
  }

  /**
   * Удалить файл по пути (относительному)
   * @param {string} filePath - относительный путь (например /uploads/xxx.jpg)
   * @returns {Promise<boolean>}
   */
  static async deleteFile(filePath) {
    try {
      const uploadsDir = this.getUploadsDir();
      const absolutePath = path.join(uploadsDir, path.basename(filePath));
      await fsPromises.unlink(absolutePath);
      return true;
    } catch (err) {
      console.error('Ошибка при удалении файла:', err);
      return false;
    }
  }

  /**
   * Удалить файл по ID метаданных
   * @param {string} fileId - ID файла из метаданных
   * @returns {Promise<boolean>}
   */
  static async deleteFileById(fileId) {
    try {
      const fileData = await this.getFileById(fileId);
      if (!fileData) {
        console.warn(`Файл с ID ${fileId} не найден`);
        return false;
      }
      await fsPromises.unlink(fileData.filePath);
      return true;
    } catch (err) {
      console.error(`Ошибка при удалении файла с ID ${fileId}:`, err);
      return false;
    }
  }
  
  /**
   * Получить файл по ID метаданных
   * @param {string} fileId - ID файла из метаданных
   * @returns {Object|null} объект файла или null, если не найден
   */
  static async getFileById(fileId) {
    const uploadsDir = this.getUploadsDir();
    try {
      // Ищем файл в папке uploads по ID
      const files = await fsPromises.readdir(uploadsDir);
      
      // Ищем файл, имя которого без расширения равно fileId
      const matchingFile = files.find(file => {
        const fileNameWithoutExt = path.parse(file).name;
        return fileNameWithoutExt === fileId;
      });
      
      if (!matchingFile) {
        return null;
      }
      
      const filePath = path.join(uploadsDir, matchingFile);
      return {
        filePath,
        fileName: matchingFile
      };
    } catch (error) {
      console.error('Ошибка при чтении папки uploads:', error);
      return null;
    }
  }
  
  /**
   * Создать ZIP-архив с файлами вложений сообщения
   * @param {Array} metadataList - массив метаданных файлов
   * @returns {Buffer} буфер с ZIP-архивом
   */
  static async createAttachmentsZip(metadataList) {
    const zip = new JSZip();
    
    if (metadataList && Array.isArray(metadataList)) {
      for (const metadata of metadataList) {
        if (metadata.id) {
          const fileData = await this.getFileById(metadata.id);
          if (fileData) {
            const fileContent = await fsPromises.readFile(fileData.filePath);
            zip.file(metadata.fileName || `file_${metadata.id}`, fileContent);
          }
        }
      }
    }
    
    return await zip.generateAsync({type: 'nodebuffer'});
  }
}