/**
 * 企業向けマルチテナント・オーケストレーション API
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { EnterpriseOrchestrator, Tenant, OrchestrationJob } from '../../../src/lib/enterprise-orchestrator.js';
import { Logger } from '../../../src/lib/logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitMiddleware } from '../middleware/rate-limit.js';

const router = Router();
const logger = new Logger();

// エンタープライズ・オーケストレーターのインスタンス
const orchestrator = new EnterpriseOrchestrator(logger, {
  maxConcurrentJobs: 20,
  jobTimeoutMs: 600000, // 10分
  resourceLimits: {
    maxMemoryMB: 2048,
    maxCpuPercent: 90,
    maxNetworkBandwidth: 200
  },
  tenantIsolation: {
    enabled: true,
    sandboxMode: true,
    resourceQuotas: true
  },
  monitoring: {
    metricsEnabled: true,
    alertingEnabled: true,
    auditLogging: true
  }
});

// バリデーション関数
const validateTenant = [
  body('name').notEmpty().withMessage('テナント名は必須です'),
  body('organizationId').notEmpty().withMessage('組織IDは必須です'),
  body('domain').isURL({ require_protocol: false }).withMessage('有効なドメインを入力してください'),
  body('settings.securityPolicies.confidenceThreshold')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('信頼度閾値は0-100の数値である必要があります'),
  body('resources.maxDomains').optional().isInt({ min: 1 }).withMessage('最大ドメイン数は1以上である必要があります'),
  body('resources.maxRecords').optional().isInt({ min: 1 }).withMessage('最大レコード数は1以上である必要があります'),
  body('resources.maxQueries').optional().isInt({ min: 1 }).withMessage('最大クエリ数は1以上である必要があります'),
  body('resources.maxUsers').optional().isInt({ min: 1 }).withMessage('最大ユーザー数は1以上である必要があります')
];

const validateJob = [
  body('tenantId').notEmpty().withMessage('テナントIDは必須です'),
  body('type').isIn(['dns-analysis', 'security-scan', 'optimization', 'bulk-operation', 'report-generation'])
    .withMessage('有効なジョブタイプを指定してください'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('有効な優先度を指定してください'),
  body('parameters').isObject().withMessage('パラメータはオブジェクトである必要があります')
];

// エラーハンドリング
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// 権限チェック（エンタープライズ機能）
const requireEnterpriseAccess = (req: any, res: any, next: any) => {
  if (!req.user.permissions.includes('enterprise:access')) {
    return res.status(403).json({
      success: false,
      message: 'エンタープライズ機能へのアクセス権限がありません'
    });
  }
  next();
};

// テナント管理権限チェック
const requireTenantManagement = (req: any, res: any, next: any) => {
  if (!req.user.permissions.includes('tenant:manage')) {
    return res.status(403).json({
      success: false,
      message: 'テナント管理権限がありません'
    });
  }
  next();
};

// オーケストレーション管理権限チェック
const requireOrchestrationAccess = (req: any, res: any, next: any) => {
  if (!req.user.permissions.includes('orchestration:manage')) {
    return res.status(403).json({
      success: false,
      message: 'オーケストレーション管理権限がありません'
    });
  }
  next();
};

// ===== テナント管理 API =====

/**
 * テナント一覧の取得
 */
router.get('/tenants', 
  authMiddleware, 
  requireEnterpriseAccess,
  rateLimitMiddleware,
  [
    query('organizationId').optional().isString(),
    query('status').optional().isIn(['active', 'suspended', 'inactive']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { organizationId, status, page = 1, limit = 20 } = req.query;
      
      let tenants = orchestrator.getTenants(organizationId);
      
      // ステータスフィルター
      if (status) {
        tenants = tenants.filter(t => t.status === status);
      }
      
      // ページネーション
      const offset = (page - 1) * limit;
      const paginatedTenants = tenants.slice(offset, offset + limit);
      
      res.json({
        success: true,
        data: {
          tenants: paginatedTenants,
          pagination: {
            total: tenants.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(tenants.length / limit)
          }
        }
      });
      
    } catch (error) {
      logger.error('テナント一覧取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'テナント一覧の取得に失敗しました'
      });
    }
  }
);

/**
 * テナント詳細の取得
 */
router.get('/tenants/:tenantId',
  authMiddleware,
  requireEnterpriseAccess,
  rateLimitMiddleware,
  [
    param('tenantId').isUUID().withMessage('有効なテナントIDを指定してください')
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.params;
      
      const tenant = orchestrator.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'テナントが見つかりません'
        });
      }
      
      res.json({
        success: true,
        data: tenant
      });
      
    } catch (error) {
      logger.error('テナント詳細取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'テナント詳細の取得に失敗しました'
      });
    }
  }
);

/**
 * テナントの作成
 */
router.post('/tenants',
  authMiddleware,
  requireEnterpriseAccess,
  requireTenantManagement,
  rateLimitMiddleware,
  validateTenant,
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const tenantData = req.body;
      
      // デフォルト値の設定
      const defaultTenant = {
        status: 'active',
        settings: {
          dnsResolvers: ['8.8.8.8', '1.1.1.1'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: false,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: []
        },
        resources: {
          maxDomains: 100,
          maxRecords: 1000,
          maxQueries: 10000,
          maxUsers: 10,
          storageLimit: 1000,
          computeLimit: 100,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: [req.user.email],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        },
        ...tenantData
      };
      
      // カスタムドメインの設定
      if (tenantData.domain && !defaultTenant.settings.customDomains.includes(tenantData.domain)) {
        defaultTenant.settings.customDomains.push(tenantData.domain);
      }
      
      const tenant = await orchestrator.createTenant(defaultTenant);
      
      logger.info('テナント作成完了', {
        tenantId: tenant.id,
        name: tenant.name,
        createdBy: req.user.email
      });
      
      res.status(201).json({
        success: true,
        data: tenant
      });
      
    } catch (error) {
      logger.error('テナント作成エラー:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'テナント作成に失敗しました'
      });
    }
  }
);

/**
 * テナント設定の更新
 */
router.put('/tenants/:tenantId/settings',
  authMiddleware,
  requireEnterpriseAccess,
  requireTenantManagement,
  rateLimitMiddleware,
  [
    param('tenantId').isUUID().withMessage('有効なテナントIDを指定してください')
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.params;
      const settings = req.body;
      
      const tenant = orchestrator.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'テナントが見つかりません'
        });
      }
      
      await orchestrator.updateTenantSettings(tenantId, settings);
      
      logger.info('テナント設定更新完了', {
        tenantId,
        updatedBy: req.user.email
      });
      
      res.json({
        success: true,
        message: 'テナント設定を更新しました'
      });
      
    } catch (error) {
      logger.error('テナント設定更新エラー:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'テナント設定の更新に失敗しました'
      });
    }
  }
);

// ===== オーケストレーション・ジョブ管理 API =====

/**
 * ジョブ一覧の取得
 */
router.get('/jobs',
  authMiddleware,
  requireEnterpriseAccess,
  requireOrchestrationAccess,
  rateLimitMiddleware,
  [
    query('tenantId').optional().isUUID(),
    query('type').optional().isIn(['dns-analysis', 'security-scan', 'optimization', 'bulk-operation', 'report-generation']),
    query('status').optional().isIn(['pending', 'running', 'completed', 'failed', 'cancelled']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { tenantId, type, status, priority, page = 1, limit = 20 } = req.query;
      
      let jobs: OrchestrationJob[] = [];
      
      if (tenantId) {
        jobs = orchestrator.getTenantJobs(tenantId);
      } else {
        // 全テナントのジョブを取得（要権限チェック）
        const tenants = orchestrator.getTenants();
        jobs = tenants.flatMap(tenant => orchestrator.getTenantJobs(tenant.id));
      }
      
      // フィルタリング
      if (type) {
        jobs = jobs.filter(j => j.type === type);
      }
      if (status) {
        jobs = jobs.filter(j => j.status === status);
      }
      if (priority) {
        jobs = jobs.filter(j => j.priority === priority);
      }
      
      // ソート（作成日時の降順）
      jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // ページネーション
      const offset = (page - 1) * limit;
      const paginatedJobs = jobs.slice(offset, offset + limit);
      
      res.json({
        success: true,
        data: {
          jobs: paginatedJobs,
          pagination: {
            total: jobs.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(jobs.length / limit)
          }
        }
      });
      
    } catch (error) {
      logger.error('ジョブ一覧取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'ジョブ一覧の取得に失敗しました'
      });
    }
  }
);

/**
 * ジョブ詳細の取得
 */
router.get('/jobs/:jobId',
  authMiddleware,
  requireEnterpriseAccess,
  requireOrchestrationAccess,
  rateLimitMiddleware,
  [
    param('jobId').isUUID().withMessage('有効なジョブIDを指定してください')
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { jobId } = req.params;
      
      const job = orchestrator.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'ジョブが見つかりません'
        });
      }
      
      res.json({
        success: true,
        data: job
      });
      
    } catch (error) {
      logger.error('ジョブ詳細取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'ジョブ詳細の取得に失敗しました'
      });
    }
  }
);

/**
 * ジョブの作成
 */
router.post('/jobs',
  authMiddleware,
  requireEnterpriseAccess,
  requireOrchestrationAccess,
  rateLimitMiddleware,
  validateJob,
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { tenantId, type, parameters, priority = 'medium' } = req.body;
      
      // テナントの存在確認
      const tenant = orchestrator.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'テナントが見つかりません'
        });
      }
      
      // ジョブパラメータの検証
      const validatedParameters = {
        ...parameters,
        jobId: undefined, // 後で設定される
        createdBy: req.user.email
      };
      
      const job = await orchestrator.createJob(tenantId, type, validatedParameters, priority);
      
      // ジョブIDをパラメータに設定
      validatedParameters.jobId = job.id;
      
      logger.info('ジョブ作成完了', {
        jobId: job.id,
        tenantId,
        type,
        priority,
        createdBy: req.user.email
      });
      
      res.status(201).json({
        success: true,
        data: job
      });
      
    } catch (error) {
      logger.error('ジョブ作成エラー:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'ジョブ作成に失敗しました'
      });
    }
  }
);

// ===== 統計・監視 API =====

/**
 * 統計情報の取得
 */
router.get('/statistics',
  authMiddleware,
  requireEnterpriseAccess,
  rateLimitMiddleware,
  async (req: any, res: any) => {
    try {
      const statistics = orchestrator.getStatistics();
      const performanceMetrics = orchestrator.getPerformanceMetrics();
      
      res.json({
        success: true,
        data: {
          orchestration: statistics,
          performance: performanceMetrics,
          timestamp: new Date()
        }
      });
      
    } catch (error) {
      logger.error('統計情報取得エラー:', error);
      res.status(500).json({
        success: false,
        message: '統計情報の取得に失敗しました'
      });
    }
  }
);

/**
 * テナント別統計の取得
 */
router.get('/tenants/:tenantId/statistics',
  authMiddleware,
  requireEnterpriseAccess,
  rateLimitMiddleware,
  [
    param('tenantId').isUUID().withMessage('有効なテナントIDを指定してください')
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.params;
      
      const tenant = orchestrator.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'テナントが見つかりません'
        });
      }
      
      const jobs = orchestrator.getTenantJobs(tenantId);
      
      const statistics = {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt
        },
        resources: {
          usage: tenant.resources.currentUsage,
          limits: {
            maxDomains: tenant.resources.maxDomains,
            maxRecords: tenant.resources.maxRecords,
            maxQueries: tenant.resources.maxQueries,
            maxUsers: tenant.resources.maxUsers,
            storageLimit: tenant.resources.storageLimit,
            computeLimit: tenant.resources.computeLimit
          },
          utilizationRates: {
            domains: (tenant.resources.currentUsage.domains / tenant.resources.maxDomains) * 100,
            records: (tenant.resources.currentUsage.records / tenant.resources.maxRecords) * 100,
            queries: (tenant.resources.currentUsage.queries / tenant.resources.maxQueries) * 100,
            users: (tenant.resources.currentUsage.users / tenant.resources.maxUsers) * 100,
            storage: (tenant.resources.currentUsage.storage / tenant.resources.storageLimit) * 100,
            compute: (tenant.resources.currentUsage.compute / tenant.resources.computeLimit) * 100
          }
        },
        jobs: {
          total: jobs.length,
          byStatus: jobs.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byType: jobs.reduce((acc, job) => {
            acc[job.type] = (acc[job.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byPriority: jobs.reduce((acc, job) => {
            acc[job.priority] = (acc[job.priority] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        settings: {
          securityPolicies: tenant.settings.securityPolicies,
          performanceSettings: tenant.settings.performanceSettings,
          integrationsEnabled: tenant.settings.integrationsEnabled,
          customDomainsCount: tenant.settings.customDomains.length
        }
      };
      
      res.json({
        success: true,
        data: statistics
      });
      
    } catch (error) {
      logger.error('テナント統計取得エラー:', error);
      res.status(500).json({
        success: false,
        message: 'テナント統計の取得に失敗しました'
      });
    }
  }
);

// ===== WebSocket イベント処理 =====

// オーケストレーターのイベントリスナー設定
orchestrator.on('tenant-created', (tenant: Tenant) => {
  // WebSocketで通知（実装は省略）
  logger.info('テナント作成イベント', { tenantId: tenant.id });
});

orchestrator.on('tenant-settings-updated', (tenant: Tenant) => {
  // WebSocketで通知（実装は省略）
  logger.info('テナント設定更新イベント', { tenantId: tenant.id });
});

orchestrator.on('job-created', (job: OrchestrationJob) => {
  // WebSocketで通知（実装は省略）
  logger.info('ジョブ作成イベント', { jobId: job.id, tenantId: job.tenantId });
});

orchestrator.on('job-started', (job: OrchestrationJob) => {
  // WebSocketで通知（実装は省略）
  logger.info('ジョブ開始イベント', { jobId: job.id, tenantId: job.tenantId });
});

orchestrator.on('job-progress', (job: OrchestrationJob) => {
  // WebSocketで通知（実装は省略）
  logger.debug('ジョブ進捗イベント', { jobId: job.id, progress: job.progress });
});

orchestrator.on('job-completed', (job: OrchestrationJob) => {
  // WebSocketで通知（実装は省略）
  logger.info('ジョブ完了イベント', { jobId: job.id, tenantId: job.tenantId });
});

orchestrator.on('job-failed', (job: OrchestrationJob) => {
  // WebSocketで通知（実装は省略）
  logger.error('ジョブ失敗イベント', { jobId: job.id, error: job.error });
});

// 正常終了処理
process.on('SIGINT', async () => {
  logger.info('エンタープライズAPIサーバーを停止しています...');
  await orchestrator.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('エンタープライズAPIサーバーを停止しています...');
  await orchestrator.shutdown();
  process.exit(0);
});

export default router;