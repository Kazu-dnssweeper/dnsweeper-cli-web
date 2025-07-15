/**
 * DNSweeper ライセンス・課金管理サービス
 * フリーミアム・エンタープライズライセンス・従量課金・サブスクリプション・使用量監視
 */

import {
  LicenseType,
  SubscriptionPlan,
  BillingCycle,
  UsageMetrics,
  Invoice,
  Payment,
  LicenseQuota,
  PricingTier,
  BillingHistory,
  UsageAlert
} from '../types/license-billing';

/**
 * ライセンスタイプ
 */
export type LicenseType = 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';

/**
 * サブスクリプションプラン
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  licenseType: LicenseType;
  billingCycle: BillingCycle;
  pricing: {
    basePrice: number;
    currency: string;
    pricePerUser?: number;
    pricePerDnsRecord?: number;
    pricePerApiCall?: number;
  };
  quotas: LicenseQuota;
  features: PlanFeature[];
  restrictions: PlanRestriction[];
  trialPeriod?: {
    durationDays: number;
    fullFeaturesAccess: boolean;
  };
  discounts: PricingDiscount[];
  addOns: AddOnService[];
}

export type BillingCycle = 'monthly' | 'quarterly' | 'annually' | 'usage_based' | 'one_time';

/**
 * ライセンス制限・クォータ
 */
export interface LicenseQuota {
  maxUsers: number;
  maxDnsRecords: number;
  maxApiCallsPerMonth: number;
  maxDataTransferGB: number;
  maxZones: number;
  maxSubdomains: number;
  maxBackupRetentionDays: number;
  maxConcurrentSessions: number;
  maxIntegrations: number;
  storageGB: number;
  supportLevel: 'community' | 'standard' | 'priority' | 'premium';
  sla: {
    uptime: number; // percentage
    responseTime: number; // hours
    resolutionTime: number; // hours
  };
}

/**
 * プラン機能
 */
export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'advanced' | 'enterprise' | 'addon';
  enabled: boolean;
  limitations?: Record<string, any>;
}

/**
 * プラン制限
 */
export interface PlanRestriction {
  type: 'feature_disabled' | 'usage_limit' | 'time_limit' | 'ip_restriction' | 'geo_restriction';
  target: string;
  value: any;
  description: string;
}

/**
 * 価格割引
 */
export interface PricingDiscount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed_amount' | 'free_months';
  value: number;
  conditions: {
    minimumUsers?: number;
    minimumCommitmentMonths?: number;
    customerType?: 'new' | 'existing' | 'nonprofit' | 'education';
    region?: string[];
  };
  validUntil?: Date;
  stackable: boolean;
}

/**
 * アドオンサービス
 */
export interface AddOnService {
  id: string;
  name: string;
  description: string;
  pricing: {
    type: 'per_user' | 'per_record' | 'per_call' | 'fixed';
    price: number;
    currency: string;
  };
  quotas: Partial<LicenseQuota>;
  dependencies: string[]; // 必要なベースプラン
}

/**
 * 使用量メトリクス
 */
export interface UsageMetrics {
  accountId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    activeUsers: number;
    dnsRecords: number;
    apiCalls: number;
    dataTransferGB: number;
    zones: number;
    subdomains: number;
    sessionsCreated: number;
    integrationsActive: number;
    storageUsedGB: number;
  };
  breakdown: {
    daily: DailyUsage[];
    byFeature: FeatureUsage[];
    byUser: UserUsage[];
    byZone: ZoneUsage[];
  };
  projectedUsage: {
    nextMonth: Partial<UsageMetrics['metrics']>;
    confidence: number;
  };
}

export interface DailyUsage {
  date: Date;
  metrics: Partial<UsageMetrics['metrics']>;
}

export interface FeatureUsage {
  featureId: string;
  featureName: string;
  usageCount: number;
  cost: number;
}

export interface UserUsage {
  userId: string;
  userName: string;
  metrics: Partial<UsageMetrics['metrics']>;
  cost: number;
}

export interface ZoneUsage {
  zoneId: string;
  zoneName: string;
  metrics: Partial<UsageMetrics['metrics']>;
  cost: number;
}

/**
 * 請求書
 */
export interface Invoice {
  id: string;
  accountId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  period: {
    start: Date;
    end: Date;
  };
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxes: TaxItem[];
  discounts: DiscountItem[];
  total: number;
  paymentTerms: string;
  notes?: string;
  metadata: {
    billingAddress: BillingAddress;
    taxId?: string;
    purchaseOrder?: string;
  };
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  period?: {
    start: Date;
    end: Date;
  };
  metadata: {
    planId?: string;
    addOnId?: string;
    usageType?: string;
  };
}

export interface TaxItem {
  name: string;
  rate: number;
  amount: number;
  jurisdiction: string;
}

export interface DiscountItem {
  name: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  amount: number;
}

export interface BillingAddress {
  company: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * 支払い情報
 */
export interface Payment {
  id: string;
  invoiceId: string;
  accountId: string;
  amount: number;
  currency: string;
  method: 'credit_card' | 'bank_transfer' | 'check' | 'ach' | 'wire' | 'crypto';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  processedAt?: Date;
  failureReason?: string;
  metadata: {
    paymentProvider: string;
    last4?: string;
    cardType?: string;
    bankName?: string;
  };
}

/**
 * 使用量アラート
 */
export interface UsageAlert {
  id: string;
  accountId: string;
  type: 'quota_exceeded' | 'approaching_limit' | 'unusual_usage' | 'cost_threshold';
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  threshold: number;
  currentValue: number;
  message: string;
  triggeredAt: Date;
  acknowledged: boolean;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'upgrade_plan' | 'purchase_addon' | 'optimize_usage' | 'contact_support';
  description: string;
  url?: string;
  estimatedCost?: number;
}

/**
 * ライセンス・課金管理サービス
 */
export class LicenseBillingService {
  private subscriptionPlans: Map<string, SubscriptionPlan> = new Map();
  private activeSubscriptions: Map<string, AccountSubscription> = new Map();
  private usageTracking: Map<string, UsageMetrics> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private payments: Map<string, Payment> = new Map();

  constructor() {
    this.initializeSubscriptionPlans();
    this.setupUsageTracking();
    this.startBillingCycle();
  }

  // ===== ライセンス管理 =====

  /**
   * サブスクリプションプランの作成
   */
  async createSubscriptionPlan(planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const plan: SubscriptionPlan = {
      id: this.generatePlanId(),
      name: planData.name!,
      licenseType: planData.licenseType!,
      billingCycle: planData.billingCycle!,
      pricing: planData.pricing!,
      quotas: planData.quotas!,
      features: planData.features || [],
      restrictions: planData.restrictions || [],
      trialPeriod: planData.trialPeriod,
      discounts: planData.discounts || [],
      addOns: planData.addOns || []
    };

    this.subscriptionPlans.set(plan.id, plan);
    return plan;
  }

  /**
   * アカウントのサブスクリプション登録
   */
  async subscribeAccount(
    accountId: string,
    planId: string,
    options: SubscriptionOptions
  ): Promise<AccountSubscription> {
    const plan = this.subscriptionPlans.get(planId);
    if (!plan) {
      throw new Error(`プランが見つかりません: ${planId}`);
    }

    // 既存のサブスクリプションチェック
    const existingSubscription = this.activeSubscriptions.get(accountId);
    if (existingSubscription && existingSubscription.status === 'active') {
      throw new Error('アクティブなサブスクリプションが既に存在します');
    }

    const subscription: AccountSubscription = {
      id: this.generateSubscriptionId(),
      accountId,
      planId,
      status: options.startTrial ? 'trial' : 'active',
      startDate: new Date(),
      endDate: this.calculateEndDate(plan.billingCycle, options.startTrial ? plan.trialPeriod?.durationDays : undefined),
      billingCycle: plan.billingCycle,
      pricing: this.calculateSubscriptionPricing(plan, options),
      quotas: { ...plan.quotas },
      addOns: options.addOns || [],
      customizations: options.customizations || {},
      autoRenew: options.autoRenew !== false,
      paymentMethod: options.paymentMethod,
      billingAddress: options.billingAddress,
      trialUsed: options.startTrial || false,
      metadata: {
        salesPerson: options.salesPerson,
        referralCode: options.referralCode,
        contractTerms: options.contractTerms
      }
    };

    this.activeSubscriptions.set(accountId, subscription);

    // 使用量追跡開始
    await this.initializeUsageTracking(accountId);

    // 初回請求書生成（トライアルでない場合）
    if (!options.startTrial) {
      await this.generateInvoice(accountId);
    }

    return subscription;
  }

  /**
   * ライセンス制限の確認
   */
  async checkLicenseLimit(
    accountId: string,
    resource: keyof LicenseQuota,
    requestedAmount: number = 1
  ): Promise<LicenseLimitResult> {
    const subscription = this.activeSubscriptions.get(accountId);
    if (!subscription) {
      return {
        allowed: false,
        reason: 'アクティブなサブスクリプションがありません',
        currentUsage: 0,
        limit: 0,
        remaining: 0
      };
    }

    const currentUsage = await this.getCurrentUsage(accountId, resource);
    const limit = subscription.quotas[resource] as number;
    const remaining = Math.max(0, limit - currentUsage);

    const allowed = currentUsage + requestedAmount <= limit;

    return {
      allowed,
      reason: allowed ? '' : `${resource}の制限を超過します (${currentUsage + requestedAmount}/${limit})`,
      currentUsage,
      limit,
      remaining,
      overage: allowed ? 0 : (currentUsage + requestedAmount) - limit
    };
  }

  /**
   * 機能アクセス権の確認
   */
  async checkFeatureAccess(accountId: string, featureId: string): Promise<FeatureAccessResult> {
    const subscription = this.activeSubscriptions.get(accountId);
    if (!subscription) {
      return {
        hasAccess: false,
        reason: 'アクティブなサブスクリプションがありません'
      };
    }

    const plan = this.subscriptionPlans.get(subscription.planId);
    if (!plan) {
      return {
        hasAccess: false,
        reason: 'プラン情報が見つかりません'
      };
    }

    // プラン機能確認
    const feature = plan.features.find(f => f.id === featureId);
    if (!feature || !feature.enabled) {
      return {
        hasAccess: false,
        reason: 'この機能はご利用のプランに含まれていません',
        upgradeOptions: this.getUpgradeOptions(accountId, featureId)
      };
    }

    // 制限確認
    const restriction = plan.restrictions.find(r => r.target === featureId);
    if (restriction) {
      const restrictionCheck = await this.evaluateRestriction(restriction, accountId);
      if (!restrictionCheck.allowed) {
        return {
          hasAccess: false,
          reason: restrictionCheck.reason,
          limitations: feature.limitations
        };
      }
    }

    return {
      hasAccess: true,
      limitations: feature.limitations
    };
  }

  // ===== 使用量追跡 =====

  /**
   * 使用量の記録
   */
  async recordUsage(
    accountId: string,
    usage: {
      type: keyof UsageMetrics['metrics'];
      amount: number;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const currentUsage = this.usageTracking.get(accountId);
    if (!currentUsage) {
      await this.initializeUsageTracking(accountId);
    }

    // 使用量更新
    await this.updateUsageMetrics(accountId, usage);

    // リアルタイム制限チェック
    await this.checkRealtimeLimits(accountId, usage);

    // 使用量アラートチェック
    await this.checkUsageAlerts(accountId);
  }

  /**
   * 使用量レポートの生成
   */
  async generateUsageReport(
    accountId: string,
    period: { start: Date; end: Date },
    format: 'summary' | 'detailed' | 'raw'
  ): Promise<UsageReport> {
    const usage = await this.getUsageForPeriod(accountId, period);
    const subscription = this.activeSubscriptions.get(accountId);
    const plan = subscription ? this.subscriptionPlans.get(subscription.planId) : null;

    const report: UsageReport = {
      accountId,
      period,
      subscription: subscription ? {
        planName: plan?.name || 'Unknown',
        licenseType: plan?.licenseType || 'free',
        quotas: subscription.quotas
      } : null,
      usage: usage.metrics,
      costs: await this.calculateUsageCosts(accountId, usage),
      efficiency: this.calculateUsageEfficiency(usage, subscription?.quotas),
      trends: await this.calculateUsageTrends(accountId, period),
      recommendations: this.generateUsageRecommendations(usage, subscription)
    };

    return report;
  }

  // ===== 課金・請求 =====

  /**
   * 請求書の生成
   */
  async generateInvoice(accountId: string): Promise<Invoice> {
    const subscription = this.activeSubscriptions.get(accountId);
    if (!subscription) {
      throw new Error('アクティブなサブスクリプションがありません');
    }

    const plan = this.subscriptionPlans.get(subscription.planId);
    if (!plan) {
      throw new Error('プラン情報が見つかりません');
    }

    // 請求期間の計算
    const period = this.calculateBillingPeriod(subscription);
    
    // 使用量の取得
    const usage = await this.getUsageForPeriod(accountId, period);

    // 請求項目の生成
    const lineItems: InvoiceLineItem[] = [];

    // ベースプラン料金
    lineItems.push({
      id: this.generateLineItemId(),
      description: `${plan.name} - ${this.formatPeriod(period)}`,
      quantity: 1,
      unitPrice: subscription.pricing.basePrice,
      totalPrice: subscription.pricing.basePrice,
      period,
      metadata: { planId: subscription.planId }
    });

    // 従量課金項目
    if (subscription.pricing.pricePerUser && usage.metrics.activeUsers > 0) {
      const userOverage = Math.max(0, usage.metrics.activeUsers - (plan.quotas.maxUsers || 0));
      if (userOverage > 0) {
        lineItems.push({
          id: this.generateLineItemId(),
          description: `追加ユーザー (${userOverage} users)`,
          quantity: userOverage,
          unitPrice: subscription.pricing.pricePerUser,
          totalPrice: userOverage * subscription.pricing.pricePerUser,
          period,
          metadata: { usageType: 'users' }
        });
      }
    }

    // アドオン料金
    for (const addOn of subscription.addOns) {
      const addOnService = plan.addOns.find(a => a.id === addOn.id);
      if (addOnService) {
        lineItems.push({
          id: this.generateLineItemId(),
          description: addOnService.name,
          quantity: addOn.quantity,
          unitPrice: addOnService.pricing.price,
          totalPrice: addOn.quantity * addOnService.pricing.price,
          period,
          metadata: { addOnId: addOn.id }
        });
      }
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // 税金計算
    const taxes = await this.calculateTaxes(accountId, subtotal);
    
    // 割引計算
    const discounts = await this.calculateDiscounts(accountId, subscription, subtotal);

    const total = subtotal + taxes.reduce((sum, tax) => sum + tax.amount, 0) - discounts.reduce((sum, discount) => sum + discount.amount, 0);

    const invoice: Invoice = {
      id: this.generateInvoiceId(),
      accountId,
      invoiceNumber: this.generateInvoiceNumber(),
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      period,
      status: 'sent',
      currency: subscription.pricing.currency,
      lineItems,
      subtotal,
      taxes,
      discounts,
      total,
      paymentTerms: 'Net 30',
      metadata: {
        billingAddress: subscription.billingAddress,
        taxId: subscription.metadata.taxId
      }
    };

    this.invoices.set(invoice.id, invoice);

    // 請求書送信
    await this.sendInvoice(invoice);

    return invoice;
  }

  /**
   * 支払い処理
   */
  async processPayment(
    invoiceId: string,
    paymentMethod: PaymentMethod,
    amount?: number
  ): Promise<Payment> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error('請求書が見つかりません');
    }

    const paymentAmount = amount || invoice.total;
    
    const payment: Payment = {
      id: this.generatePaymentId(),
      invoiceId,
      accountId: invoice.accountId,
      amount: paymentAmount,
      currency: invoice.currency,
      method: paymentMethod.type,
      status: 'processing',
      metadata: {
        paymentProvider: paymentMethod.provider,
        last4: paymentMethod.last4,
        cardType: paymentMethod.cardType
      }
    };

    this.payments.set(payment.id, payment);

    try {
      // 支払い処理実行
      const result = await this.executePayment(payment, paymentMethod);
      
      payment.status = 'completed';
      payment.transactionId = result.transactionId;
      payment.processedAt = new Date();

      // 請求書ステータス更新
      invoice.status = 'paid';

      // サブスクリプション更新
      await this.updateSubscriptionAfterPayment(invoice.accountId, payment);

    } catch (error) {
      payment.status = 'failed';
      payment.failureReason = error instanceof Error ? error.message : '不明なエラー';
      
      // 失敗通知
      await this.notifyPaymentFailure(payment);
    }

    return payment;
  }

  // ===== プライベートメソッド =====

  private initializeSubscriptionPlans(): void {
    // フリープラン
    this.subscriptionPlans.set('free', {
      id: 'free',
      name: 'Free',
      licenseType: 'free',
      billingCycle: 'monthly',
      pricing: {
        basePrice: 0,
        currency: 'USD'
      },
      quotas: {
        maxUsers: 1,
        maxDnsRecords: 100,
        maxApiCallsPerMonth: 1000,
        maxDataTransferGB: 1,
        maxZones: 1,
        maxSubdomains: 10,
        maxBackupRetentionDays: 7,
        maxConcurrentSessions: 1,
        maxIntegrations: 0,
        storageGB: 0.1,
        supportLevel: 'community',
        sla: { uptime: 99.0, responseTime: 72, resolutionTime: 168 }
      },
      features: [
        { id: 'basic_dns', name: 'Basic DNS Management', description: '', category: 'core', enabled: true },
        { id: 'web_ui', name: 'Web Interface', description: '', category: 'core', enabled: true }
      ],
      restrictions: [
        { type: 'feature_disabled', target: 'api_access', value: true, description: 'API access not available' },
        { type: 'feature_disabled', target: 'advanced_analytics', value: true, description: 'Advanced analytics not available' }
      ],
      discounts: [],
      addOns: []
    });

    // スタータープラン
    this.subscriptionPlans.set('starter', {
      id: 'starter',
      name: 'Starter',
      licenseType: 'starter',
      billingCycle: 'monthly',
      pricing: {
        basePrice: 29,
        currency: 'USD',
        pricePerUser: 5
      },
      quotas: {
        maxUsers: 5,
        maxDnsRecords: 1000,
        maxApiCallsPerMonth: 10000,
        maxDataTransferGB: 10,
        maxZones: 5,
        maxSubdomains: 100,
        maxBackupRetentionDays: 30,
        maxConcurrentSessions: 5,
        maxIntegrations: 2,
        storageGB: 1,
        supportLevel: 'standard',
        sla: { uptime: 99.5, responseTime: 24, resolutionTime: 72 }
      },
      features: [
        { id: 'basic_dns', name: 'Basic DNS Management', description: '', category: 'core', enabled: true },
        { id: 'web_ui', name: 'Web Interface', description: '', category: 'core', enabled: true },
        { id: 'api_access', name: 'API Access', description: '', category: 'core', enabled: true },
        { id: 'basic_analytics', name: 'Basic Analytics', description: '', category: 'core', enabled: true }
      ],
      restrictions: [],
      trialPeriod: { durationDays: 14, fullFeaturesAccess: true },
      discounts: [
        {
          id: 'annual_discount',
          name: 'Annual Discount',
          type: 'percentage',
          value: 20,
          conditions: { minimumCommitmentMonths: 12 },
          stackable: false
        }
      ],
      addOns: []
    });

    // プロフェッショナルプラン
    this.subscriptionPlans.set('professional', {
      id: 'professional',
      name: 'Professional',
      licenseType: 'professional',
      billingCycle: 'monthly',
      pricing: {
        basePrice: 99,
        currency: 'USD',
        pricePerUser: 10,
        pricePerApiCall: 0.001
      },
      quotas: {
        maxUsers: 25,
        maxDnsRecords: 10000,
        maxApiCallsPerMonth: 100000,
        maxDataTransferGB: 100,
        maxZones: 25,
        maxSubdomains: 1000,
        maxBackupRetentionDays: 90,
        maxConcurrentSessions: 25,
        maxIntegrations: 10,
        storageGB: 10,
        supportLevel: 'priority',
        sla: { uptime: 99.9, responseTime: 12, resolutionTime: 48 }
      },
      features: [
        { id: 'basic_dns', name: 'Basic DNS Management', description: '', category: 'core', enabled: true },
        { id: 'advanced_dns', name: 'Advanced DNS Features', description: '', category: 'advanced', enabled: true },
        { id: 'web_ui', name: 'Web Interface', description: '', category: 'core', enabled: true },
        { id: 'api_access', name: 'API Access', description: '', category: 'core', enabled: true },
        { id: 'advanced_analytics', name: 'Advanced Analytics', description: '', category: 'advanced', enabled: true },
        { id: 'automation', name: 'Automation Features', description: '', category: 'advanced', enabled: true }
      ],
      restrictions: [],
      trialPeriod: { durationDays: 30, fullFeaturesAccess: true },
      discounts: [
        {
          id: 'annual_discount',
          name: 'Annual Discount',
          type: 'percentage',
          value: 25,
          conditions: { minimumCommitmentMonths: 12 },
          stackable: false
        }
      ],
      addOns: [
        {
          id: 'premium_support',
          name: 'Premium Support',
          description: '24/7 priority support with dedicated account manager',
          pricing: { type: 'fixed', price: 500, currency: 'USD' },
          quotas: { supportLevel: 'premium' },
          dependencies: []
        }
      ]
    });

    // エンタープライズプラン
    this.subscriptionPlans.set('enterprise', {
      id: 'enterprise',
      name: 'Enterprise',
      licenseType: 'enterprise',
      billingCycle: 'annually',
      pricing: {
        basePrice: 2999,
        currency: 'USD',
        pricePerUser: 25
      },
      quotas: {
        maxUsers: -1, // unlimited
        maxDnsRecords: -1,
        maxApiCallsPerMonth: -1,
        maxDataTransferGB: -1,
        maxZones: -1,
        maxSubdomains: -1,
        maxBackupRetentionDays: 365,
        maxConcurrentSessions: -1,
        maxIntegrations: -1,
        storageGB: 1000,
        supportLevel: 'premium',
        sla: { uptime: 99.99, responseTime: 4, resolutionTime: 24 }
      },
      features: [
        { id: 'basic_dns', name: 'Basic DNS Management', description: '', category: 'core', enabled: true },
        { id: 'advanced_dns', name: 'Advanced DNS Features', description: '', category: 'advanced', enabled: true },
        { id: 'enterprise_dns', name: 'Enterprise DNS Features', description: '', category: 'enterprise', enabled: true },
        { id: 'web_ui', name: 'Web Interface', description: '', category: 'core', enabled: true },
        { id: 'api_access', name: 'API Access', description: '', category: 'core', enabled: true },
        { id: 'advanced_analytics', name: 'Advanced Analytics', description: '', category: 'advanced', enabled: true },
        { id: 'enterprise_analytics', name: 'Enterprise Analytics', description: '', category: 'enterprise', enabled: true },
        { id: 'automation', name: 'Automation Features', description: '', category: 'advanced', enabled: true },
        { id: 'sso', name: 'Single Sign-On', description: '', category: 'enterprise', enabled: true },
        { id: 'compliance', name: 'Compliance Features', description: '', category: 'enterprise', enabled: true }
      ],
      restrictions: [],
      trialPeriod: { durationDays: 30, fullFeaturesAccess: true },
      discounts: [
        {
          id: 'volume_discount',
          name: 'Volume Discount',
          type: 'percentage',
          value: 15,
          conditions: { minimumUsers: 100 },
          stackable: true
        }
      ],
      addOns: [
        {
          id: 'professional_services',
          name: 'Professional Services',
          description: 'Implementation and consulting services',
          pricing: { type: 'fixed', price: 5000, currency: 'USD' },
          quotas: {},
          dependencies: []
        }
      ]
    });
  }

  private setupUsageTracking(): void {
    // リアルタイム使用量追跡のセットアップ
    setInterval(async () => {
      for (const accountId of this.activeSubscriptions.keys()) {
        await this.collectUsageMetrics(accountId);
      }
    }, 60000); // 1分ごと
  }

  private startBillingCycle(): void {
    // 日次請求処理
    setInterval(async () => {
      await this.processDailyBilling();
    }, 24 * 60 * 60 * 1000); // 24時間ごと
  }

  // ヘルパーメソッド（プレースホルダー）
  private generatePlanId(): string { return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
  private generateSubscriptionId(): string { return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
  private generateInvoiceId(): string { return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
  private generatePaymentId(): string { return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
  private generateLineItemId(): string { return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
  private generateInvoiceNumber(): string { return `INV-${Date.now()}`; }

  // その他のプレースホルダーメソッド
  private calculateEndDate(cycle: BillingCycle, trialDays?: number): Date {
    const now = new Date();
    if (trialDays) {
      return new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    }
    switch (cycle) {
      case 'monthly': return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case 'quarterly': return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      case 'annually': return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      default: return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  private calculateSubscriptionPricing(plan: SubscriptionPlan, options: SubscriptionOptions): any {
    return { ...plan.pricing };
  }

  private async initializeUsageTracking(accountId: string): Promise<void> {
    const now = new Date();
    const usage: UsageMetrics = {
      accountId,
      period: { start: now, end: now },
      metrics: {
        activeUsers: 0,
        dnsRecords: 0,
        apiCalls: 0,
        dataTransferGB: 0,
        zones: 0,
        subdomains: 0,
        sessionsCreated: 0,
        integrationsActive: 0,
        storageUsedGB: 0
      },
      breakdown: { daily: [], byFeature: [], byUser: [], byZone: [] },
      projectedUsage: { nextMonth: {}, confidence: 0 }
    };
    this.usageTracking.set(accountId, usage);
  }

  private async getCurrentUsage(accountId: string, resource: keyof LicenseQuota): Promise<number> {
    const usage = this.usageTracking.get(accountId);
    if (!usage) return 0;

    switch (resource) {
      case 'maxUsers': return usage.metrics.activeUsers;
      case 'maxDnsRecords': return usage.metrics.dnsRecords;
      case 'maxApiCallsPerMonth': return usage.metrics.apiCalls;
      case 'storageGB': return usage.metrics.storageUsedGB;
      default: return 0;
    }
  }
}

// 型定義
interface AccountSubscription {
  id: string;
  accountId: string;
  planId: string;
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';
  startDate: Date;
  endDate: Date;
  billingCycle: BillingCycle;
  pricing: {
    basePrice: number;
    currency: string;
    pricePerUser?: number;
    pricePerDnsRecord?: number;
    pricePerApiCall?: number;
  };
  quotas: LicenseQuota;
  addOns: Array<{ id: string; quantity: number }>;
  customizations: Record<string, any>;
  autoRenew: boolean;
  paymentMethod: PaymentMethod;
  billingAddress: BillingAddress;
  trialUsed: boolean;
  metadata: {
    salesPerson?: string;
    referralCode?: string;
    contractTerms?: string;
    taxId?: string;
  };
}

interface SubscriptionOptions {
  startTrial?: boolean;
  autoRenew?: boolean;
  addOns?: Array<{ id: string; quantity: number }>;
  customizations?: Record<string, any>;
  paymentMethod: PaymentMethod;
  billingAddress: BillingAddress;
  salesPerson?: string;
  referralCode?: string;
  contractTerms?: string;
}

interface PaymentMethod {
  type: 'credit_card' | 'bank_transfer' | 'check' | 'ach' | 'wire';
  provider: string;
  last4?: string;
  cardType?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
}

interface LicenseLimitResult {
  allowed: boolean;
  reason: string;
  currentUsage: number;
  limit: number;
  remaining: number;
  overage?: number;
}

interface FeatureAccessResult {
  hasAccess: boolean;
  reason?: string;
  limitations?: Record<string, any>;
  upgradeOptions?: Array<{
    planId: string;
    planName: string;
    price: number;
  }>;
}

interface UsageReport {
  accountId: string;
  period: { start: Date; end: Date };
  subscription: {
    planName: string;
    licenseType: LicenseType;
    quotas: LicenseQuota;
  } | null;
  usage: UsageMetrics['metrics'];
  costs: {
    subscription: number;
    overages: number;
    addOns: number;
    total: number;
  };
  efficiency: {
    utilizationPercentage: number;
    wastedCapacity: number;
    recommendations: string[];
  };
  trends: {
    growth: number;
    seasonal: any;
    predictions: any;
  };
  recommendations: string[];
}

/**
 * グローバルサービスインスタンス
 */
export const licenseBillingService = new LicenseBillingService();