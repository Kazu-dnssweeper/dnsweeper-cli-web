/**
 * Request Logging Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // リクエスト情報をログ
  logger.info(`➤ ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type')
  });

  // レスポンス完了時のログ
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    const logLevel = statusCode >= 400 ? 'warn' : 'info';
    const statusEmoji = getStatusEmoji(statusCode);
    
    logger[logLevel](`${statusEmoji} ${req.method} ${req.originalUrl} ${statusCode} - ${duration}ms`, {
      statusCode,
      duration,
      contentLength: res.get('Content-Length'),
      ip: req.ip
    });
  });

  next();
};

function getStatusEmoji(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return '✅';
  if (statusCode >= 300 && statusCode < 400) return '↪️';
  if (statusCode >= 400 && statusCode < 500) return '⚠️';
  if (statusCode >= 500) return '❌';
  return '📄';
}