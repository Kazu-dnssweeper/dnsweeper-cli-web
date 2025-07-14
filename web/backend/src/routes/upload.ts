/**
 * File Upload Routes
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { validateFile } from '../middleware/file-validation.js';
import { SocketServer } from '../websocket/socket-server.js';

const router = Router();

// アップロードディレクトリの作成
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.originalname.endsWith('.csv') ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * POST /api/v1/upload
 * CSVファイルのアップロード
 */
router.post('/', upload.single('file'), validateFile, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select a CSV file to upload'
      });
    }

    const fileInfo = {
      id: path.parse(req.file.filename).name,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    logger.info(`File uploaded successfully: ${fileInfo.originalName} (${fileInfo.size} bytes)`);

    // WebSocket経由でアップロード完了を通知
    const socketServer = SocketServer.getInstance();
    socketServer.broadcast({
      type: 'upload_progress',
      payload: {
        fileId: fileInfo.id,
        progress: 100,
        message: `アップロード完了: ${fileInfo.originalName}`
      }
    });

    res.json({
      success: true,
      data: fileInfo,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/upload/:id
 * アップロードファイル情報の取得
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // ファイル情報を取得（実際の実装では、データベースから取得）
    // 現在は簡単な例として、ファイルシステムを確認
    const files = fs.readdirSync(uploadDir);
    const targetFile = files.find(file => file.startsWith(id));
    
    if (!targetFile) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `File with ID ${id} not found`
      });
    }
    
    const filePath = path.join(uploadDir, targetFile);
    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      data: {
        id,
        filename: targetFile,
        size: stats.size,
        uploadedAt: stats.mtime.toISOString(),
        status: 'uploaded'
      }
    });

  } catch (error) {
    logger.error('File info retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file info',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/upload/:id/status
 * アップロードファイルの状態取得
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: 実際のデータベースまたはキャッシュからステータスを取得
    res.json({
      success: true,
      data: {
        status: 'idle',
        progress: 0,
        message: 'Ready for analysis'
      }
    });

  } catch (error) {
    logger.error('File status retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve file status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as uploadRouter };