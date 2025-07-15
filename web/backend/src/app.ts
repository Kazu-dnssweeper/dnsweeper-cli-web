import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { uploadRouter } from './routes/upload';
import dnsRouter from './routes/dns';
import { analysisRouter } from './routes/analysis';
import statsRouter from './routes/stats';
import { settingsRouter } from './routes/settings';
import { historyRouter } from './routes/history';
import { exportRouter } from './routes/export';
import authRouter from './routes/auth';
import reportsRouter from './routes/reports';
import aiOptimizationRouter from './routes/ai-optimization';
import aiAnalyticsRouter from './routes/ai-analytics';
import optimizationRouter from './routes/optimization';
import pricingStrategyRouter from './routes/pricing-strategy';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { configureCors, securityHeaders } from './middleware/auth';

export const createApp = async (): Promise<express.Application> => {
  const app = express();

  // セキュリティヘッダー
  app.use(securityHeaders);

  // セキュリティミドルウェア
  app.use(helmet({
    contentSecurityPolicy: false, // 開発時は無効化
    crossOriginEmbedderPolicy: false
  }));

  // CORS設定（アカウント別制御対応）
  app.use(configureCors);
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  }));

  // ボディパーサー
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ログミドルウェア
  app.use(requestLogger);

  // ヘルスチェック
  app.get('/api/health', (req: express.Request, res: express.Response) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    });
  });

  // API ルート
  app.use('/api/auth', authRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/dns', dnsRouter);
  app.use('/api/analysis', analysisRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/ai-optimization', aiOptimizationRouter);
  app.use('/api/ai-analytics', aiAnalyticsRouter);
  app.use('/api/optimization', optimizationRouter);
  app.use('/api/pricing', pricingStrategyRouter);

  // 404 ハンドラー
  app.use('*', (req: express.Request, res: express.Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      message: `Cannot ${req.method} ${req.originalUrl}`
    });
  });

  // エラーハンドリング
  app.use(errorHandler);

  return app;
};