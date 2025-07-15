/**
 * DNSweeper パートナーAPI・SDK型定義
 * サードパーティ統合・RESTful API・GraphQL・WebSocket・SDK・認証・レート制限
 */

/**
 * パートナータイプ
 */
export type PartnerType = 'technology' | 'integration' | 'reseller' | 'mssp' | 'consulting' | 'oss';

/**
 * APIバージョン
 */
export type ApiVersion = 'v1' | 'v2' | 'beta';

/**
 * 認証方式
 */
export type AuthMethod = 'api_key' | 'oauth2' | 'jwt' | 'mutual_tls' | 'hmac';

/**
 * パートナー情報
 */
export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  companyName: string;
  contactEmail: string;
  website?: string;
  description: string;
  logoUrl?: string;
  status: 'pending' | 'approved' | 'active' | 'suspended' | 'terminated';
  tierLevel: 'bronze' | 'silver' | 'gold' | 'platinum';
  credentials: PartnerCredentials;
  permissions: PartnerPermissions;
  rateLimits: RateLimit[];
  metrics: PartnerMetrics;
  integrations: Integration[];
  supportContact: {
    name: string;
    email: string;
    phone?: string;
    timezone: string;
  };
  businessInfo: {
    country: string;
    industry: string;
    companySize: string;
    annualRevenue?: string;
    useCase: string;
  };
  contractInfo: {
    startDate: Date;
    endDate?: Date;
    billingModel: 'revenue_share' | 'fixed_fee' | 'usage_based' | 'free';
    revenueSharePercent?: number;
  };
  createdAt: Date;
  lastActiveAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

/**
 * パートナー認証情報
 */
export interface PartnerCredentials {
  apiKey: string;
  secretKey: string;
  clientId?: string;
  clientSecret?: string;
  publicKey?: string;
  privateKeyId?: string;
  authMethod: AuthMethod;
  scopes: string[];
  expiresAt?: Date;
  lastRotated: Date;
  rotationInterval: number; // days
}

/**
 * パートナー権限
 */
export interface PartnerPermissions {
  resources: ResourcePermission[];
  operations: OperationPermission[];
  dataAccess: DataAccessPermission;
  webhookAccess: boolean;
  sdkAccess: boolean;
  customEndpoints: string[];
  ipWhitelist: string[];
  environments: ('production' | 'staging' | 'development')[];
}

/**
 * リソース権限
 */
export interface ResourcePermission {
  resource: 'dns_records' | 'zones' | 'analytics' | 'users' | 'settings' | 'integrations';
  permissions: ('read' | 'write' | 'delete' | 'admin')[];
  filters?: {
    ownerIds?: string[];
    tags?: string[];
    regions?: string[];
  };
}

/**
 * 操作権限
 */
export interface OperationPermission {
  operation: string;
  allowed: boolean;
  conditions?: {
    rateLimit?: number;
    timeRestriction?: {
      startHour: number;
      endHour: number;
      timezone: string;
    };
    ipRestriction?: string[];
  };
}

/**
 * データアクセス権限
 */
export interface DataAccessPermission {
  personalData: boolean;
  analyticsData: boolean;
  logData: boolean;
  configurationData: boolean;
  aggregatedData: boolean;
  dataRetentionDays: number;
  dataExportFormats: ('json' | 'csv' | 'xml' | 'parquet')[];
  maskingRules: {
    field: string;
    maskType: 'hash' | 'truncate' | 'encrypt' | 'remove';
    conditions?: Record<string, any>;
  }[];
}

/**
 * レート制限
 */
export interface RateLimit {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | '*';
  limit: number;
  window: number; // seconds
  burstLimit?: number;
  quotaReset: 'rolling' | 'fixed';
  overagePolicy: 'reject' | 'queue' | 'bill';
  customHeaders: boolean;
}

/**
 * パートナーメトリクス
 */
export interface PartnerMetrics {
  apiUsage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    last24h: number;
    last7d: number;
    last30d: number;
  };
  dataUsage: {
    recordsRead: number;
    recordsWritten: number;
    dataTransferGB: number;
    storageUsedGB: number;
  };
  revenue: {
    generated: number;
    shared: number;
    commission: number;
    currency: string;
  };
  customers: {
    referred: number;
    active: number;
    churn: number;
  };
  supportMetrics: {
    ticketsCreated: number;
    ticketsResolved: number;
    averageResolutionTime: number;
    satisfactionScore: number;
  };
}

/**
 * 統合情報
 */
export interface Integration {
  id: string;
  partnerId: string;
  name: string;
  type: 'webhook' | 'polling' | 'streaming' | 'batch' | 'realtime';
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  configuration: IntegrationConfig;
  endpoints: IntegrationEndpoint[];
  dataMapping: DataMapping[];
  transformations: DataTransformation[];
  filters: DataFilter[];
  scheduling: ScheduleConfig;
  monitoring: MonitoringConfig;
  errorHandling: ErrorHandlingConfig;
  createdAt: Date;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
}

/**
 * 統合設定
 */
export interface IntegrationConfig {
  sourceSystem: string;
  targetSystem: string;
  syncDirection: 'bidirectional' | 'source_to_target' | 'target_to_source';
  batchSize: number;
  timeoutSeconds: number;
  retryAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  encryption: {
    enabled: boolean;
    algorithm?: string;
    keyId?: string;
  };
  compression: {
    enabled: boolean;
    algorithm?: 'gzip' | 'brotli' | 'lz4';
  };
  customHeaders: Record<string, string>;
  authentication: AuthenticationConfig;
}

/**
 * 統合エンドポイント
 */
export interface IntegrationEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  bodyTemplate?: string;
  responseType: 'json' | 'xml' | 'text' | 'binary';
  cachingEnabled: boolean;
  cacheTimeout: number;
  rateLimitOverride?: RateLimit;
}

/**
 * データマッピング
 */
export interface DataMapping {
  sourceField: string;
  targetField: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    enum?: any[];
  };
  transformation?: string; // JavaScript function
}

/**
 * データ変換
 */
export interface DataTransformation {
  id: string;
  name: string;
  type: 'script' | 'template' | 'lookup' | 'calculation';
  script?: string; // JavaScript code
  template?: string; // Template string
  lookupTable?: Record<string, any>;
  calculation?: {
    formula: string;
    variables: string[];
  };
  conditions?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
    value: any;
  }[];
}

/**
 * データフィルター
 */
export interface DataFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains' | 'regex';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

/**
 * スケジュール設定
 */
export interface ScheduleConfig {
  enabled: boolean;
  type: 'interval' | 'cron' | 'event_driven';
  interval?: number; // minutes
  cronExpression?: string;
  timezone: string;
  startDate?: Date;
  endDate?: Date;
  maxExecutions?: number;
  eventTriggers?: {
    event: string;
    conditions?: Record<string, any>;
  }[];
}

/**
 * 監視設定
 */
export interface MonitoringConfig {
  healthCheck: {
    enabled: boolean;
    interval: number; // minutes
    timeout: number; // seconds
    successCriteria: {
      responseTime: number;
      errorRate: number;
      dataFreshness: number; // minutes
    };
  };
  alerting: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'webhook' | 'sms')[];
    conditions: AlertCondition[];
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    retention: number; // days
    includePayload: boolean;
    includeSensitiveData: boolean;
  };
}

/**
 * アラート条件
 */
export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  threshold: number;
  duration: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * エラーハンドリング設定
 */
export interface ErrorHandlingConfig {
  retryPolicy: {
    maxRetries: number;
    backoffType: 'linear' | 'exponential' | 'fixed';
    baseDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    jitter: boolean;
  };
  deadLetterQueue: {
    enabled: boolean;
    maxRetentionDays: number;
    reprocessingEnabled: boolean;
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    timeout: number; // seconds
    monitoringPeriod: number; // seconds
  };
  fallbackBehavior: 'ignore' | 'log' | 'alert' | 'queue' | 'callback';
  customErrorHandlers: {
    errorCode: string;
    action: 'retry' | 'skip' | 'stop' | 'transform' | 'callback';
    parameters?: Record<string, any>;
  }[];
}

/**
 * 認証設定
 */
export interface AuthenticationConfig {
  type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'api_key' | 'custom';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
  oauth2Config?: {
    authUrl: string;
    tokenUrl: string;
    scope: string[];
    redirectUri: string;
  };
  customAuth?: {
    headerName: string;
    headerValue: string;
    scriptPath?: string;
  };
}

/**
 * APIリクエスト
 */
export interface ApiRequest {
  id: string;
  partnerId: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, any>;
  body?: any;
  timestamp: Date;
  userAgent?: string;
  clientIp: string;
  rateLimitInfo: {
    remaining: number;
    resetTime: Date;
    limit: number;
  };
}

/**
 * APIレスポンス
 */
export interface ApiResponse {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  body?: any;
  responseTime: number;
  cacheHit: boolean;
  rateLimitHeaders: Record<string, string>;
  timestamp: Date;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Webhook設定
 */
export interface WebhookConfig {
  id: string;
  partnerId: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  retryAttempts: number;
  timeout: number; // seconds
  headers: Record<string, string>;
  filters: WebhookFilter[];
  rateLimiting: {
    maxPerSecond: number;
    maxPerMinute: number;
    maxPerHour: number;
  };
  security: {
    verifySSL: boolean;
    allowedIPs?: string[];
    signatureHeader: string;
    hashAlgorithm: 'sha256' | 'sha512';
  };
  lastDelivery?: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  deliveryStats: {
    totalAttempts: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageLatency: number;
  };
}

/**
 * Webhookフィルター
 */
export interface WebhookFilter {
  field: string;
  operator: 'eq' | 'ne' | 'contains' | 'in' | 'regex';
  value: any;
}

/**
 * SDK設定
 */
export interface SdkConfig {
  languages: SdkLanguage[];
  features: SdkFeature[];
  documentation: {
    apiReference: string;
    quickStart: string;
    examples: string;
    changelog: string;
  };
  support: {
    issueTracker: string;
    community: string;
    slack?: string;
    discord?: string;
  };
  packaging: {
    npm?: { packageName: string; version: string; };
    pypi?: { packageName: string; version: string; };
    maven?: { groupId: string; artifactId: string; version: string; };
    nuget?: { packageName: string; version: string; };
    gem?: { gemName: string; version: string; };
    go?: { modulePath: string; version: string; };
  };
}

/**
 * SDK言語
 */
export interface SdkLanguage {
  language: 'javascript' | 'typescript' | 'python' | 'java' | 'csharp' | 'go' | 'ruby' | 'php' | 'swift' | 'kotlin';
  version: string;
  status: 'stable' | 'beta' | 'alpha' | 'deprecated';
  features: string[];
  examples: CodeExample[];
  dependencies: string[];
  minimumVersion: string;
}

/**
 * SDK機能
 */
export interface SdkFeature {
  name: string;
  description: string;
  available: boolean;
  languages: string[];
  examples: CodeExample[];
  documentation: string;
}

/**
 * コード例
 */
export interface CodeExample {
  title: string;
  description: string;
  language: string;
  code: string;
  output?: string;
  dependencies?: string[];
}

/**
 * パートナーアクティビティログ
 */
export interface PartnerActivityLog {
  id: string;
  partnerId: string;
  activity: string;
  description: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'auth' | 'api' | 'integration' | 'billing' | 'support' | 'security';
}

/**
 * パートナーサポートチケット
 */
export interface PartnerSupportTicket {
  id: string;
  partnerId: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending_partner' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'account' | 'integration' | 'feature_request' | 'bug_report';
  assignedTo?: string;
  requesterEmail: string;
  requesterName: string;
  attachments: string[];
  tags: string[];
  resolution?: string;
  resolutionTime?: number; // minutes
  satisfactionRating?: number; // 1-5
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  communications: TicketCommunication[];
}

/**
 * チケットコミュニケーション
 */
export interface TicketCommunication {
  id: string;
  ticketId: string;
  fromEmail: string;
  fromName: string;
  fromType: 'partner' | 'support' | 'system';
  content: string;
  attachments: string[];
  timestamp: Date;
  isInternal: boolean;
}

/**
 * API分析データ
 */
export interface ApiAnalytics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  overall: {
    totalRequests: number;
    successRate: number;
    averageLatency: number;
    errorRate: number;
    dataTransferred: number; // bytes
  };
  byPartner: Record<string, PartnerApiStats>;
  byEndpoint: Record<string, EndpointStats>;
  byTime: TimeSeriesData[];
  topErrors: ErrorStats[];
  rateLimitHits: RateLimitStats[];
}

/**
 * パートナーAPI統計
 */
export interface PartnerApiStats {
  partnerId: string;
  partnerName: string;
  requests: number;
  successRate: number;
  averageLatency: number;
  dataTransferred: number;
  rateLimitHits: number;
  topEndpoints: string[];
}

/**
 * エンドポイント統計
 */
export interface EndpointStats {
  endpoint: string;
  method: string;
  requests: number;
  successRate: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  errors: number;
  rateLimitHits: number;
}

/**
 * 時系列データ
 */
export interface TimeSeriesData {
  timestamp: Date;
  requests: number;
  successRate: number;
  averageLatency: number;
  errors: number;
  rateLimitHits: number;
}

/**
 * エラー統計
 */
export interface ErrorStats {
  errorCode: string;
  errorMessage: string;
  count: number;
  percentage: number;
  endpoints: string[];
  partners: string[];
}

/**
 * レート制限統計
 */
export interface RateLimitStats {
  partnerId: string;
  endpoint: string;
  hits: number;
  limit: number;
  window: number;
  overageAmount: number;
}