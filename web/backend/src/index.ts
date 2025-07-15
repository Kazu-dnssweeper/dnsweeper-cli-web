/**
 * DNSweeper Web API Backend
 * Express.js server with TypeScript
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { apiRouter } from './routes/index';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { logger } from './utils/logger';
import { SocketServer } from './websocket/socket-server';

// 環境変数の読み込み
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// WebSocket サーバーの初期化
const socketServer = SocketServer.getInstance(server);

// セキュリティミドルウェア
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Socket.IO用
}));

// CORS設定
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// ボディパーサー
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// リクエストログ
app.use(requestLogger);

// WebSocket設定は SocketServer クラスで管理

// APIルート
app.use('/api', apiRouter);

// ヘルスチェック
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404ハンドラー
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl
  });
});

// エラーハンドリング
app.use(errorHandler);

// サーバー起動
server.listen(PORT, () => {
  logger.info(`🚀 DNSweeper API Server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔌 WebSocket server enabled`);
  
  if (process.env.NODE_ENV === 'development') {
    logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('🛑 Shutting down server...');
  server.close(() => {
    logger.info('✅ Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export { app, server, socketServer };