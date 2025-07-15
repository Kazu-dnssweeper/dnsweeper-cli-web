/**
 * DNSweeper SaaS・マルチテナント型定義
 * テナント分離・データ分離・スケーラビリティ・セキュリティ・課金・管理
 */

/**
 * テナント分離レベル
 */
export type TenantIsolationLevel = 'shared_database' | 'separate_schema' | 'separate_database' | 'separate_instance';

/**
 * 課金モデル
 */
export type BillingModel = 'per_user' | 'per_domain' | 'per_query' | 'flat_rate' | 'custom';

/**
 * テナント層
 */
export type TenantTier = 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';

/**
 * テナント情報
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string; // URL フレンドリーな識別子
  displayName: string;
  description?: string;
  domain?: string; // カスタムドメイン
  subdomain: string; // xxx.dnsweeper.com
  tier: TenantTier;
  status: 'active' | 'suspended' | 'trial' | 'cancelled' | 'migrating';
  isolationLevel: TenantIsolationLevel;
  configuration: TenantConfiguration;
  subscription: TenantSubscription;
  quotas: TenantQuotas;
  billing: TenantBilling;
  security: TenantSecurity;
  customization: TenantCustomization;
  metadata: TenantMetadata;
  adminUsers: string[]; // ユーザーIDのリスト
  createdAt: Date;
  updatedAt: Date;
  lastAccessAt: Date;
  trialExpiresAt?: Date;
}

/**
 * テナント設定
 */
export interface TenantConfiguration {
  database: {
    connectionString?: string;
    schemaName?: string;
    maxConnections: number;
    isolation: TenantIsolationLevel;
    backupEnabled: boolean;
    backupRetentionDays: number;
  };
  storage: {
    bucket?: string;
    path: string;
    maxSizeGB: number;
    encryption: boolean;
    compressionEnabled: boolean;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSizeMB: number;
    strategy: 'redis' | 'memory' | 'hybrid';
  };
  monitoring: {
    metricsEnabled: boolean;
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
    alertingEnabled: boolean;
    customDashboard: boolean;
  };
  integration: {
    webhooksEnabled: boolean;
    apiRateLimit: number;
    customEndpoints: string[];
    allowedOrigins: string[];
  };
  features: TenantFeatureFlags;
}

/**
 * テナント機能フラグ
 */
export interface TenantFeatureFlags {
  advancedAnalytics: boolean;
  customReporting: boolean;
  apiAccess: boolean;
  webhookSupport: boolean;
  ssoIntegration: boolean;
  whiteLabeling: boolean;
  customDomains: boolean;
  advancedSecurity: boolean;
  prioritySupport: boolean;
  customIntegrations: boolean;
  dataExport: boolean;
  auditLogs: boolean;
  complianceReports: boolean;
  multiRegionSupport: boolean;
  dedicatedSupport: boolean;
}

/**
 * テナントサブスクリプション
 */
export interface TenantSubscription {
  id: string;
  planId: string;
  planName: string;
  billingModel: BillingModel;
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  pricing: {
    basePriceMonthly: number;
    basePriceAnnually: number;
    pricePerUser?: number;
    pricePerDomain?: number;
    pricePerQuery?: number;
    currency: string;
    billingCycle: 'monthly' | 'annually';
  };
  addOns: SubscriptionAddOn[];
  discount?: {
    couponId: string;
    percentOff?: number;
    amountOff?: number;
    duration: 'once' | 'repeating' | 'forever';
    durationInMonths?: number;
  };
  metadata: Record<string, any>;
}

/**
 * サブスクリプションアドオン
 */
export interface SubscriptionAddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  billingCycle: 'monthly' | 'annually' | 'one_time';
  enabled: boolean;
}

/**
 * テナントクォータ
 */
export interface TenantQuotas {
  users: {
    max: number;
    current: number;
    includedInPlan: number;
  };
  domains: {
    max: number;
    current: number;
    includedInPlan: number;
  };
  dnsQueries: {
    maxPerMonth: number;
    currentMonth: number;
    includedInPlan: number;
  };
  storage: {
    maxGB: number;
    currentGB: number;
    includedInPlan: number;
  };
  apiCalls: {
    maxPerMonth: number;
    currentMonth: number;
    includedInPlan: number;
  };
  customIntegrations: {
    max: number;
    current: number;
    includedInPlan: number;
  };
  dataRetention: {
    maxDays: number;
    includedInPlan: number;
  };
  support: {
    responseTimeSLA: number; // hours
    channels: ('email' | 'chat' | 'phone' | 'slack')[];
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * テナント課金情報
 */
export interface TenantBilling {
  customerId: string; // Stripe/PayPal等の顧客ID
  paymentMethodId?: string;
  billingEmail: string;
  billingAddress: BillingAddress;
  taxInfo: TaxInformation;
  invoiceSettings: InvoiceSettings;
  usage: UsageMetrics;
  currentInvoice?: CurrentInvoice;
  paymentHistory: PaymentRecord[];
  credits: TenantCredits;
}

/**
 * 請求先住所
 */
export interface BillingAddress {
  name: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

/**
 * 税務情報
 */
export interface TaxInformation {
  taxExempt: boolean;
  taxId?: string;
  taxIdType?: 'vat' | 'gst' | 'ein' | 'tax_id';
  taxRate?: number;
  taxRegion: string;
}

/**
 * 請求書設定
 */
export interface InvoiceSettings {
  dayOfMonth: number; // 請求日
  dueInDays: number; // 支払期限
  autoCollection: boolean;
  emailInvoices: boolean;
  customFooter?: string;
  includePdfAttachment: boolean;
}

/**
 * 使用量メトリクス
 */
export interface UsageMetrics {
  period: {
    start: Date;
    end: Date;
  };
  dnsQueries: number;
  dataTransferGB: number;
  storageUsedGB: number;
  apiCalls: number;
  activeUsers: number;
  activeDomains: number;
  overageCharges: {
    dnsQueries: number;
    dataTransfer: number;
    storage: number;
    apiCalls: number;
    users: number;
  };
}

/**
 * 現在の請求書
 */
export interface CurrentInvoice {
  id: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  amount: number;
  currency: string;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
  tax: number;
  total: number;
  paidAt?: Date;
}

/**
 * 請求書明細
 */
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  period?: {
    start: Date;
    end: Date;
  };
}

/**
 * 支払履歴
 */
export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  method: 'card' | 'bank_transfer' | 'invoice' | 'credit';
  createdAt: Date;
  description?: string;
  failureReason?: string;
}

/**
 * テナントクレジット
 */
export interface TenantCredits {
  balance: number;
  currency: string;
  transactions: CreditTransaction[];
}

/**
 * クレジット取引
 */
export interface CreditTransaction {
  id: string;
  type: 'earned' | 'spent' | 'granted' | 'expired';
  amount: number;
  description: string;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * テナントセキュリティ
 */
export interface TenantSecurity {
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  encryptionKey?: string;
  ipWhitelist: string[];
  accessControl: {
    mfaRequired: boolean;
    sessionTimeout: number; // minutes
    passwordPolicy: PasswordPolicy;
    ssoEnabled: boolean;
    ssoProvider?: string;
  };
  auditLogging: {
    enabled: boolean;
    retentionDays: number;
    includedEvents: string[];
    logDestination: 'internal' | 'external' | 'both';
    externalLogConfig?: {
      provider: string;
      endpoint: string;
      credentials: Record<string, any>;
    };
  };
  compliance: {
    frameworks: ('SOC2' | 'GDPR' | 'HIPAA' | 'ISO27001')[];
    certifications: string[];
    dataResidency: string;
    dataProcessingAgreement: boolean;
  };
}

/**
 * パスワードポリシー
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxAge: number; // days
  preventReuse: number; // number of previous passwords
}

/**
 * テナントカスタマイゼーション
 */
export interface TenantCustomization {
  branding: {
    logo?: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily?: string;
    favicon?: string;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
    customCss?: string;
    hideFooter: boolean;
    customMenuItems: CustomMenuItem[];
  };
  domain: {
    customDomain?: string;
    sslCertificate?: string;
    redirects: DomainRedirect[];
  };
  emails: {
    fromName: string;
    fromEmail: string;
    templates: EmailTemplate[];
    branding: boolean;
  };
}

/**
 * カスタムメニューアイテム
 */
export interface CustomMenuItem {
  id: string;
  label: string;
  url: string;
  icon?: string;
  target: '_self' | '_blank';
  order: number;
  visible: boolean;
}

/**
 * ドメインリダイレクト
 */
export interface DomainRedirect {
  from: string;
  to: string;
  statusCode: 301 | 302;
  preserveQuery: boolean;
}

/**
 * メールテンプレート
 */
export interface EmailTemplate {
  type: 'welcome' | 'reset_password' | 'invoice' | 'notification' | 'support';
  subject: string;
  body: string;
  variables: string[];
  enabled: boolean;
}

/**
 * テナントメタデータ
 */
export interface TenantMetadata {
  industry?: string;
  companySize?: string;
  useCase?: string;
  referralSource?: string;
  contractType?: 'monthly' | 'annual' | 'custom';
  salesContact?: string;
  supportTier?: 'standard' | 'premium' | 'enterprise';
  migrationStatus?: 'not_started' | 'in_progress' | 'completed';
  tags: string[];
  notes: string;
  customFields: Record<string, any>;
}

/**
 * テナントユーザー
 */
export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: TenantUserRole;
  status: 'active' | 'invited' | 'suspended' | 'deactivated';
  permissions: TenantUserPermissions;
  profile: UserProfile;
  preferences: UserPreferences;
  lastLoginAt?: Date;
  invitedAt?: Date;
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * テナントユーザーロール
 */
export type TenantUserRole = 'owner' | 'admin' | 'manager' | 'user' | 'viewer' | 'api_only';

/**
 * テナントユーザー権限
 */
export interface TenantUserPermissions {
  canManageUsers: boolean;
  canManageBilling: boolean;
  canManageSettings: boolean;
  canManageDomains: boolean;
  canViewAnalytics: boolean;
  canManageIntegrations: boolean;
  canAccessApi: boolean;
  canExportData: boolean;
  canManageSupport: boolean;
  resourceAccess: ResourcePermission[];
}

/**
 * リソース権限
 */
export interface ResourcePermission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
  conditions?: {
    own: boolean;
    teamOnly: boolean;
    filters: Record<string, any>;
  };
}

/**
 * ユーザープロファイル
 */
export interface UserProfile {
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  title?: string;
  department?: string;
  timezone: string;
  language: string;
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
}

/**
 * ユーザー設定
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    email: boolean;
    push: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
    categories: string[];
  };
  dashboard: {
    defaultView: string;
    widgets: DashboardWidget[];
    autoRefresh: boolean;
    refreshInterval: number;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
    shareData: boolean;
  };
}

/**
 * ダッシュボードウィジェット
 */
export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number; width: number; height: number };
  configuration: Record<string, any>;
  visible: boolean;
}

/**
 * マルチテナント設定
 */
export interface MultiTenantConfig {
  defaultIsolationLevel: TenantIsolationLevel;
  allowedIsolationLevels: TenantIsolationLevel[];
  maxTenantsPerInstance: number;
  autoScaling: {
    enabled: boolean;
    targetCpuUtilization: number;
    targetMemoryUtilization: number;
    minInstances: number;
    maxInstances: number;
  };
  security: {
    encryptionRequired: boolean;
    auditLoggingRequired: boolean;
    ipWhitelistingAllowed: boolean;
    customDomainsAllowed: boolean;
  };
  billing: {
    supportedCurrencies: string[];
    defaultCurrency: string;
    taxCalculationEnabled: boolean;
    creditSystemEnabled: boolean;
  };
  features: {
    whiteLabeling: boolean;
    customIntegrations: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
  };
}

/**
 * テナント分析データ
 */
export interface TenantAnalytics {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    activeUsers: number;
    totalUsers: number;
    sessionsCount: number;
    averageSessionDuration: number;
    pageViews: number;
    apiCalls: number;
    errorRate: number;
    responseTime: number;
  };
  usage: {
    dnsQueries: number;
    dataTransfer: number;
    storageUsed: number;
    bandwidthUsed: number;
  };
  billing: {
    revenue: number;
    costs: number;
    margin: number;
    overageCharges: number;
  };
  health: {
    uptime: number;
    availability: number;
    performanceScore: number;
    securityScore: number;
  };
  growth: {
    userGrowthRate: number;
    usageGrowthRate: number;
    revenueGrowthRate: number;
    churnRate: number;
  };
}

/**
 * テナント移行ジョブ
 */
export interface TenantMigrationJob {
  id: string;
  tenantId: string;
  fromIsolationLevel: TenantIsolationLevel;
  toIsolationLevel: TenantIsolationLevel;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  steps: MigrationStep[];
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number; // minutes
  actualDuration?: number; // minutes
  dataSize: number; // GB
  backupCreated: boolean;
  rollbackPlan: RollbackPlan;
  notifications: {
    beforeStart: boolean;
    onCompletion: boolean;
    onFailure: boolean;
    recipients: string[];
  };
}

/**
 * 移行ステップ
 */
export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // seconds
  progress: number; // 0-100
  logs: string[];
  error?: string;
}

/**
 * ロールバック計画
 */
export interface RollbackPlan {
  backupId: string;
  steps: RollbackStep[];
  estimatedDuration: number; // minutes
  dataLossRisk: 'none' | 'minimal' | 'moderate' | 'high';
  prerequisites: string[];
}

/**
 * ロールバックステップ
 */
export interface RollbackStep {
  id: string;
  name: string;
  description: string;
  command: string;
  estimatedDuration: number; // seconds
  critical: boolean;
}

/**
 * SaaS プラン
 */
export interface SaasPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  tier: TenantTier;
  billingModel: BillingModel;
  pricing: {
    basePrice: number;
    currency: string;
    billingCycle: ('monthly' | 'annually')[];
    freeTrialDays: number;
    setupFee?: number;
  };
  quotas: Partial<TenantQuotas>;
  features: TenantFeatureFlags;
  limits: {
    maxUsers: number;
    maxDomains: number;
    maxStorage: number;
    maxApiCalls: number;
    maxIntegrations: number;
  };
  support: {
    channels: string[];
    responseTime: number; // hours
    priority: 'low' | 'medium' | 'high' | 'critical';
    dedicatedManager: boolean;
  };
  isolationLevel: TenantIsolationLevel;
  customization: {
    branding: boolean;
    customDomain: boolean;
    whiteLabeling: boolean;
    customIntegrations: boolean;
  };
  security: {
    ssoRequired: boolean;
    auditLogs: boolean;
    encryption: boolean;
    ipWhitelisting: boolean;
  };
  availability: {
    sla: number; // percentage
    uptime: number; // percentage
    support247: boolean;
  };
  isPublic: boolean;
  isDeprecated: boolean;
  migrationPath?: string; // 推奨移行先プランID
  createdAt: Date;
  updatedAt: Date;
}