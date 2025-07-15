import express from 'express';
import MultiTenantDNSManager, { 
  Tenant, 
  TenantUser, 
  TenantQuota, 
  TenantBilling,
  TenantIsolation
} from '../../../../src/lib/multi-tenant-dns-manager.js';
import { Logger } from '../../../../src/lib/logger.js';

const router = express.Router();
const logger = new Logger({ context: 'TenantAPI' });

// マルチテナントDNSマネージャーのインスタンス
let tenantManager: MultiTenantDNSManager | null = null;

// マネージャーの初期化
const initializeManager = () => {
  if (!tenantManager) {
    tenantManager = new MultiTenantDNSManager();
    logger.info('マルチテナントDNSマネージャーを初期化しました');
  }
  return tenantManager;
};

// プロセス終了時のクリーンアップ
process.on('SIGINT', async () => {
  if (tenantManager) {
    await tenantManager.shutdown();
    logger.info('マルチテナントDNSマネージャーをシャットダウンしました');
  }
});

/**
 * テナント一覧を取得
 */
router.get('/', async (req, res) => {
  try {
    const manager = initializeManager();
    const { plan, status, limit, offset } = req.query;
    
    let tenants = manager.getAllTenants();
    
    // フィルタリング
    if (plan) {
      tenants = tenants.filter(tenant => tenant.plan === plan);
    }
    if (status) {
      tenants = tenants.filter(tenant => tenant.status === status);
    }
    
    // ページネーション
    const limitNum = parseInt(limit as string) || 50;
    const offsetNum = parseInt(offset as string) || 0;
    const paginatedTenants = tenants.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      tenants: paginatedTenants,
      total: tenants.length,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error) {
    logger.error('テナント一覧の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'テナント一覧の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * 新しいテナントを作成
 */
router.post('/', async (req, res) => {
  try {
    const manager = initializeManager();
    const { 
      name, 
      domain, 
      plan = 'free', 
      email, 
      industry = 'technology',
      companySize = 'startup',
      region = 'us-east-1'
    } = req.body;
    
    // 入力検証
    if (!name || !domain || !email) {
      return res.status(400).json({ 
        error: '必須フィールドが不足しています (name, domain, email)' 
      });
    }
    
    // プラン別設定
    const planConfigs = {
      free: {
        maxDNSRecords: 100,
        maxQueriesPerMonth: 10000,
        maxUsers: 5,
        apiRateLimit: 100,
        allowedFeatures: ['basic-dns', 'monitoring']
      },
      basic: {
        maxDNSRecords: 500,
        maxQueriesPerMonth: 50000,
        maxUsers: 10,
        apiRateLimit: 500,
        allowedFeatures: ['basic-dns', 'monitoring', 'analytics']
      },
      professional: {
        maxDNSRecords: 2000,
        maxQueriesPerMonth: 200000,
        maxUsers: 25,
        apiRateLimit: 1000,
        allowedFeatures: ['basic-dns', 'monitoring', 'analytics', 'api-access']
      },
      enterprise: {
        maxDNSRecords: 10000,
        maxQueriesPerMonth: 1000000,
        maxUsers: 100,
        apiRateLimit: 5000,
        allowedFeatures: ['basic-dns', 'monitoring', 'analytics', 'api-access', 'white-label']
      }
    };
    
    const planConfig = planConfigs[plan as keyof typeof planConfigs];
    if (!planConfig) {
      return res.status(400).json({ 
        error: '無効なプランが指定されました' 
      });
    }
    
    const tenantData = {
      name,
      domain,
      plan,
      status: 'active' as const,
      settings: {
        ...planConfig,
        retention: {
          logs: plan === 'enterprise' ? 365 : 90,
          metrics: plan === 'enterprise' ? 365 : 90,
          backups: plan === 'enterprise' ? 90 : 30
        }
      },
      subscription: {
        planId: `${plan}-plan`,
        status: 'active' as const,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年後
        usage: {
          dnsRecords: 0,
          queriesThisMonth: 0,
          activeUsers: 0,
          apiCalls: 0
        }
      },
      metadata: {
        industry,
        companySize,
        region,
        contactEmail: email
      }
    };
    
    const tenant = await manager.createTenant(tenantData);
    
    res.status(201).json(tenant);
  } catch (error) {
    logger.error('テナント作成に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'テナント作成に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * 特定のテナントを取得
 */
router.get('/:tenantId', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    
    const tenant = manager.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ 
        error: 'テナントが見つかりません' 
      });
    }
    
    res.json(tenant);
  } catch (error) {
    logger.error('テナント取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'テナント取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * テナント情報を更新
 */
router.put('/:tenantId', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    const updates = req.body;
    
    const updatedTenant = await manager.updateTenant(tenantId, updates);
    
    res.json(updatedTenant);
  } catch (error) {
    logger.error('テナント更新に失敗しました', error as Error);
    
    if ((error as Error).message.includes('見つかりません')) {
      res.status(404).json({ 
        error: 'テナントが見つかりません',
        details: (error as Error).message
      });
    } else {
      res.status(500).json({ 
        error: 'テナント更新に失敗しました',
        details: (error as Error).message
      });
    }
  }
});

/**
 * テナントを削除
 */
router.delete('/:tenantId', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    
    await manager.deleteTenant(tenantId);
    
    res.status(204).send();
  } catch (error) {
    logger.error('テナント削除に失敗しました', error as Error);
    
    if ((error as Error).message.includes('見つかりません')) {
      res.status(404).json({ 
        error: 'テナントが見つかりません',
        details: (error as Error).message
      });
    } else {
      res.status(500).json({ 
        error: 'テナント削除に失敗しました',
        details: (error as Error).message
      });
    }
  }
});

/**
 * テナントの統計情報を取得
 */
router.get('/:tenantId/stats', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    
    const tenant = manager.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ 
        error: 'テナントが見つかりません' 
      });
    }
    
    const stats = manager.getTenantStats(tenantId);
    
    res.json(stats);
  } catch (error) {
    logger.error('テナント統計の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'テナント統計の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * テナントのクォータ情報を取得
 */
router.get('/:tenantId/quota', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    
    const quota = manager.getTenantQuota(tenantId);
    if (!quota) {
      return res.status(404).json({ 
        error: 'テナントまたはクォータが見つかりません' 
      });
    }
    
    res.json(quota);
  } catch (error) {
    logger.error('クォータ情報の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'クォータ情報の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * テナントの請求情報を取得
 */
router.get('/:tenantId/billing', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    
    const billing = manager.getTenantBilling(tenantId);
    if (!billing) {
      return res.status(404).json({ 
        error: 'テナントまたは請求情報が見つかりません' 
      });
    }
    
    res.json(billing);
  } catch (error) {
    logger.error('請求情報の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: '請求情報の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * テナントの分離設定を取得
 */
router.get('/:tenantId/isolation', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    
    const isolation = manager.getTenantIsolation(tenantId);
    if (!isolation) {
      return res.status(404).json({ 
        error: 'テナントまたは分離設定が見つかりません' 
      });
    }
    
    res.json(isolation);
  } catch (error) {
    logger.error('分離設定の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: '分離設定の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * テナントのユーザー一覧を取得
 */
router.get('/:tenantId/users', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    
    const tenant = manager.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ 
        error: 'テナントが見つかりません' 
      });
    }
    
    const users = manager.getTenantUsers(tenantId);
    
    res.json(users);
  } catch (error) {
    logger.error('ユーザー一覧の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'ユーザー一覧の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * テナントに新しいユーザーを追加
 */
router.post('/:tenantId/users', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    const { 
      email, 
      name, 
      role = 'viewer',
      permissions 
    } = req.body;
    
    // 入力検証
    if (!email || !name) {
      return res.status(400).json({ 
        error: '必須フィールドが不足しています (email, name)' 
      });
    }
    
    // 役割に基づく権限の設定
    const rolePermissions = {
      owner: ['*'],
      admin: ['dns:*', 'users:*', 'settings:*', 'billing:read'],
      editor: ['dns:read', 'dns:write', 'users:read'],
      viewer: ['dns:read', 'users:read']
    };
    
    const userData = {
      email,
      role,
      permissions: permissions || rolePermissions[role as keyof typeof rolePermissions] || rolePermissions.viewer,
      status: 'active' as const,
      profile: {
        name,
        timezone: 'Asia/Tokyo',
        language: 'ja',
        preferences: {
          notifications: true,
          emailDigest: true,
          theme: 'light' as const
        }
      },
      mfa: {
        enabled: false
      }
    };
    
    const user = await manager.createUser(tenantId, userData);
    
    res.status(201).json(user);
  } catch (error) {
    logger.error('ユーザー作成に失敗しました', error as Error);
    
    if ((error as Error).message.includes('見つかりません')) {
      res.status(404).json({ 
        error: 'テナントが見つかりません',
        details: (error as Error).message
      });
    } else if ((error as Error).message.includes('上限')) {
      res.status(409).json({ 
        error: 'ユーザー数の上限に達しています',
        details: (error as Error).message
      });
    } else {
      res.status(500).json({ 
        error: 'ユーザー作成に失敗しました',
        details: (error as Error).message
      });
    }
  }
});

/**
 * テナントのリソース一覧を取得
 */
router.get('/:tenantId/resources', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    const { type } = req.query;
    
    const tenant = manager.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ 
        error: 'テナントが見つかりません' 
      });
    }
    
    const resources = manager.getTenantResources(tenantId, type as string);
    
    res.json(resources);
  } catch (error) {
    logger.error('リソース一覧の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'リソース一覧の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * テナントに新しいリソースを追加
 */
router.post('/:tenantId/resources', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    const { 
      type, 
      name, 
      configuration = {},
      createdBy,
      tags = [],
      metadata = {}
    } = req.body;
    
    // 入力検証
    if (!type || !name || !createdBy) {
      return res.status(400).json({ 
        error: '必須フィールドが不足しています (type, name, createdBy)' 
      });
    }
    
    const resourceData = {
      type,
      name,
      configuration,
      status: 'active' as const,
      createdBy,
      tags,
      metadata: {
        version: '1.0.0',
        lastModified: new Date(),
        modifiedBy: createdBy,
        ...metadata
      }
    };
    
    const resource = await manager.createResource(tenantId, resourceData);
    
    res.status(201).json(resource);
  } catch (error) {
    logger.error('リソース作成に失敗しました', error as Error);
    
    if ((error as Error).message.includes('見つかりません')) {
      res.status(404).json({ 
        error: 'テナントが見つかりません',
        details: (error as Error).message
      });
    } else {
      res.status(500).json({ 
        error: 'リソース作成に失敗しました',
        details: (error as Error).message
      });
    }
  }
});

/**
 * テナントの監査ログを取得
 */
router.get('/:tenantId/audit', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    const { 
      limit, 
      offset, 
      action, 
      userId, 
      risk,
      startDate,
      endDate
    } = req.query;
    
    const tenant = manager.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ 
        error: 'テナントが見つかりません' 
      });
    }
    
    const filterOptions: any = {
      limit: parseInt(limit as string) || 50,
      offset: parseInt(offset as string) || 0
    };
    
    if (action) filterOptions.action = action;
    if (userId) filterOptions.userId = userId;
    if (risk) filterOptions.risk = risk;
    if (startDate) filterOptions.startDate = new Date(startDate as string);
    if (endDate) filterOptions.endDate = new Date(endDate as string);
    
    const auditLogs = manager.getAuditLogs(tenantId, filterOptions);
    
    res.json(auditLogs);
  } catch (error) {
    logger.error('監査ログの取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: '監査ログの取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * システム全体の統計を取得
 */
router.get('/system/stats', async (req, res) => {
  try {
    const manager = initializeManager();
    const systemStats = manager.getSystemStats();
    
    res.json(systemStats);
  } catch (error) {
    logger.error('システム統計の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'システム統計の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * アクティブ接続数を取得
 */
router.get('/:tenantId/connections', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    
    const connections = manager.getActiveConnections(tenantId);
    
    res.json({ activeConnections: connections });
  } catch (error) {
    logger.error('アクティブ接続数の取得に失敗しました', error as Error);
    res.status(500).json({ 
      error: 'アクティブ接続数の取得に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * 接続を追跡
 */
router.post('/:tenantId/connections', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'ユーザーIDが必要です' 
      });
    }
    
    manager.trackConnection(tenantId, userId);
    
    res.json({ success: true, message: '接続を追跡しました' });
  } catch (error) {
    logger.error('接続追跡に失敗しました', error as Error);
    res.status(500).json({ 
      error: '接続追跡に失敗しました',
      details: (error as Error).message
    });
  }
});

/**
 * 接続を削除
 */
router.delete('/:tenantId/connections/:userId', async (req, res) => {
  try {
    const manager = initializeManager();
    const { tenantId, userId } = req.params;
    
    manager.removeConnection(tenantId, userId);
    
    res.json({ success: true, message: '接続を削除しました' });
  } catch (error) {
    logger.error('接続削除に失敗しました', error as Error);
    res.status(500).json({ 
      error: '接続削除に失敗しました',
      details: (error as Error).message
    });
  }
});

export default router;