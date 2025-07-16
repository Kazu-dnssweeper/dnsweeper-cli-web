/**
 * マルチテナント 課金・クォータ管理
 * 利用量追跡、課金計算、制限管理
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type { MultiTenantCore } from './multi-tenant-core.js';
import type {
  TenantQuota,
  TenantBilling,
  Tenant,
} from './multi-tenant-types.js';

export class MultiTenantBillingManager extends EventEmitter {
  private logger: Logger;
  private tenantCore: MultiTenantCore;
  private quotas: Map<string, TenantQuota> = new Map();
  private billing: Map<string, TenantBilling> = new Map();
  private usageTracking: Map<string, UsageRecord[]> = new Map();
  private pricingPlans: Map<string, PricingPlan> = new Map();

  constructor(tenantCore: MultiTenantCore, logger?: Logger) {
    super();
    this.tenantCore = tenantCore;
    this.logger = logger || new Logger({ logLevel: 'info' });

    // デフォルトプランの初期化
    this.initializeDefaultPlans();

    // 定期的な利用量リセット
    this.startUsageResetScheduler();
  }

  // ===== クォータ管理 =====

  /**
   * テナントのクォータ初期化
   */
  initializeTenantQuota(tenantId: string): TenantQuota {
    const tenant = this.tenantCore.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`テナントが存在しません: ${tenantId}`);
    }

    const plan = this.pricingPlans.get(tenant.plan);
    if (!plan) {
      throw new Error(`プランが存在しません: ${tenant.plan}`);
    }

    const quota: TenantQuota = {
      tenantId,
      limits: {
        dnsRecords: plan.limits.dnsRecords,
        queriesPerMonth: plan.limits.queriesPerMonth,
        users: plan.limits.users,
        apiCallsPerHour: plan.limits.apiCallsPerHour,
        storageGB: plan.limits.storageGB,
        bandwidth: plan.limits.bandwidth,
      },
      current: {
        dnsRecords: 0,
        queriesThisMonth: 0,
        activeUsers: 0,
        apiCallsThisHour: 0,
        storageUsedGB: 0,
        bandwidthUsed: 0,
      },
      alerts: {
        enabled: true,
        thresholds: {
          warning: 80,
          critical: 95,
        },
        notifications: ['email', 'dashboard'],
      },
      resetDate: this.getNextResetDate(),
      lastUpdated: new Date(),
    };

    this.quotas.set(tenantId, quota);
    this.logger.info('テナントクォータを初期化しました', {
      tenantId,
      plan: tenant.plan,
      limits: quota.limits,
    });

    return quota;
  }

  /**
   * クォータの取得
   */
  getQuota(tenantId: string): TenantQuota | null {
    return this.quotas.get(tenantId) || null;
  }

  /**
   * 利用量の更新
   */
  async updateUsage(
    tenantId: string,
    usageType: keyof TenantQuota['current'],
    amount: number
  ): Promise<boolean> {
    const quota = this.quotas.get(tenantId);
    if (!quota) {
      this.logger.warn('クォータが見つかりません', { tenantId });
      return false;
    }

    const limitKey = usageType
      .replace('ThisMonth', 'PerMonth')
      .replace('ThisHour', 'PerHour') as keyof TenantQuota['limits'];
    const limit = quota.limits[limitKey] as number;
    const newUsage = quota.current[usageType] + amount;

    // 制限チェック
    if (newUsage > limit) {
      this.logger.warn('クォータ制限に達しました', {
        tenantId,
        usageType,
        current: quota.current[usageType],
        requested: amount,
        limit,
      });

      this.emit('quota-exceeded', {
        tenantId,
        usageType,
        current: quota.current[usageType],
        limit,
        requested: amount,
      });

      return false;
    }

    // 利用量更新
    quota.current[usageType] = newUsage;
    quota.lastUpdated = new Date();

    // 利用履歴の記録
    this.recordUsage(tenantId, usageType, amount);

    // アラートチェック
    const usagePercentage = (newUsage / limit) * 100;
    if (quota.alerts.enabled) {
      if (usagePercentage >= quota.alerts.thresholds.critical) {
        this.emit('quota-critical', {
          tenantId,
          usageType,
          percentage: usagePercentage,
          current: newUsage,
          limit,
        });
      } else if (usagePercentage >= quota.alerts.thresholds.warning) {
        this.emit('quota-warning', {
          tenantId,
          usageType,
          percentage: usagePercentage,
          current: newUsage,
          limit,
        });
      }
    }

    this.logger.debug('利用量を更新しました', {
      tenantId,
      usageType,
      amount,
      newUsage,
      percentage: usagePercentage,
    });

    return true;
  }

  /**
   * クォータのリセット
   */
  resetQuota(
    tenantId: string,
    resetTypes?: Array<keyof TenantQuota['current']>
  ): void {
    const quota = this.quotas.get(tenantId);
    if (!quota) {
      return;
    }

    const typesToReset = resetTypes || ['queriesThisMonth', 'apiCallsThisHour'];

    typesToReset.forEach(type => {
      quota.current[type] = 0;
    });

    quota.resetDate = this.getNextResetDate();
    quota.lastUpdated = new Date();

    this.logger.info('クォータをリセットしました', {
      tenantId,
      resetTypes: typesToReset,
      nextReset: quota.resetDate,
    });

    this.emit('quota-reset', { tenantId, resetTypes: typesToReset });
  }

  // ===== 課金管理 =====

  /**
   * テナントの課金情報初期化
   */
  initializeTenantBilling(
    tenantId: string,
    paymentMethod?: any
  ): TenantBilling {
    const tenant = this.tenantCore.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`テナントが存在しません: ${tenantId}`);
    }

    const plan = this.pricingPlans.get(tenant.plan);
    if (!plan) {
      throw new Error(`プランが存在しません: ${tenant.plan}`);
    }

    const now = new Date();
    const billing: TenantBilling = {
      tenantId,
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features,
      },
      subscription: {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: this.getNextBillingDate(now, plan.interval),
        cancelAtPeriodEnd: false,
        trialEnd:
          tenant.plan === 'free'
            ? undefined
            : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14日間の試用期間
      },
      paymentMethod: paymentMethod || {
        type: 'card',
        last4: '****',
      },
      invoices: [],
      usage: {
        period: now.toISOString().substring(0, 7), // YYYY-MM
        charges: [],
        total: 0,
        currency: plan.currency,
      },
    };

    this.billing.set(tenantId, billing);
    this.logger.info('テナント課金情報を初期化しました', {
      tenantId,
      plan: tenant.plan,
      subscriptionId: billing.subscription.id,
    });

    return billing;
  }

  /**
   * 課金情報の取得
   */
  getBilling(tenantId: string): TenantBilling | null {
    return this.billing.get(tenantId) || null;
  }

  /**
   * 請求書の生成
   */
  async generateInvoice(tenantId: string): Promise<Invoice | null> {
    const billing = this.billing.get(tenantId);
    const quota = this.quotas.get(tenantId);

    if (!billing || !quota) {
      return null;
    }

    const usage = this.calculateUsageCharges(tenantId);
    const basePrice = billing.plan.price;
    const usageCharges = usage.totalCharges;
    const totalAmount = basePrice + usageCharges;

    const invoice: Invoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      tenantId,
      amount: totalAmount,
      currency: billing.plan.currency,
      status: 'pending',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      items: [
        {
          description: `${billing.plan.name} Plan`,
          quantity: 1,
          unitPrice: basePrice,
          amount: basePrice,
        },
        ...usage.items,
      ],
      createdAt: new Date(),
      periodStart: billing.subscription.currentPeriodStart,
      periodEnd: billing.subscription.currentPeriodEnd,
    };

    // 請求書を履歴に追加
    billing.invoices.push({
      id: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate,
      url: `/invoices/${invoice.id}`,
    });

    this.logger.info('請求書を生成しました', {
      tenantId,
      invoiceId: invoice.id,
      amount: invoice.amount,
      currency: invoice.currency,
    });

    this.emit('invoice-generated', { invoice });
    return invoice;
  }

  /**
   * 支払い処理
   */
  async processPayment(tenantId: string, invoiceId: string): Promise<boolean> {
    const billing = this.billing.get(tenantId);
    if (!billing) {
      return false;
    }

    const invoice = billing.invoices.find(inv => inv.id === invoiceId);
    if (!invoice || invoice.status !== 'pending') {
      return false;
    }

    // 実際の支払い処理（モック）
    try {
      // ここで実際の決済プロバイダーのAPIを呼び出す
      await this.mockPaymentProcessing(invoice);

      invoice.status = 'paid';
      invoice.paidAt = new Date();

      this.logger.info('支払いが完了しました', {
        tenantId,
        invoiceId,
        amount: invoice.amount,
        currency: invoice.currency,
      });

      this.emit('payment-processed', { tenantId, invoiceId, invoice });
      return true;
    } catch (error) {
      invoice.status = 'failed';

      this.logger.error(
        `支払い処理に失敗しました: テナント=${tenantId}, 請求書=${invoiceId}, エラー=${error}`
      );

      this.emit('payment-failed', { tenantId, invoiceId, error });
      return false;
    }
  }

  // ===== 利用量追跡 =====

  /**
   * 利用量の記録
   */
  private recordUsage(
    tenantId: string,
    usageType: string,
    amount: number
  ): void {
    const records = this.usageTracking.get(tenantId) || [];

    records.push({
      timestamp: new Date(),
      type: usageType,
      amount,
      metadata: {},
    });

    // 古い記録を削除（30日以上）
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filteredRecords = records.filter(r => r.timestamp > thirtyDaysAgo);

    this.usageTracking.set(tenantId, filteredRecords);
  }

  /**
   * 従量課金の計算
   */
  private calculateUsageCharges(tenantId: string): {
    totalCharges: number;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  } {
    const quota = this.quotas.get(tenantId);
    const tenant = this.tenantCore.getTenant(tenantId);

    if (!quota || !tenant) {
      return { totalCharges: 0, items: [] };
    }

    const plan = this.pricingPlans.get(tenant.plan);
    if (!plan || !plan.overage) {
      return { totalCharges: 0, items: [] };
    }

    const items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }> = [];

    // DNSクエリの超過分
    if (quota.current.queriesThisMonth > quota.limits.queriesPerMonth) {
      const overage =
        quota.current.queriesThisMonth - quota.limits.queriesPerMonth;
      const overageBlocks = Math.ceil(overage / 1000); // 1000クエリ単位
      const amount = overageBlocks * plan.overage.perThousandQueries;

      items.push({
        description: 'Additional DNS Queries (per 1000)',
        quantity: overageBlocks,
        unitPrice: plan.overage.perThousandQueries,
        amount,
      });
    }

    // ストレージの超過分
    if (quota.current.storageUsedGB > quota.limits.storageGB) {
      const overage = quota.current.storageUsedGB - quota.limits.storageGB;
      const amount = overage * plan.overage.perGB;

      items.push({
        description: 'Additional Storage (per GB)',
        quantity: overage,
        unitPrice: plan.overage.perGB,
        amount,
      });
    }

    const totalCharges = items.reduce((sum, item) => sum + item.amount, 0);
    return { totalCharges, items };
  }

  // ===== プラン管理 =====

  /**
   * プランの変更
   */
  async changePlan(tenantId: string, newPlanId: string): Promise<boolean> {
    const tenant = this.tenantCore.getTenant(tenantId);
    const billing = this.billing.get(tenantId);

    if (!tenant || !billing) {
      return false;
    }

    const newPlan = this.pricingPlans.get(newPlanId);
    if (!newPlan) {
      this.logger.warn('無効なプランID', { tenantId, newPlanId });
      return false;
    }

    // 現在の請求期間の終了まで待つか、即座に変更するか
    const effectiveDate = billing.subscription.cancelAtPeriodEnd
      ? billing.subscription.currentPeriodEnd
      : new Date();

    // テナントのプランを更新
    await this.tenantCore.updateTenant(tenantId, { plan: newPlanId as any });

    // 課金情報を更新
    billing.plan = {
      id: newPlan.id,
      name: newPlan.name,
      price: newPlan.price,
      currency: newPlan.currency,
      interval: newPlan.interval,
      features: newPlan.features,
    };

    // クォータを再初期化
    this.initializeTenantQuota(tenantId);

    this.logger.info('プランを変更しました', {
      tenantId,
      oldPlan: tenant.plan,
      newPlan: newPlanId,
      effectiveDate,
    });

    this.emit('plan-changed', {
      tenantId,
      oldPlan: tenant.plan,
      newPlan: newPlanId,
      effectiveDate,
    });

    return true;
  }

  // ===== ヘルパーメソッド =====

  /**
   * デフォルトプランの初期化
   */
  private initializeDefaultPlans(): void {
    const plans: PricingPlan[] = [
      {
        id: 'free',
        name: 'Free Plan',
        price: 0,
        currency: 'USD',
        interval: 'monthly',
        features: ['基本DNS管理', 'コミュニティサポート'],
        limits: {
          dnsRecords: 100,
          queriesPerMonth: 10000,
          users: 3,
          apiCallsPerHour: 100,
          storageGB: 1,
          bandwidth: 10,
        },
      },
      {
        id: 'basic',
        name: 'Basic Plan',
        price: 29,
        currency: 'USD',
        interval: 'monthly',
        features: ['高度なDNS管理', 'メールサポート', 'API アクセス'],
        limits: {
          dnsRecords: 1000,
          queriesPerMonth: 100000,
          users: 10,
          apiCallsPerHour: 1000,
          storageGB: 10,
          bandwidth: 100,
        },
        overage: {
          perThousandQueries: 0.1,
          perGB: 0.5,
        },
      },
      {
        id: 'professional',
        name: 'Professional Plan',
        price: 99,
        currency: 'USD',
        interval: 'monthly',
        features: ['エンタープライズ機能', '優先サポート', 'SLA保証'],
        limits: {
          dnsRecords: 10000,
          queriesPerMonth: 1000000,
          users: 50,
          apiCallsPerHour: 10000,
          storageGB: 100,
          bandwidth: 1000,
        },
        overage: {
          perThousandQueries: 0.05,
          perGB: 0.3,
        },
      },
      {
        id: 'enterprise',
        name: 'Enterprise Plan',
        price: 499,
        currency: 'USD',
        interval: 'monthly',
        features: [
          '無制限機能',
          '専任サポート',
          'カスタムSLA',
          'オンプレミス対応',
        ],
        limits: {
          dnsRecords: 100000,
          queriesPerMonth: 10000000,
          users: 1000,
          apiCallsPerHour: 100000,
          storageGB: 1000,
          bandwidth: 10000,
        },
        overage: {
          perThousandQueries: 0.02,
          perGB: 0.1,
        },
      },
    ];

    plans.forEach(plan => {
      this.pricingPlans.set(plan.id, plan);
    });
  }

  /**
   * 次のリセット日時を取得
   */
  private getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  /**
   * 次の請求日を取得
   */
  private getNextBillingDate(from: Date, interval: 'monthly' | 'yearly'): Date {
    const next = new Date(from);
    if (interval === 'monthly') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setFullYear(next.getFullYear() + 1);
    }
    return next;
  }

  /**
   * モック決済処理
   */
  private async mockPaymentProcessing(invoice: any): Promise<void> {
    // 実際の実装では決済プロバイダーのAPIを呼び出す
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) {
          // 90%の成功率
          resolve();
        } else {
          reject(new Error('Payment declined'));
        }
      }, 1000);
    });
  }

  /**
   * 利用量リセットスケジューラー
   */
  private startUsageResetScheduler(): void {
    // 毎時0分にAPIコール数をリセット
    const resetHourly = () => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);

      const msUntilNextHour = nextHour.getTime() - now.getTime();

      setTimeout(() => {
        this.quotas.forEach((quota, tenantId) => {
          this.resetQuota(tenantId, ['apiCallsThisHour']);
        });
        resetHourly();
      }, msUntilNextHour);
    };

    // 毎月1日に月次利用量をリセット
    const resetMonthly = () => {
      const now = new Date();
      const nextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
        0,
        0,
        0
      );

      const msUntilNextMonth = nextMonth.getTime() - now.getTime();

      setTimeout(() => {
        this.quotas.forEach((quota, tenantId) => {
          this.resetQuota(tenantId, ['queriesThisMonth']);
        });
        resetMonthly();
      }, msUntilNextMonth);
    };

    resetHourly();
    resetMonthly();
  }

  /**
   * 統計情報の取得
   */
  getStatistics(): {
    totalTenants: number;
    tenantsByPlan: Record<string, number>;
    totalRevenue: number;
    averageRevenuePerTenant: number;
    quotaUtilization: {
      queries: number;
      storage: number;
      users: number;
    };
  } {
    const tenantsByPlan: Record<string, number> = {};
    let totalRevenue = 0;
    let totalQueryUsage = 0;
    let totalQueryLimit = 0;
    let totalStorageUsage = 0;
    let totalStorageLimit = 0;
    let totalUserUsage = 0;
    let totalUserLimit = 0;

    this.billing.forEach((billing, tenantId) => {
      tenantsByPlan[billing.plan.id] =
        (tenantsByPlan[billing.plan.id] || 0) + 1;
      totalRevenue += billing.plan.price;

      const quota = this.quotas.get(tenantId);
      if (quota) {
        totalQueryUsage += quota.current.queriesThisMonth;
        totalQueryLimit += quota.limits.queriesPerMonth;
        totalStorageUsage += quota.current.storageUsedGB;
        totalStorageLimit += quota.limits.storageGB;
        totalUserUsage += quota.current.activeUsers;
        totalUserLimit += quota.limits.users;
      }
    });

    const totalTenants = this.billing.size;
    const averageRevenuePerTenant =
      totalTenants > 0 ? totalRevenue / totalTenants : 0;

    return {
      totalTenants,
      tenantsByPlan,
      totalRevenue,
      averageRevenuePerTenant,
      quotaUtilization: {
        queries:
          totalQueryLimit > 0 ? (totalQueryUsage / totalQueryLimit) * 100 : 0,
        storage:
          totalStorageLimit > 0
            ? (totalStorageUsage / totalStorageLimit) * 100
            : 0,
        users: totalUserLimit > 0 ? (totalUserUsage / totalUserLimit) * 100 : 0,
      },
    };
  }

  /**
   * システム終了処理
   */
  shutdown(): void {
    this.removeAllListeners();
    this.logger.info('マルチテナント課金管理システムを終了しました');
  }
}

// 内部型定義

interface UsageRecord {
  timestamp: Date;
  type: string;
  amount: number;
  metadata: Record<string, any>;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: TenantQuota['limits'];
  overage?: {
    perThousandQueries: number;
    perGB: number;
  };
}

interface Invoice {
  id: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  dueDate: Date;
  paidAt?: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  createdAt: Date;
  periodStart: Date;
  periodEnd: Date;
}
