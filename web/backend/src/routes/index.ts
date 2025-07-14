/**
 * API Routes
 */

import { Router } from 'express';
import { uploadRouter } from './upload.js';
import { analyzeRouter } from './analyze.js';
import { settingsRouter } from './settings.js';
import authRouter from './auth.js';

const router = Router();

// API バージョニング
router.use('/v1/auth', authRouter);
router.use('/v1/upload', uploadRouter);
router.use('/v1/analyze', analyzeRouter);
router.use('/v1/settings', settingsRouter);

// API情報
router.get('/', (req, res) => {
  res.json({
    name: 'DNSweeper API',
    version: '1.0.0',
    description: 'DNS record analysis and cleanup API',
    endpoints: {
      auth: '/api/v1/auth',
      upload: '/api/v1/upload',
      analyze: '/api/v1/analyze',
      settings: '/api/v1/settings'
    },
    documentation: 'https://github.com/[username]/dnsweeper#api'
  });
});

export { router as apiRouter };