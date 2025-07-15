/**
 * DNSweeper パートナーAPI ルート
 * サードパーティ統合・認証・統合管理・Webhook・SDK・分析エンドポイント
 */

import express from 'express';
import { partnerApiService } from '../services/partner-api-service';
import { PartnerType, AuthMethod } from '../types/partner-api';

const router = express.Router();

// ===== パートナー登録・管理 =====

/**
 * POST /partners/register
 * 新しいパートナーの登録申請
 */
router.post('/register', async (req, res) => {
  try {
    const partnerData = req.body;

    if (!partnerData.name || !partnerData.type || !partnerData.companyName || !partnerData.contactEmail) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '必須フィールドが不足しています',
          required: ['name', 'type', 'companyName', 'contactEmail']
        }
      });
    }

    const partner = await partnerApiService.registerPartner(partnerData);

    res.status(201).json({
      success: true,
      data: {
        partnerId: partner.id,
        status: partner.status,
        message: '登録申請を受け付けました。承認をお待ちください。'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'REGISTRATION_ERROR',
        message: 'パートナー登録に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /partners
 * パートナー一覧取得（管理者用）
 */
router.get('/', async (req, res) => {
  try {
    const { status, type, limit = 50, offset = 0 } = req.query;
    
    const partners = await partnerApiService.getPartners({
      status: status as string,
      type: type as PartnerType,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });

    res.json({
      success: true,
      data: partners,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: partners.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PARTNERS_FETCH_ERROR',
        message: 'パートナー一覧の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /partners/:partnerId
 * 特定パートナーの詳細取得
 */
router.get('/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;
    
    const partner = await partnerApiService.getPartner(partnerId);
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PARTNER_NOT_FOUND',
          message: '指定されたパートナーが見つかりません'
        }
      });
    }

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PARTNER_FETCH_ERROR',
        message: 'パートナー詳細の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /partners/:partnerId/approve
 * パートナーの承認（管理者用）
 */
router.post('/:partnerId/approve', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { tierLevel, approvedBy } = req.body;

    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '承認者情報が必要です'
        }
      });
    }

    const partner = await partnerApiService.approvePartner(
      partnerId,
      approvedBy,
      tierLevel
    );

    res.json({
      success: true,
      data: partner,
      message: 'パートナーを承認しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'APPROVAL_ERROR',
        message: 'パートナー承認に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== 認証・認可 =====

/**
 * POST /partners/:partnerId/credentials
 * API認証情報の生成
 */
router.post('/:partnerId/credentials', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { authMethod = 'api_key' } = req.body;

    const credentials = await partnerApiService.generateApiCredentials(
      partnerId,
      authMethod as AuthMethod
    );

    res.json({
      success: true,
      data: {
        apiKey: credentials.apiKey,
        secretKey: credentials.secretKey,
        authMethod: credentials.authMethod,
        scopes: credentials.scopes,
        expiresAt: credentials.expiresAt
      },
      message: 'API認証情報を生成しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CREDENTIALS_ERROR',
        message: 'API認証情報の生成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /partners/authenticate
 * APIリクエストの認証
 */
router.post('/authenticate', async (req, res) => {
  try {
    const { apiKey, endpoint, method } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || '';

    if (!apiKey || !endpoint || !method) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'APIキー、エンドポイント、メソッドが必要です'
        }
      });
    }

    const authResult = await partnerApiService.authenticateRequest(
      apiKey,
      endpoint,
      method,
      clientIp
    );

    res.json({
      success: true,
      data: {
        partnerId: authResult.partner.id,
        partnerName: authResult.partner.name,
        allowed: authResult.allowed,
        rateLimitInfo: authResult.rateLimitInfo
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: error instanceof Error ? error.message : '認証に失敗しました'
      }
    });
  }
});

// ===== 統合管理 =====

/**
 * GET /partners/:partnerId/integrations
 * パートナーの統合一覧取得
 */
router.get('/:partnerId/integrations', async (req, res) => {
  try {
    const { partnerId } = req.params;
    
    const integrations = await partnerApiService.getPartnerIntegrations(partnerId);

    res.json({
      success: true,
      data: integrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTEGRATIONS_FETCH_ERROR',
        message: '統合一覧の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /partners/:partnerId/integrations
 * 新しい統合の作成
 */
router.post('/:partnerId/integrations', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const integrationData = req.body;

    if (!integrationData.name || !integrationData.type || !integrationData.configuration) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '統合名、タイプ、設定が必要です'
        }
      });
    }

    const integration = await partnerApiService.createIntegration(
      partnerId,
      integrationData
    );

    res.status(201).json({
      success: true,
      data: integration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTEGRATION_CREATE_ERROR',
        message: '統合の作成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /partners/:partnerId/integrations/:integrationId/test
 * 統合テストの実行
 */
router.post('/:partnerId/integrations/:integrationId/test', async (req, res) => {
  try {
    const { partnerId, integrationId } = req.params;
    
    const testResult = await partnerApiService.testIntegration(integrationId);

    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTEGRATION_TEST_ERROR',
        message: '統合テストに失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== Webhook管理 =====

/**
 * GET /partners/:partnerId/webhooks
 * パートナーのWebhook一覧取得
 */
router.get('/:partnerId/webhooks', async (req, res) => {
  try {
    const { partnerId } = req.params;
    
    const webhooks = await partnerApiService.getPartnerWebhooks(partnerId);

    res.json({
      success: true,
      data: webhooks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOKS_FETCH_ERROR',
        message: 'Webhook一覧の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /partners/:partnerId/webhooks
 * 新しいWebhookの作成
 */
router.post('/:partnerId/webhooks', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const webhookData = req.body;

    if (!webhookData.url || !webhookData.events || !Array.isArray(webhookData.events)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'WebhookのURLとイベント一覧が必要です'
        }
      });
    }

    const webhook = await partnerApiService.createWebhook(
      partnerId,
      webhookData
    );

    res.status(201).json({
      success: true,
      data: webhook
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_CREATE_ERROR',
        message: 'Webhookの作成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /partners/:partnerId/webhooks/:webhookId/test
 * Webhookテストの実行
 */
router.post('/:partnerId/webhooks/:webhookId/test', async (req, res) => {
  try {
    const { partnerId, webhookId } = req.params;
    const { testData } = req.body;
    
    const testResult = await partnerApiService.testWebhookDelivery(
      webhookId,
      'test_event',
      testData || { message: 'Test webhook delivery' }
    );

    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_TEST_ERROR',
        message: 'Webhookテストに失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== SDK管理 =====

/**
 * GET /sdk/config
 * SDK設定情報の取得
 */
router.get('/sdk/config', async (req, res) => {
  try {
    const { language } = req.query;
    
    const sdkConfig = await partnerApiService.getSdkConfig(language as string);

    res.json({
      success: true,
      data: sdkConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SDK_CONFIG_ERROR',
        message: 'SDK設定の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /sdk/download/:language
 * SDK パッケージのダウンロード
 */
router.get('/sdk/download/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const { version } = req.query;
    
    const downloadInfo = await partnerApiService.getSdkDownload(
      language,
      version as string
    );

    if (!downloadInfo) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SDK_NOT_FOUND',
          message: '指定されたSDKが見つかりません'
        }
      });
    }

    res.json({
      success: true,
      data: downloadInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SDK_DOWNLOAD_ERROR',
        message: 'SDKダウンロード情報の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /sdk/examples/:language
 * SDK コード例の取得
 */
router.get('/sdk/examples/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const { feature } = req.query;
    
    const examples = await partnerApiService.getSdkExamples(
      language,
      feature as string
    );

    res.json({
      success: true,
      data: examples
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SDK_EXAMPLES_ERROR',
        message: 'SDKコード例の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== 分析・メトリクス =====

/**
 * GET /partners/:partnerId/analytics
 * パートナー分析データの取得
 */
router.get('/:partnerId/analytics', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { startDate, endDate, granularity = 'daily' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '開始日と終了日が必要です'
        }
      });
    }

    const analytics = await partnerApiService.getPartnerAnalytics(
      partnerId,
      new Date(startDate as string),
      new Date(endDate as string),
      granularity as string
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: '分析データの取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /analytics/api
 * API全体の分析データ取得（管理者用）
 */
router.get('/analytics/api', async (req, res) => {
  try {
    const { startDate, endDate, partnerId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '開始日と終了日が必要です'
        }
      });
    }

    const analytics = await partnerApiService.getApiAnalytics(
      new Date(startDate as string),
      new Date(endDate as string),
      partnerId as string
    );

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'API_ANALYTICS_ERROR',
        message: 'API分析データの取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== サポート =====

/**
 * GET /partners/:partnerId/support/tickets
 * サポートチケット一覧取得
 */
router.get('/:partnerId/support/tickets', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { status, priority, category } = req.query;
    
    const tickets = await partnerApiService.getSupportTickets(partnerId, {
      status: status as string,
      priority: priority as string,
      category: category as string
    });

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SUPPORT_TICKETS_ERROR',
        message: 'サポートチケットの取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /partners/:partnerId/support/tickets
 * 新しいサポートチケットの作成
 */
router.post('/:partnerId/support/tickets', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const ticketData = req.body;

    if (!ticketData.subject || !ticketData.description || !ticketData.priority) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '件名、説明、優先度が必要です'
        }
      });
    }

    const ticket = await partnerApiService.createSupportTicket(
      partnerId,
      ticketData
    );

    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TICKET_CREATE_ERROR',
        message: 'サポートチケットの作成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== レート制限情報 =====

/**
 * GET /partners/:partnerId/rate-limits
 * パートナーのレート制限情報取得
 */
router.get('/:partnerId/rate-limits', async (req, res) => {
  try {
    const { partnerId } = req.params;
    
    const rateLimits = await partnerApiService.getPartnerRateLimits(partnerId);

    res.json({
      success: true,
      data: rateLimits
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'RATE_LIMITS_ERROR',
        message: 'レート制限情報の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /partners/:partnerId/usage
 * パートナーの使用量情報取得
 */
router.get('/:partnerId/usage', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { period = 'current_month' } = req.query;
    
    const usage = await partnerApiService.getPartnerUsage(
      partnerId,
      period as string
    );

    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'USAGE_ERROR',
        message: '使用量情報の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

export default router;