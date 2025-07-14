/**
 * AI最適化API エンドポイント
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AIDNSOptimizer, OptimizationContext, BusinessContext } from '../../../src/lib/ai-dns-optimizer.js';
import { DNSResolver } from '../../../src/lib/dns-resolver.js';
import { Logger } from '../../../src/lib/logger.js';
import { globalPerformanceMonitor } from '../../../src/lib/performance-monitor.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const logger = new Logger({ verbose: false });
const aiOptimizer = new AIDNSOptimizer(logger);

// 入力検証ルール
const analyzeValidation = [
  body('domain')
    .isLength({ min: 1, max: 255 })
    .withMessage('ドメイン名は1-255文字で入力してください')
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*)*$/)
    .withMessage('有効なドメイン名を入力してください'),
  body('businessContext.industry')
    .isIn(['technology', 'finance', 'healthcare', 'retail', 'manufacturing', 'other'])
    .withMessage('有効な業界を選択してください'),
  body('businessContext.scale')
    .isIn(['startup', 'small', 'medium', 'enterprise'])
    .withMessage('有効な企業規模を選択してください'),
  body('businessContext.budget')
    .isIn(['low', 'medium', 'high'])
    .withMessage('有効な予算規模を選択してください')
];

/**
 * AI最適化分析の実行
 */
router.post('/analyze', authMiddleware, analyzeValidation, async (req, res) => {
  try {
    // 入力検証
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid input',
        details: errors.array()
      });
    }

    const { domain, businessContext, includeTraffic = false } = req.body;

    logger.info('AI最適化分析開始', {
      domain,
      userId: req.user?.id,
      businessContext: businessContext.industry
    });

    // 分析開始時刻
    const startTime = Date.now();

    // 最適化コンテキストの構築
    const context = await buildOptimizationContext(domain, businessContext, includeTraffic);

    // AI最適化分析の実行
    const measureAnalysis = globalPerformanceMonitor.startMeasurement('ai', 'optimization_analysis');
    
    try {
      const suggestions = await aiOptimizer.analyzeAndOptimize(context);
      
      measureAnalysis(true, {
        domain,
        suggestionsCount: suggestions.length,
        analysisTime: Date.now() - startTime
      });

      // 結果の集計
      const summary = {
        totalSuggestions: suggestions.length,
        criticalSuggestions: suggestions.filter(s => s.priority === 'critical').length,
        highPrioritySuggestions: suggestions.filter(s => s.priority === 'high').length,
        suggestionsByType: suggestions.reduce((acc, s) => {
          acc[s.type] = (acc[s.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        expectedImpact: suggestions.reduce((acc, s) => ({
          performance: acc.performance + s.impact.performance,
          security: acc.security + s.impact.security,
          reliability: acc.reliability + s.impact.reliability,
          cost: acc.cost + s.impact.cost
        }), { performance: 0, security: 0, reliability: 0, cost: 0 })
      };

      res.json({
        success: true,
        data: {
          suggestions,
          summary,
          analysisTime: Date.now() - startTime,
          context: {
            domain,
            recordCount: context.records.length,
            businessContext
          }
        }
      });

    } catch (error) {
      measureAnalysis(false, {
        domain,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

  } catch (error) {
    logger.error('AI最適化分析でエラーが発生しました:', error);
    res.status(500).json({
      error: 'AI optimization analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 提案の詳細取得
 */
router.get('/suggestions/:suggestionId', authMiddleware, [
  param('suggestionId').isLength({ min: 1 }).withMessage('提案IDが必要です')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid input',
        details: errors.array()
      });
    }

    const { suggestionId } = req.params;

    // 実際の実装では、データベースから提案詳細を取得
    // ここでは簡略化して成功レスポンスを返す
    res.json({
      success: true,
      data: {
        id: suggestionId,
        status: 'available',
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('提案詳細の取得でエラーが発生しました:', error);
    res.status(500).json({
      error: 'Failed to get suggestion details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 提案の実装
 */
router.post('/suggestions/:suggestionId/implement', authMiddleware, [
  param('suggestionId').isLength({ min: 1 }).withMessage('提案IDが必要です'),
  body('dryRun').optional().isBoolean().withMessage('dryRunはboolean値である必要があります')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid input',
        details: errors.array()
      });
    }

    const { suggestionId } = req.params;
    const { dryRun = false } = req.body;

    logger.info('提案実装開始', {
      suggestionId,
      userId: req.user?.id,
      dryRun
    });

    // 実装シミュレーション
    const implementationResult = await simulateImplementation(suggestionId, dryRun);

    res.json({
      success: true,
      data: {
        suggestionId,
        status: dryRun ? 'simulated' : 'implemented',
        result: implementationResult,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('提案実装でエラーが発生しました:', error);
    res.status(500).json({
      error: 'Failed to implement suggestion',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 最適化履歴の取得
 */
router.get('/history', authMiddleware, [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('制限は1-100の範囲で指定してください'),
  query('offset').optional().isInt({ min: 0 }).withMessage('オフセットは0以上である必要があります')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid input',
        details: errors.array()
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // 実際の実装では、データベースから履歴を取得
    const history = await getOptimizationHistory(req.user?.id, limit, offset);

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          limit,
          offset,
          total: history.length // 実際は総数を取得
        }
      }
    });

  } catch (error) {
    logger.error('最適化履歴の取得でエラーが発生しました:', error);
    res.status(500).json({
      error: 'Failed to get optimization history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 最適化統計の取得
 */
router.get('/statistics', authMiddleware, [
  query('timeRange').optional().isIn(['day', 'week', 'month', 'year']).withMessage('有効な時間範囲を指定してください')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid input',
        details: errors.array()
      });
    }

    const timeRange = req.query.timeRange as string || 'month';

    // 統計データの生成
    const statistics = await generateOptimizationStatistics(req.user?.id, timeRange);

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logger.error('最適化統計の取得でエラーが発生しました:', error);
    res.status(500).json({
      error: 'Failed to get optimization statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 最適化レポートのエクスポート
 */
router.post('/export', authMiddleware, [
  body('format').isIn(['pdf', 'excel', 'json']).withMessage('有効な形式を選択してください'),
  body('suggestionIds').isArray().withMessage('提案IDの配列が必要です'),
  body('includeEvidence').optional().isBoolean().withMessage('証拠の含有はboolean値である必要があります')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid input',
        details: errors.array()
      });
    }

    const { format, suggestionIds, includeEvidence = false } = req.body;

    logger.info('最適化レポートエクスポート開始', {
      format,
      suggestionCount: suggestionIds.length,
      userId: req.user?.id
    });

    // レポート生成
    const report = await generateOptimizationReport(suggestionIds, format, includeEvidence);

    res.json({
      success: true,
      data: {
        reportId: report.id,
        downloadUrl: report.downloadUrl,
        expiresAt: report.expiresAt
      }
    });

  } catch (error) {
    logger.error('最適化レポートエクスポートでエラーが発生しました:', error);
    res.status(500).json({
      error: 'Failed to export optimization report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * 最適化コンテキストの構築
 */
async function buildOptimizationContext(
  domain: string,
  businessContext: BusinessContext,
  includeTraffic: boolean
): Promise<OptimizationContext> {
  // DNS レコードの取得
  const resolver = new DNSResolver(logger);
  const records = await resolver.resolveAllRecords(domain);

  // パフォーマンスメトリクスの取得
  const performance = globalPerformanceMonitor.getMetrics().filter(m => 
    m.metadata?.domain === domain || m.metadata?.domain?.endsWith(domain)
  );

  // トラフィックパターンの取得（オプション）
  const trafficPatterns = includeTraffic 
    ? await getTrafficPatterns(domain)
    : [];

  return {
    domain,
    records,
    performance,
    trafficPatterns,
    businessContext
  };
}

/**
 * トラフィックパターンの取得
 */
async function getTrafficPatterns(domain: string) {
  // 実際の実装では、監視システムやログからトラフィックパターンを取得
  // ここでは簡略化してサンプルデータを返す
  return [
    {
      timestamp: Date.now(),
      region: 'us-east-1',
      requests: 1000,
      latency: 150,
      errorRate: 0.1
    },
    {
      timestamp: Date.now(),
      region: 'eu-west-1',
      requests: 800,
      latency: 200,
      errorRate: 0.2
    }
  ];
}

/**
 * 実装シミュレーション
 */
async function simulateImplementation(suggestionId: string, dryRun: boolean) {
  // 実際の実装では、提案の内容に応じて実際のDNS変更を行う
  // ここでは簡略化してシミュレーション結果を返す
  return {
    changes: [
      {
        record: 'example.com',
        field: 'TTL',
        oldValue: '300',
        newValue: '3600'
      }
    ],
    estimatedImpact: {
      performance: 5,
      security: 0,
      reliability: 2,
      cost: 1
    },
    rollbackInstructions: [
      'TTL を 300 に戻す',
      '24時間監視を継続する'
    ]
  };
}

/**
 * 最適化履歴の取得
 */
async function getOptimizationHistory(userId: string | undefined, limit: number, offset: number) {
  // 実際の実装では、データベースから履歴を取得
  return [
    {
      id: 'analysis-1',
      domain: 'example.com',
      timestamp: new Date().toISOString(),
      suggestionsCount: 5,
      implementedCount: 2,
      status: 'completed'
    }
  ];
}

/**
 * 最適化統計の生成
 */
async function generateOptimizationStatistics(userId: string | undefined, timeRange: string) {
  // 実際の実装では、データベースから統計データを生成
  return {
    totalAnalyses: 10,
    totalSuggestions: 50,
    implementedSuggestions: 25,
    averageImpact: {
      performance: 6.5,
      security: 4.2,
      reliability: 5.8,
      cost: 2.1
    },
    topSuggestionTypes: [
      { type: 'performance', count: 20 },
      { type: 'security', count: 15 },
      { type: 'reliability', count: 10 },
      { type: 'cost', count: 5 }
    ]
  };
}

/**
 * 最適化レポートの生成
 */
async function generateOptimizationReport(suggestionIds: string[], format: string, includeEvidence: boolean) {
  // 実際の実装では、レポートファイルを生成してストレージに保存
  return {
    id: 'report-' + Date.now(),
    downloadUrl: `/api/downloads/optimization-report-${Date.now()}.${format}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

export default router;