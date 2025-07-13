/**
 * Analysis Routes
 */

import { Router } from 'express';
import { io } from '../index.js';
import { logger } from '../utils/logger.js';
import { AnalysisService } from '../services/analysis-service.js';

const router = Router();
const analysisService = new AnalysisService();

/**
 * POST /api/v1/analysis
 * DNS分析の開始
 */
router.post('/', async (req, res) => {
  try {
    const { fileId, format, options } = req.body;

    if (!fileId || !format) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'fileId and format are required'
      });
    }

    // 分析ジョブを開始
    const analysisId = await analysisService.startAnalysis({
      fileId,
      format,
      options: options || {},
      onProgress: (progress) => {
        // WebSocket経由で進捗を送信
        io.to(`analysis:${analysisId}`).emit('analysis:progress', {
          analysisId,
          progress,
          timestamp: new Date().toISOString()
        });
      }
    });

    logger.info(`Analysis started: ${analysisId} for file ${fileId}`);

    res.json({
      success: true,
      analysisId,
      message: 'Analysis started successfully',
      estimatedDuration: '1-5 minutes'
    });

  } catch (error) {
    logger.error('Analysis start error:', error);
    res.status(500).json({
      error: 'Failed to start analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/analysis/:id
 * 分析結果の取得
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await analysisService.getAnalysisResult(id);
    
    if (!result) {
      return res.status(404).json({
        error: 'Analysis not found',
        message: `Analysis with ID ${id} was not found`
      });
    }

    res.json({
      success: true,
      analysis: result
    });

  } catch (error) {
    logger.error('Analysis result retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve analysis result',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/analysis/:id/status
 * 分析ステータスの取得
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const status = await analysisService.getAnalysisStatus(id);
    
    if (!status) {
      return res.status(404).json({
        error: 'Analysis not found',
        message: `Analysis with ID ${id} was not found`
      });
    }

    res.json({
      success: true,
      status
    });

  } catch (error) {
    logger.error('Analysis status retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve analysis status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v1/analysis/:id
 * 分析結果の削除
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await analysisService.deleteAnalysis(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Analysis not found',
        message: `Analysis with ID ${id} was not found`
      });
    }

    logger.info(`Analysis deleted: ${id}`);

    res.json({
      success: true,
      message: 'Analysis deleted successfully'
    });

  } catch (error) {
    logger.error('Analysis deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/analysis
 * 分析履歴の取得
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const history = await analysisService.getAnalysisHistory({
      page: Number(page),
      limit: Number(limit)
    });

    res.json({
      success: true,
      history
    });

  } catch (error) {
    logger.error('Analysis history retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve analysis history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as analysisRouter };