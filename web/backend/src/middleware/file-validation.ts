/**
 * File Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

export const validateFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next();
    }

    const file = req.file;
    
    // ファイルサイズチェック
    if (file.size > 100 * 1024 * 1024) { // 100MB
      await cleanupFile(file.path);
      return res.status(413).json({
        success: false,
        error: 'File too large',
        message: 'File size must be less than 100MB'
      });
    }

    // ファイル拡張子チェック
    const allowedExtensions = ['.csv', '.txt'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      await cleanupFile(file.path);
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: 'Only CSV files are allowed'
      });
    }

    // CSV形式の基本チェック
    const isValidCsv = await validateCsvFormat(file.path);
    if (!isValidCsv) {
      await cleanupFile(file.path);
      return res.status(400).json({
        success: false,
        error: 'Invalid CSV format',
        message: 'The uploaded file is not a valid CSV format'
      });
    }

    logger.info(`File validation passed: ${file.originalname}`);
    next();

  } catch (error) {
    logger.error('File validation error:', error);
    
    if (req.file) {
      await cleanupFile(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: 'File validation failed',
      message: 'An error occurred while validating the file'
    });
  }
};

async function validateCsvFormat(filePath: string): Promise<boolean> {
  try {
    // ファイルの最初の数行を読み取ってCSV形式をチェック
    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n').slice(0, 5); // 最初の5行をチェック
    
    if (lines.length === 0) {
      return false;
    }

    // ヘッダー行をチェック
    const header = lines[0];
    if (!header || header.trim().length === 0) {
      return false;
    }

    // カンマ区切りの基本チェック
    const commaCount = (header.match(/,/g) || []).length;
    if (commaCount === 0) {
      // セミコロン区切りもチェック
      const semicolonCount = (header.match(/;/g) || []).length;
      if (semicolonCount === 0) {
        return false;
      }
    }

    // 各行の列数が一貫しているかチェック
    const expectedColumns = header.split(/[,;]/).length;
    for (let i = 1; i < lines.length && i < 3; i++) {
      if (lines[i].trim().length === 0) continue;
      
      const columns = lines[i].split(/[,;]/).length;
      if (Math.abs(columns - expectedColumns) > 1) {
        // 1列程度の差は許容（空のフィールドなど）
        logger.warn(`CSV column count mismatch: expected ~${expectedColumns}, got ${columns}`);
      }
    }

    return true;
    
  } catch (error) {
    logger.error('CSV format validation error:', error);
    return false;
  }
}

async function cleanupFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Cleaned up invalid file: ${filePath}`);
    }
  } catch (error) {
    logger.error('File cleanup error:', error);
  }
}