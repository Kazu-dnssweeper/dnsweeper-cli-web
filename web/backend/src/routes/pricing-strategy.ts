/**
 * DNSweeper 価格戦略最適化API
 * 地域別価格設定・購買力平価調整・競合分析
 */

import { Router, Request, Response } from 'express';
import { pricingStrategyService } from '../services/pricing-strategy-service';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/request-validator';
import { logger } from '../utils/logger';

const router = Router();

// ===== 価格戦略取得 =====

/**
 * すべての価格戦略を取得
 * GET /api/pricing/strategies
 */
router.get('/strategies', async (_req: Request, res: Response) => {
  try {
    const strategies = pricingStrategyService.getAllPricingStrategies();
    res.json({
      success: true,
      data: strategies,
      count: strategies.length
    });
  } catch (error) {
    logger.error('価格戦略取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '価格戦略の取得に失敗しました'
    });
  }
});

/**
 * 特定の価格戦略を取得
 * GET /api/pricing/strategies/:id
 */
router.get('/strategies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const strategy = pricingStrategyService.getPricingStrategy(id);
    
    if (!strategy) {
      return res.status(404).json({
        success: false,
        error: '価格戦略が見つかりません'
      });
    }

    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    logger.error('価格戦略取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '価格戦略の取得に失敗しました'
    });
  }
});

// ===== 地域別価格設定 =====

/**
 * すべての地域別価格設定を取得
 * GET /api/pricing/regions
 */
router.get('/regions', async (_req: Request, res: Response) => {
  try {
    const regions = pricingStrategyService.getAllRegionalPricing();
    res.json({
      success: true,
      data: regions,
      count: regions.length
    });
  } catch (error) {
    logger.error('地域別価格取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '地域別価格の取得に失敗しました'
    });
  }
});

/**
 * 特定地域の価格設定を取得
 * GET /api/pricing/regions/:region
 */
router.get('/regions/:region', async (req: Request, res: Response) => {
  try {
    const { region } = req.params;
    const regionalPricing = pricingStrategyService.getRegionalPricing(region);
    
    if (!regionalPricing) {
      return res.status(404).json({
        success: false,
        error: '地域価格設定が見つかりません'
      });
    }

    res.json({
      success: true,
      data: regionalPricing
    });
  } catch (error) {
    logger.error('地域別価格取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '地域別価格の取得に失敗しました'
    });
  }
});

/**
 * 地域別価格を計算
 * POST /api/pricing/calculate-regional
 */
router.post('/calculate-regional', validateRequest({
  body: {
    basePriceUSD: { type: 'number', required: true },
    targetRegion: { type: 'string', required: true },
    tier: { type: 'string', required: true }
  }
}), async (req: Request, res: Response) => {
  try {
    const { basePriceUSD, targetRegion, tier } = req.body;
    
    const regionalPrice = pricingStrategyService.calculateRegionalPrice(
      basePriceUSD,
      targetRegion,
      tier
    );

    res.json({
      success: true,
      data: regionalPrice
    });
  } catch (error) {
    logger.error('地域別価格計算エラー:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '地域別価格の計算に失敗しました'
    });
  }
});

// ===== 競合分析 =====

/**
 * すべての競合価格分析を取得
 * GET /api/pricing/competitors
 */
router.get('/competitors', async (_req: Request, res: Response) => {
  try {
    const competitors = pricingStrategyService.getAllCompetitivePricing();
    res.json({
      success: true,
      data: competitors,
      count: competitors.length
    });
  } catch (error) {
    logger.error('競合価格取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '競合価格の取得に失敗しました'
    });
  }
});

/**
 * 特定競合の価格分析を取得
 * GET /api/pricing/competitors/:name
 */
router.get('/competitors/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const competitorPricing = pricingStrategyService.getCompetitivePricing(name);
    
    if (!competitorPricing) {
      return res.status(404).json({
        success: false,
        error: '競合価格分析が見つかりません'
      });
    }

    res.json({
      success: true,
      data: competitorPricing
    });
  } catch (error) {
    logger.error('競合価格取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '競合価格の取得に失敗しました'
    });
  }
});

// ===== バンドルパッケージ =====

/**
 * すべてのバンドルパッケージを取得
 * GET /api/pricing/bundles
 */
router.get('/bundles', async (_req: Request, res: Response) => {
  try {
    const bundles = pricingStrategyService.getAllBundlePackages();
    res.json({
      success: true,
      data: bundles,
      count: bundles.length
    });
  } catch (error) {
    logger.error('バンドルパッケージ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'バンドルパッケージの取得に失敗しました'
    });
  }
});

/**
 * 特定のバンドルパッケージを取得
 * GET /api/pricing/bundles/:id
 */
router.get('/bundles/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bundle = pricingStrategyService.getBundlePackage(id);
    
    if (!bundle) {
      return res.status(404).json({
        success: false,
        error: 'バンドルパッケージが見つかりません'
      });
    }

    res.json({
      success: true,
      data: bundle
    });
  } catch (error) {
    logger.error('バンドルパッケージ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'バンドルパッケージの取得に失敗しました'
    });
  }
});

// ===== 動的価格調整 =====

/**
 * 動的価格調整を実行
 * POST /api/pricing/dynamic
 */
router.post('/dynamic', authenticateToken, validateRequest({
  body: {
    region: { type: 'string', required: true },
    tier: { type: 'string', required: true },
    demandMetrics: {
      type: 'object',
      required: true,
      properties: {
        currentDemand: { type: 'number', required: true },
        historicalDemand: { type: 'array', required: true },
        seasonality: { type: 'number', required: true },
        competitorActivity: { type: 'number', required: true }
      }
    }
  }
}), async (req: Request, res: Response) => {
  try {
    const { region, tier, demandMetrics } = req.body;
    
    const dynamicPricing = await pricingStrategyService.executeDynamicPricing(
      region,
      tier,
      demandMetrics
    );

    res.json({
      success: true,
      data: dynamicPricing
    });
  } catch (error) {
    logger.error('動的価格調整エラー:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '動的価格調整に失敗しました'
    });
  }
});

// ===== 価格最適化 =====

/**
 * 価格戦略の最適化提案を取得
 * POST /api/pricing/optimize
 */
router.post('/optimize', authenticateToken, validateRequest({
  body: {
    currentPerformance: {
      type: 'object',
      required: true,
      properties: {
        conversionRate: { type: 'number', required: true },
        churnRate: { type: 'number', required: true },
        customerSatisfaction: { type: 'number', required: true },
        competitivePosition: { type: 'number', required: true }
      }
    }
  }
}), async (req: Request, res: Response) => {
  try {
    const { currentPerformance } = req.body;
    
    const optimizations = pricingStrategyService.optimizePricingStrategy(currentPerformance);

    res.json({
      success: true,
      data: optimizations,
      count: optimizations.length
    });
  } catch (error) {
    logger.error('価格最適化エラー:', error);
    res.status(500).json({
      success: false,
      error: '価格最適化の計算に失敗しました'
    });
  }
});

// ===== 価格分析 =====

/**
 * 価格分析データを取得
 * GET /api/pricing/analytics
 */
router.get('/analytics', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const analytics = pricingStrategyService.getPricingAnalytics();
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('価格分析取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '価格分析データの取得に失敗しました'
    });
  }
});

// ===== ヘルスチェック =====

/**
 * APIヘルスチェック
 * GET /api/pricing/health
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'pricing-strategy',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

export default router;