/**
 * API Routes
 */

import { Router } from 'express';
import { uploadRouter } from './upload.js';
import { analysisRouter } from './analysis.js';
import { settingsRouter } from './settings.js';

const router = Router();

// API バージョニング
router.use('/v1/upload', uploadRouter);
router.use('/v1/analysis', analysisRouter);
router.use('/v1/settings', settingsRouter);

// API情報
router.get('/', (req, res) => {
  res.json({
    name: 'DNSweeper API',
    version: '1.0.0',
    description: 'DNS record analysis and cleanup API',
    endpoints: {
      upload: '/api/v1/upload',
      analysis: '/api/v1/analysis',
      settings: '/api/v1/settings'
    },
    documentation: 'https://github.com/[username]/dnsweeper#api'
  });
});

export { router as apiRouter };