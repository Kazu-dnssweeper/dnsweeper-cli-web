/**
 * DNSweeper マーケットプレイス統合 APIルート
 * AWS/Azure/GCP マーケットプレイス統合エンドポイント
 */

import express from 'express';
import { marketplaceIntegrationService } from '../services/marketplace-integration-service';
import { MarketplaceProvider } from '../types/marketplace-integration';

const router = express.Router();

// ===== 製品管理 =====

/**
 * GET /marketplace/products
 * 登録済みマーケットプレイス製品一覧取得
 */
router.get('/products', async (req, res) => {
  try {
    const { provider, status } = req.query;
    
    // フィルタリング条件に基づいて製品を取得
    const products = await marketplaceIntegrationService.getProducts({
      provider: provider as MarketplaceProvider,
      status: status as string
    });

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCTS_FETCH_ERROR',
        message: '製品一覧の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /marketplace/products
 * 新しいマーケットプレイス製品の登録
 */
router.post('/products', async (req, res) => {
  try {
    const { provider, productData } = req.body;

    if (!provider || !productData) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'プロバイダーと製品データが必要です'
        }
      });
    }

    const product = await marketplaceIntegrationService.registerMarketplaceProduct(
      provider,
      productData
    );

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_REGISTRATION_ERROR',
        message: '製品登録に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /marketplace/products/:productId
 * 特定の製品詳細取得
 */
router.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await marketplaceIntegrationService.getProduct(productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: '指定された製品が見つかりません'
        }
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_FETCH_ERROR',
        message: '製品詳細の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== デプロイメント =====

/**
 * POST /marketplace/deploy
 * ワンクリックデプロイメントの開始
 */
router.post('/deploy', async (req, res) => {
  try {
    const {
      productId,
      deploymentOptionId,
      customerId,
      customerInfo,
      configuration
    } = req.body;

    if (!productId || !deploymentOptionId || !customerId || !customerInfo) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '必須パラメータが不足しています'
        }
      });
    }

    const deploymentSession = await marketplaceIntegrationService.executeOneClickDeployment(
      productId,
      deploymentOptionId,
      customerId,
      customerInfo,
      configuration || {}
    );

    res.status(202).json({
      success: true,
      data: deploymentSession
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DEPLOYMENT_ERROR',
        message: 'デプロイメントの開始に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /marketplace/deployments/:deploymentId
 * デプロイメント状況取得
 */
router.get('/deployments/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    
    const deployment = await marketplaceIntegrationService.getDeploymentStatus(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEPLOYMENT_NOT_FOUND',
          message: '指定されたデプロイメントが見つかりません'
        }
      });
    }

    res.json({
      success: true,
      data: deployment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DEPLOYMENT_STATUS_ERROR',
        message: 'デプロイメント状況の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * DELETE /marketplace/deployments/:deploymentId
 * デプロイメントのキャンセル・削除
 */
router.delete('/deployments/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    
    await marketplaceIntegrationService.cancelDeployment(deploymentId);

    res.json({
      success: true,
      message: 'デプロイメントをキャンセルしました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DEPLOYMENT_CANCEL_ERROR',
        message: 'デプロイメントのキャンセルに失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== 課金統合 =====

/**
 * POST /marketplace/billing/usage
 * 使用量レポート送信
 */
router.post('/billing/usage', async (req, res) => {
  try {
    const { customerId, productId, usageRecords } = req.body;

    if (!customerId || !productId || !usageRecords) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '顧客ID、製品ID、使用量記録が必要です'
        }
      });
    }

    const usageReport = await marketplaceIntegrationService.submitUsageReport(
      customerId,
      productId,
      usageRecords
    );

    res.json({
      success: true,
      data: usageReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'USAGE_REPORT_ERROR',
        message: '使用量レポートの送信に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /marketplace/billing/track
 * リアルタイム使用量追跡
 */
router.post('/billing/track', async (req, res) => {
  try {
    const { customerId, dimension, quantity, metadata } = req.body;

    if (!customerId || !dimension || typeof quantity !== 'number') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '顧客ID、ディメンション、量が必要です'
        }
      });
    }

    await marketplaceIntegrationService.trackUsage(
      customerId,
      dimension,
      quantity,
      metadata || {}
    );

    res.json({
      success: true,
      message: '使用量を記録しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'USAGE_TRACKING_ERROR',
        message: '使用量の追跡に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /marketplace/billing/reports
 * 課金レポート取得
 */
router.get('/billing/reports', async (req, res) => {
  try {
    const { customerId, startDate, endDate, provider } = req.query;
    
    const reports = await marketplaceIntegrationService.getBillingReports({
      customerId: customerId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      provider: provider as MarketplaceProvider
    });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'BILLING_REPORTS_ERROR',
        message: '課金レポートの取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== 認定・承認 =====

/**
 * GET /marketplace/certifications
 * 認定状況取得
 */
router.get('/certifications', async (req, res) => {
  try {
    const { provider } = req.query;
    
    const certifications = await marketplaceIntegrationService.getCertifications(
      provider as MarketplaceProvider
    );

    res.json({
      success: true,
      data: certifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CERTIFICATIONS_ERROR',
        message: '認定情報の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /marketplace/certifications/:provider/test
 * 認定テスト実行
 */
router.post('/certifications/:provider/test', async (req, res) => {
  try {
    const { provider } = req.params;
    const { testCategory } = req.body;

    const testResults = await marketplaceIntegrationService.runCertificationTest(
      provider as MarketplaceProvider,
      testCategory
    );

    res.json({
      success: true,
      data: testResults
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CERTIFICATION_TEST_ERROR',
        message: '認定テストの実行に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== 分析・メトリクス =====

/**
 * GET /marketplace/metrics
 * マーケットプレイスメトリクス取得
 */
router.get('/metrics', async (req, res) => {
  try {
    const { startDate, endDate, provider, granularity } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '開始日と終了日が必要です'
        }
      });
    }

    const metrics = await marketplaceIntegrationService.getMarketplaceMetrics(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'メトリクスの取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /marketplace/analytics/performance
 * パフォーマンス分析取得
 */
router.get('/analytics/performance', async (req, res) => {
  try {
    const { provider, timeRange } = req.query;
    
    const analytics = await marketplaceIntegrationService.getPerformanceAnalytics({
      provider: provider as MarketplaceProvider,
      timeRange: timeRange as string
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'パフォーマンス分析の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== Webhook エンドポイント =====

/**
 * POST /marketplace/webhooks/aws
 * AWS Marketplace Webhook
 */
router.post('/webhooks/aws', async (req, res) => {
  try {
    const webhookData = req.body;
    
    await marketplaceIntegrationService.handleMarketplaceWebhook('aws', webhookData);

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Webhookの処理に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /marketplace/webhooks/azure
 * Azure Marketplace Webhook
 */
router.post('/webhooks/azure', async (req, res) => {
  try {
    const webhookData = req.body;
    
    await marketplaceIntegrationService.handleMarketplaceWebhook('azure', webhookData);

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Webhookの処理に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /marketplace/webhooks/gcp
 * GCP Marketplace Webhook
 */
router.post('/webhooks/gcp', async (req, res) => {
  try {
    const webhookData = req.body;
    
    await marketplaceIntegrationService.handleMarketplaceWebhook('gcp', webhookData);

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Webhookの処理に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== ワンクリックデプロイテンプレート =====

/**
 * GET /marketplace/templates/:provider/:productId
 * デプロイメントテンプレート取得
 */
router.get('/templates/:provider/:productId', async (req, res) => {
  try {
    const { provider, productId } = req.params;
    const { format } = req.query;

    const template = await marketplaceIntegrationService.getDeploymentTemplate(
      provider as MarketplaceProvider,
      productId,
      format as string
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: '指定されたテンプレートが見つかりません'
        }
      });
    }

    // テンプレートの形式に応じて適切なContent-Typeを設定
    const contentType = format === 'json' ? 'application/json' : 'text/yaml';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="dnsweeper-${provider}-template.${format}"`);
    
    res.send(template);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATE_ERROR',
        message: 'テンプレートの取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

export default router;