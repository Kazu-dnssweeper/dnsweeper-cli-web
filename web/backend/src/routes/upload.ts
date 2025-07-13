/**
 * File Upload Routes
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { validateFile } from '../middleware/file-validation.js';

const router = Router();

// Multer設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
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

    res.json({
      success: true,
      file: fileInfo,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({
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
    
    res.json({
      success: true,
      file: {
        id,
        status: 'uploaded'
      }
    });

  } catch (error) {
    logger.error('File info retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve file info',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as uploadRouter };