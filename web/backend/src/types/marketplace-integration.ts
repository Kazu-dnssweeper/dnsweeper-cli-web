/**
 * DNSweeper マーケットプレイス統合型定義
 * AWS/Azure/GCPマーケットプレイス・ワンクリックデプロイ・課金統合・認定要件対応
 */

/**
 * マーケットプレイスプロバイダー
 */
export type MarketplaceProvider = 'aws' | 'azure' | 'gcp' | 'digital_ocean' | 'linode' | 'alibaba';

/**
 * デプロイメント方式
 */
export type DeploymentMethod = 'ami' | 'container' | 'terraform' | 'cloudformation' | 'arm_template' | 'deployment_manager';

/**
 * マーケットプレイス製品情報
 */
export interface MarketplaceProduct {
  id: string;
  name: string;
  provider: MarketplaceProvider;
  productId: string;
  version: string;
  description: string;
  longDescription: string;
  categoryIds: string[];
  keywords: string[];
  pricing: ProductPricing;
  deploymentOptions: DeploymentOption[];
  certifications: string[];
  complianceStandards: string[];
  supportedRegions: string[];
  publishedAt: Date;
  lastUpdated: Date;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'suspended';
  metadata: {
    logoUrl: string;
    screenshotUrls: string[];
    documentationUrls: string[];
    videoUrls: string[];
    licenseUrl: string;
    privacyPolicyUrl: string;
    termsOfServiceUrl: string;
  };
}

/**
 * 製品価格設定
 */
export interface ProductPricing {
  model: 'free' | 'byol' | 'payg' | 'subscription' | 'hybrid';
  currency: string;
  tiers: PricingTier[];
  minimumCommitment?: {
    amount: number;
    period: 'monthly' | 'annually';
  };
  freeTrialPeriod?: number; // days
  customPricingAvailable: boolean;
}

/**
 * 価格階層
 */
export interface PricingTier {
  id: string;
  name: string;
  instanceTypes: string[];
  hourlyRate?: number;
  monthlyRate?: number;
  annualRate?: number;
  includedUsage: {
    dnsQueries: number;
    dataTransferGB: number;
    users: number;
  };
  overageRates: {
    dnsQuerysPer1000: number;
    dataTransferPerGB: number;
    additionalUserPerMonth: number;
  };
}

/**
 * デプロイメントオプション
 */
export interface DeploymentOption {
  id: string;
  name: string;
  method: DeploymentMethod;
  architecture: 'x86_64' | 'arm64' | 'multi_arch';
  operatingSystem: string[];
  minimumSpecs: {
    cpu: number;
    memoryGB: number;
    storageGB: number;
    networkMbps: number;
  };
  recommendedSpecs: {
    cpu: number;
    memoryGB: number;
    storageGB: number;
    networkMbps: number;
  };
  templateConfig: {
    templateUrl: string;
    parametersSchema: Record<string, any>;
    outputsSchema: Record<string, any>;
  };
  automatedDeployment: boolean;
  estimatedDeployTime: number; // minutes
  prerequisites: string[];
  postDeploymentSteps: string[];
}

/**
 * マーケットプレイス認定情報
 */
export interface MarketplaceCertification {
  provider: MarketplaceProvider;
  certificationLevel: 'basic' | 'advanced' | 'premium' | 'enterprise';
  validFrom: Date;
  validUntil: Date;
  requirements: CertificationRequirement[];
  testResults: TestResult[];
  reviewNotes: string[];
  approvedBy: {
    name: string;
    email: string;
    timestamp: Date;
  };
  badges: string[];
}

/**
 * 認定要件
 */
export interface CertificationRequirement {
  id: string;
  category: 'security' | 'performance' | 'reliability' | 'usability' | 'documentation';
  name: string;
  description: string;
  mandatory: boolean;
  weight: number;
  status: 'pending' | 'in_progress' | 'passed' | 'failed';
  evidence: string[];
  notes: string;
}

/**
 * テスト結果
 */
export interface TestResult {
  testId: string;
  testName: string;
  category: string;
  executedAt: Date;
  duration: number;
  status: 'passed' | 'failed' | 'warning';
  score: number;
  maxScore: number;
  details: {
    testSteps: TestStep[];
    artifacts: string[];
    logs: string[];
  };
}

/**
 * テストステップ
 */
export interface TestStep {
  step: string;
  description: string;
  expected: string;
  actual: string;
  status: 'passed' | 'failed' | 'skipped';
  screenshot?: string;
  logs: string[];
}

/**
 * デプロイメントセッション
 */
export interface DeploymentSession {
  id: string;
  marketplaceProvider: MarketplaceProvider;
  productId: string;
  deploymentOptionId: string;
  customerId: string;
  customerInfo: {
    email: string;
    organization?: string;
    billingAccountId: string;
  };
  targetRegion: string;
  configuration: Record<string, any>;
  status: 'pending' | 'initializing' | 'deploying' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  deploymentSteps: DeploymentStep[];
  resourcesCreated: ResourceInfo[];
  accessInformation: {
    endpoints: string[];
    credentials: Record<string, string>;
    dashboardUrl?: string;
    documentationUrl?: string;
  };
  billingIntegration: {
    meteringRecordId?: string;
    subscriptionId?: string;
    usageReportingEnabled: boolean;
  };
  error?: string;
}

/**
 * デプロイメントステップ
 */
export interface DeploymentStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  progress: number; // 0-100
  logs: string[];
  error?: string;
}

/**
 * 作成されたリソース情報
 */
export interface ResourceInfo {
  type: string;
  id: string;
  name: string;
  region: string;
  status: string;
  properties: Record<string, any>;
  tags: Record<string, string>;
}

/**
 * 課金統合設定
 */
export interface BillingIntegration {
  provider: MarketplaceProvider;
  enabled: boolean;
  meteringConfiguration: {
    meteringApiUrl: string;
    meteringApiKey: string;
    productCode: string;
    usageDimensions: UsageDimension[];
    reportingInterval: number; // seconds
    batchSize: number;
  };
  subscriptionManagement: {
    subscriptionApiUrl: string;
    webhookUrl: string;
    supportedActions: string[];
  };
  taxConfiguration: {
    taxCalculationEnabled: boolean;
    taxServiceUrl?: string;
    defaultTaxRate: number;
  };
}

/**
 * 使用量ディメンション
 */
export interface UsageDimension {
  name: string;
  description: string;
  unit: string;
  valueType: 'count' | 'duration' | 'size';
  aggregationType: 'sum' | 'max' | 'average';
  meteringKey: string;
}

/**
 * マーケットプレイス使用量レポート
 */
export interface UsageReport {
  id: string;
  customerId: string;
  productId: string;
  reportingPeriod: {
    startTime: Date;
    endTime: Date;
  };
  usageRecords: UsageRecord[];
  totalAmount: number;
  currency: string;
  submittedAt: Date;
  processingStatus: 'pending' | 'processing' | 'accepted' | 'rejected';
  marketplaceResponse?: {
    transactionId: string;
    status: string;
    message: string;
  };
}

/**
 * 使用量記録
 */
export interface UsageRecord {
  dimension: string;
  quantity: number;
  timestamp: Date;
  customerId: string;
  resourceId?: string;
  metadata: Record<string, any>;
}

/**
 * マーケットプレイスAPI応答
 */
export interface MarketplaceApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  requestId: string;
  timestamp: Date;
}

/**
 * ワンクリックデプロイ設定
 */
export interface OneClickDeployConfig {
  templateUrl: string;
  parameters: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'array';
      default?: any;
      allowedValues?: any[];
      description: string;
      required: boolean;
    };
  };
  outputs: {
    [key: string]: {
      description: string;
      type: string;
    };
  };
  estimatedCost: {
    daily: number;
    monthly: number;
    currency: string;
  };
  supportInfo: {
    documentationUrl: string;
    supportEmail: string;
    communityForumUrl?: string;
    knowledgeBaseUrl?: string;
  };
}

/**
 * マーケットプレイスメトリクス
 */
export interface MarketplaceMetrics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  deployments: {
    total: number;
    successful: number;
    failed: number;
    byProvider: Record<MarketplaceProvider, number>;
    byRegion: Record<string, number>;
  };
  revenue: {
    total: number;
    currency: string;
    byProvider: Record<MarketplaceProvider, number>;
    byPricingTier: Record<string, number>;
  };
  customers: {
    newCustomers: number;
    activeCustomers: number;
    churnRate: number;
    averageUsage: Record<string, number>;
  };
  performance: {
    averageDeployTime: number;
    successRate: number;
    customerSatisfaction: number;
    supportTickets: number;
  };
}