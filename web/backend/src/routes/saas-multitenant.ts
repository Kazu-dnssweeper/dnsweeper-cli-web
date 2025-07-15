/**
 * DNSweeper SaaS・マルチテナント管理 APIルート
 * テナント管理・ユーザー管理・課金・分析・プラン管理エンドポイント
 */

import express from 'express';
import { saasMultiTenantService } from '../services/saas-multitenant-service';
import { TenantUserRole, TenantIsolationLevel } from '../types/saas-multitenant';

const router = express.Router();

// ===== テナント管理 =====

/**
 * POST /tenants
 * 新しいテナントの作成
 */
router.post('/', async (req, res) => {
  try {
    const { tenantData, planId, adminUser } = req.body;

    if (!tenantData?.name || !planId || !adminUser?.email || !adminUser?.name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'テナント名、プランID、管理者情報が必要です',
          required: ['tenantData.name', 'planId', 'adminUser.email', 'adminUser.name']
        }
      });
    }

    const result = await saasMultiTenantService.createTenant(
      tenantData,
      planId,
      adminUser
    );

    res.status(201).json({
      success: true,
      data: {
        tenant: result.tenant,
        adminUser: result.user
      },
      message: 'テナントが正常に作成されました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_CREATE_ERROR',
        message: 'テナントの作成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /tenants
 * テナント一覧取得（管理者用）
 */
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      tier, 
      isolationLevel,
      limit = 50, 
      offset = 0,
      search 
    } = req.query;

    const tenants = await saasMultiTenantService.getTenants({
      status: status as string,
      tier: tier as string,
      isolationLevel: isolationLevel as TenantIsolationLevel,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      search: search as string
    });

    res.json({
      success: true,
      data: tenants,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: tenants.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANTS_FETCH_ERROR',
        message: 'テナント一覧の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /tenants/:tenantId
 * 特定テナントの詳細取得
 */
router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const tenant = await saasMultiTenantService.getTenant(tenantId);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: '指定されたテナントが見つかりません'
        }
      });
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_FETCH_ERROR',
        message: 'テナント詳細の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * PUT /tenants/:tenantId
 * テナント情報の更新
 */
router.put('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const updates = req.body;

    const tenant = await saasMultiTenantService.updateTenant(tenantId, updates);

    res.json({
      success: true,
      data: tenant,
      message: 'テナント情報を更新しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_UPDATE_ERROR',
        message: 'テナント更新に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /tenants/:tenantId/plan-change
 * テナントプランの変更
 */
router.post('/:tenantId/plan-change', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { newPlanId, effectiveDate } = req.body;

    if (!newPlanId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '新しいプランIDが必要です'
        }
      });
    }

    const result = await saasMultiTenantService.changeTenantPlan(
      tenantId,
      newPlanId,
      effectiveDate ? new Date(effectiveDate) : undefined
    );

    res.json({
      success: true,
      data: result,
      message: result.migrationJob 
        ? 'プラン変更のための移行ジョブを開始しました' 
        : 'プランを変更しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PLAN_CHANGE_ERROR',
        message: 'プラン変更に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * DELETE /tenants/:tenantId
 * テナントの削除
 */
router.delete('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { 
      immediate = false, 
      backupData = true, 
      notifyUsers = true 
    } = req.query;

    await saasMultiTenantService.deleteTenant(tenantId, {
      immediate: immediate === 'true',
      backupData: backupData === 'true',
      notifyUsers: notifyUsers === 'true'
    });

    res.json({
      success: true,
      message: immediate === 'true' 
        ? 'テナントを即座に削除しました' 
        : 'テナントの削除をスケジュールしました（30日後に完全削除）'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'TENANT_DELETE_ERROR',
        message: 'テナント削除に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== ユーザー管理 =====

/**
 * GET /tenants/:tenantId/users
 * テナントユーザー一覧取得
 */
router.get('/:tenantId/users', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { role, status } = req.query;
    
    const users = await saasMultiTenantService.getTenantUsers(tenantId, {
      role: role as TenantUserRole,
      status: status as string
    });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'USERS_FETCH_ERROR',
        message: 'ユーザー一覧の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /tenants/:tenantId/users
 * テナントユーザーの追加
 */
router.post('/:tenantId/users', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const userData = req.body;
    const invitedBy = req.headers['x-user-id'] as string; // 認証ミドルウェアから取得

    if (!userData.email || !userData.name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'メールアドレスと名前が必要です'
        }
      });
    }

    const user = await saasMultiTenantService.addTenantUser(
      tenantId,
      userData,
      invitedBy
    );

    res.status(201).json({
      success: true,
      data: user,
      message: 'ユーザーを招待しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_INVITE_ERROR',
        message: 'ユーザー招待に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * PUT /tenants/:tenantId/users/:userId/role
 * ユーザーロールの変更
 */
router.put('/:tenantId/users/:userId/role', async (req, res) => {
  try {
    const { tenantId, userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'ロールが必要です'
        }
      });
    }

    const user = await saasMultiTenantService.updateUserRole(
      tenantId,
      userId,
      role as TenantUserRole
    );

    res.json({
      success: true,
      data: user,
      message: 'ユーザーロールを更新しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_ROLE_UPDATE_ERROR',
        message: 'ユーザーロールの更新に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * DELETE /tenants/:tenantId/users/:userId
 * ユーザーの削除
 */
router.delete('/:tenantId/users/:userId', async (req, res) => {
  try {
    const { tenantId, userId } = req.params;

    await saasMultiTenantService.removeTenantUser(tenantId, userId);

    res.json({
      success: true,
      message: 'ユーザーを削除しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_DELETE_ERROR',
        message: 'ユーザー削除に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== 課金管理 =====

/**
 * POST /tenants/:tenantId/usage
 * 使用量の記録
 */
router.post('/:tenantId/usage', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const usage = req.body;

    await saasMultiTenantService.recordUsage(tenantId, usage);

    res.json({
      success: true,
      message: '使用量を記録しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'USAGE_RECORD_ERROR',
        message: '使用量の記録に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /tenants/:tenantId/usage
 * 使用量の取得
 */
router.get('/:tenantId/usage', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { period = 'current_month' } = req.query;
    
    const usage = await saasMultiTenantService.getTenantUsage(
      tenantId,
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
        code: 'USAGE_FETCH_ERROR',
        message: '使用量の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /tenants/:tenantId/billing/invoice
 * 請求書の生成
 */
router.post('/:tenantId/billing/invoice', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const invoice = await saasMultiTenantService.generateInvoice(tenantId);

    res.json({
      success: true,
      data: invoice,
      message: '請求書を生成しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INVOICE_GENERATE_ERROR',
        message: '請求書の生成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /tenants/:tenantId/billing/history
 * 課金履歴の取得
 */
router.get('/:tenantId/billing/history', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { limit = 12, offset = 0 } = req.query;
    
    const history = await saasMultiTenantService.getBillingHistory(
      tenantId,
      parseInt(limit as string),
      parseInt(offset as string)
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'BILLING_HISTORY_ERROR',
        message: '課金履歴の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== 分析・メトリクス =====

/**
 * GET /tenants/:tenantId/analytics
 * テナント分析データの取得
 */
router.get('/:tenantId/analytics', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '開始日と終了日が必要です'
        }
      });
    }

    const analytics = await saasMultiTenantService.getTenantAnalytics(
      tenantId,
      new Date(startDate as string),
      new Date(endDate as string)
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
 * GET /analytics/overview
 * 全テナント概要の取得（管理者用）
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const overview = await saasMultiTenantService.getAllTenantsOverview();

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'OVERVIEW_ERROR',
        message: '概要データの取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== プラン管理 =====

/**
 * GET /plans
 * 利用可能プラン一覧の取得
 */
router.get('/plans', async (req, res) => {
  try {
    const { publicOnly = true } = req.query;
    
    const plans = await saasMultiTenantService.getAvailablePlans(
      publicOnly === 'true'
    );

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PLANS_FETCH_ERROR',
        message: 'プラン一覧の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /plans/:planId
 * 特定プランの詳細取得
 */
router.get('/plans/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    
    const plan = await saasMultiTenantService.getPlan(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PLAN_NOT_FOUND',
          message: '指定されたプランが見つかりません'
        }
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'PLAN_FETCH_ERROR',
        message: 'プラン詳細の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== 移行管理 =====

/**
 * GET /tenants/:tenantId/migrations
 * テナントの移行履歴取得
 */
router.get('/:tenantId/migrations', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const migrations = await saasMultiTenantService.getTenantMigrations(tenantId);

    res.json({
      success: true,
      data: migrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'MIGRATIONS_FETCH_ERROR',
        message: '移行履歴の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * POST /migrations/:migrationId/execute
 * 移行ジョブの実行
 */
router.post('/migrations/:migrationId/execute', async (req, res) => {
  try {
    const { migrationId } = req.params;
    
    // 非同期実行
    saasMultiTenantService.executeMigration(migrationId)
      .catch(error => {
        console.error('Migration execution failed:', error);
      });

    res.json({
      success: true,
      message: '移行ジョブを開始しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'MIGRATION_START_ERROR',
        message: '移行ジョブの開始に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * GET /migrations/:migrationId/status
 * 移行ジョブの状況取得
 */
router.get('/migrations/:migrationId/status', async (req, res) => {
  try {
    const { migrationId } = req.params;
    
    const status = await saasMultiTenantService.getMigrationStatus(migrationId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'MIGRATION_STATUS_ERROR',
        message: '移行状況の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

// ===== テナント設定 =====

/**
 * GET /tenants/:tenantId/configuration
 * テナント設定の取得
 */
router.get('/:tenantId/configuration', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    const configuration = await saasMultiTenantService.getTenantConfiguration(tenantId);

    res.json({
      success: true,
      data: configuration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_FETCH_ERROR',
        message: 'テナント設定の取得に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

/**
 * PUT /tenants/:tenantId/configuration
 * テナント設定の更新
 */
router.put('/:tenantId/configuration', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const configUpdates = req.body;

    const configuration = await saasMultiTenantService.updateTenantConfiguration(
      tenantId,
      configUpdates
    );

    res.json({
      success: true,
      data: configuration,
      message: 'テナント設定を更新しました'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CONFIG_UPDATE_ERROR',
        message: 'テナント設定の更新に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }
    });
  }
});

export default router;