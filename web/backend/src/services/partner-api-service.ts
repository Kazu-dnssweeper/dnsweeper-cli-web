/**
 * DNSweeper パートナーAPI・SDK管理サービス
 * サードパーティ統合・認証管理・レート制限・Webhook・SDK配布・分析
 */

import {
  Partner,
  PartnerCredentials,
  PartnerPermissions,
  Integration,
  WebhookConfig,
  SdkConfig,
  ApiRequest,
  ApiResponse,
  PartnerActivityLog,
  PartnerSupportTicket,
  ApiAnalytics,
  RateLimit,
  AuthMethod,
  PartnerType
} from '../types/partner-api';

/**
 * パートナーAPI・SDK管理サービス
 */
export class PartnerApiService {
  private partners: Map<string, Partner> = new Map();
  private integrations: Map<string, Integration> = new Map();
  private webhooks: Map<string, WebhookConfig> = new Map();
  private apiRequests: Map<string, ApiRequest[]> = new Map();
  private activityLogs: Map<string, PartnerActivityLog[]> = new Map();
  private supportTickets: Map<string, PartnerSupportTicket[]> = new Map();
  private sdkConfig: SdkConfig;

  constructor() {
    this.initializePartnerProgram();
    this.setupRateLimiting();
    this.initializeSdkConfig();
    this.startAnalyticsCollection();
  }

  // ===== パートナー管理 =====

  /**
   * 新しいパートナーの登録申請
   */
  async registerPartner(applicationData: Partial<Partner>): Promise<Partner> {
    const partner: Partner = {
      id: this.generatePartnerId(),
      name: applicationData.name!,
      type: applicationData.type!,
      companyName: applicationData.companyName!,
      contactEmail: applicationData.contactEmail!,
      website: applicationData.website,
      description: applicationData.description!,
      logoUrl: applicationData.logoUrl,
      status: 'pending',
      tierLevel: 'bronze',
      credentials: this.generateInitialCredentials(),
      permissions: this.getDefaultPermissions(applicationData.type!),
      rateLimits: this.getDefaultRateLimits(applicationData.type!),
      metrics: this.initializeMetrics(),
      integrations: [],
      supportContact: applicationData.supportContact!,
      businessInfo: applicationData.businessInfo!,
      contractInfo: applicationData.contractInfo!,
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

    this.partners.set(partner.id, partner);

    // 承認プロセスの開始
    await this.initiateApprovalProcess(partner);

    // アクティビティログ記録
    await this.logActivity(partner.id, 'partner_registration', {
      partnerName: partner.name,
      type: partner.type,
      companyName: partner.companyName
    });

    return partner;
  }

  /**
   * パートナー承認
   */
  async approvePartner(
    partnerId: string,
    approvedBy: string,
    tierLevel: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze'
  ): Promise<Partner> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`パートナーが見つかりません: ${partnerId}`);
    }

    if (partner.status !== 'pending') {
      throw new Error('承認可能な状態ではありません');
    }

    // ステータス更新
    partner.status = 'approved';
    partner.tierLevel = tierLevel;
    partner.approvedAt = new Date();
    partner.approvedBy = approvedBy;

    // 権限とレート制限の更新
    partner.permissions = this.getTierPermissions(partner.type, tierLevel);
    partner.rateLimits = this.getTierRateLimits(partner.type, tierLevel);

    // API認証情報の有効化
    partner.credentials.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1年間有効

    // ウェルカムメール送信
    await this.sendWelcomeEmail(partner);

    // ドキュメント生成
    await this.generatePartnerDocumentation(partner);

    await this.logActivity(partnerId, 'partner_approved', {
      approvedBy,
      tierLevel,
      previousStatus: 'pending'
    });

    return partner;
  }

  /**
   * API認証情報の生成
   */
  async generateApiCredentials(
    partnerId: string,
    authMethod: AuthMethod = 'api_key'
  ): Promise<PartnerCredentials> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`パートナーが見つかりません: ${partnerId}`);
    }

    const credentials: PartnerCredentials = {
      apiKey: this.generateApiKey(),
      secretKey: this.generateSecretKey(),
      authMethod,
      scopes: this.getPartnerScopes(partner),
      lastRotated: new Date(),
      rotationInterval: 90 // 90日
    };

    // OAuth2の場合の追加設定
    if (authMethod === 'oauth2') {
      credentials.clientId = this.generateClientId();
      credentials.clientSecret = this.generateClientSecret();
    }

    // JWTの場合の追加設定
    if (authMethod === 'jwt') {
      const keyPair = await this.generateKeyPair();
      credentials.publicKey = keyPair.publicKey;
      credentials.privateKeyId = keyPair.privateKeyId;
    }

    partner.credentials = credentials;
    
    await this.logActivity(partnerId, 'credentials_generated', {
      authMethod,
      scopes: credentials.scopes
    });

    return credentials;
  }

  // ===== API管理 =====

  /**
   * API リクエストの認証と認可
   */
  async authenticateRequest(
    apiKey: string,
    endpoint: string,
    method: string,
    clientIp: string
  ): Promise<{ partner: Partner; allowed: boolean; rateLimitInfo: any }> {
    // パートナー特定
    const partner = await this.findPartnerByApiKey(apiKey);
    if (!partner) {
      throw new Error('無効なAPIキー');
    }

    // ステータス確認
    if (partner.status !== 'active' && partner.status !== 'approved') {
      throw new Error('パートナーアカウントが無効です');
    }

    // IP制限チェック
    if (partner.permissions.ipWhitelist.length > 0 && 
        !partner.permissions.ipWhitelist.includes(clientIp)) {
      throw new Error('IPアドレスが許可されていません');
    }

    // エンドポイント権限チェック
    const hasPermission = await this.checkEndpointPermission(partner, endpoint, method);
    if (!hasPermission) {
      throw new Error('エンドポイントへのアクセス権限がありません');
    }

    // レート制限チェック
    const rateLimitInfo = await this.checkRateLimit(partner.id, endpoint, method);
    if (!rateLimitInfo.allowed) {
      throw new Error('レート制限に達しました');
    }

    // 最終アクティビティ更新
    partner.lastActiveAt = new Date();

    return {
      partner,
      allowed: true,
      rateLimitInfo
    };
  }

  /**
   * API リクエストの記録
   */
  async recordApiRequest(request: Omit<ApiRequest, 'id'>): Promise<void> {
    const apiRequest: ApiRequest = {
      id: this.generateRequestId(),
      ...request
    };

    // リクエスト履歴に追加
    if (!this.apiRequests.has(request.partnerId)) {
      this.apiRequests.set(request.partnerId, []);
    }
    this.apiRequests.get(request.partnerId)!.push(apiRequest);

    // メトリクス更新
    await this.updatePartnerMetrics(request.partnerId, apiRequest);

    // 異常検知
    await this.detectAnomalousActivity(request.partnerId, apiRequest);
  }

  /**
   * API レスポンスの記録
   */
  async recordApiResponse(response: ApiResponse): Promise<void> {
    const request = await this.findRequestById(response.requestId);
    if (!request) {
      return;
    }

    // パートナーメトリクス更新
    const partner = this.partners.get(request.partnerId);
    if (partner) {
      partner.metrics.apiUsage.totalRequests++;
      
      if (response.status >= 200 && response.status < 300) {
        partner.metrics.apiUsage.successfulRequests++;
      } else {
        partner.metrics.apiUsage.failedRequests++;
      }

      partner.metrics.apiUsage.averageLatency = 
        (partner.metrics.apiUsage.averageLatency + response.responseTime) / 2;
    }

    // エラー分析
    if (response.error) {
      await this.analyzeApiError(request.partnerId, request, response);
    }
  }

  // ===== 統合管理 =====

  /**
   * 新しい統合の作成
   */
  async createIntegration(
    partnerId: string,
    integrationData: Partial<Integration>
  ): Promise<Integration> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`パートナーが見つかりません: ${partnerId}`);
    }

    const integration: Integration = {
      id: this.generateIntegrationId(),
      partnerId,
      name: integrationData.name!,
      type: integrationData.type!,
      status: 'inactive',
      configuration: integrationData.configuration!,
      endpoints: integrationData.endpoints || [],
      dataMapping: integrationData.dataMapping || [],
      transformations: integrationData.transformations || [],
      filters: integrationData.filters || [],
      scheduling: integrationData.scheduling!,
      monitoring: integrationData.monitoring!,
      errorHandling: integrationData.errorHandling!,
      createdAt: new Date()
    };

    this.integrations.set(integration.id, integration);
    partner.integrations.push(integration);

    // 統合テストの実行
    await this.testIntegration(integration);

    await this.logActivity(partnerId, 'integration_created', {
      integrationId: integration.id,
      integrationType: integration.type,
      integrationName: integration.name
    });

    return integration;
  }

  /**
   * 統合のテスト実行
   */
  async testIntegration(integration: Integration): Promise<{
    success: boolean;
    results: any[];
    errors: string[];
  }> {
    const results: any[] = [];
    const errors: string[] = [];
    let success = true;

    try {
      // エンドポイント接続テスト
      for (const endpoint of integration.endpoints) {
        try {
          const testResult = await this.testEndpoint(endpoint);
          results.push({
            endpoint: endpoint.name,
            status: 'success',
            responseTime: testResult.responseTime
          });
        } catch (error) {
          success = false;
          errors.push(`エンドポイント ${endpoint.name}: ${error}`);
        }
      }

      // データマッピングテスト
      if (integration.dataMapping.length > 0) {
        try {
          await this.testDataMapping(integration.dataMapping);
          results.push({
            test: 'data_mapping',
            status: 'success'
          });
        } catch (error) {
          success = false;
          errors.push(`データマッピング: ${error}`);
        }
      }

      // 変換テスト
      for (const transformation of integration.transformations) {
        try {
          await this.testTransformation(transformation);
          results.push({
            transformation: transformation.name,
            status: 'success'
          });
        } catch (error) {
          success = false;
          errors.push(`変換 ${transformation.name}: ${error}`);
        }
      }

      // 統合ステータス更新
      integration.status = success ? 'active' : 'error';

    } catch (error) {
      success = false;
      errors.push(`統合テスト失敗: ${error}`);
    }

    return { success, results, errors };
  }

  // ===== Webhook管理 =====

  /**
   * Webhook設定の作成
   */
  async createWebhook(
    partnerId: string,
    webhookData: Partial<WebhookConfig>
  ): Promise<WebhookConfig> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error(`パートナーが見つかりません: ${partnerId}`);
    }

    if (!partner.permissions.webhookAccess) {
      throw new Error('Webhookアクセス権限がありません');
    }

    const webhook: WebhookConfig = {
      id: this.generateWebhookId(),
      partnerId,
      url: webhookData.url!,
      events: webhookData.events!,
      active: false,
      secret: this.generateWebhookSecret(),
      retryAttempts: webhookData.retryAttempts || 3,
      timeout: webhookData.timeout || 30,
      headers: webhookData.headers || {},
      filters: webhookData.filters || [],
      rateLimiting: webhookData.rateLimiting || {
        maxPerSecond: 10,
        maxPerMinute: 100,
        maxPerHour: 1000
      },
      security: webhookData.security || {
        verifySSL: true,
        signatureHeader: 'X-DNSweeper-Signature',
        hashAlgorithm: 'sha256'
      },
      deliveryStats: {
        totalAttempts: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        averageLatency: 0
      }
    };

    this.webhooks.set(webhook.id, webhook);

    // Webhook検証テスト
    const testResult = await this.testWebhook(webhook);
    if (testResult.success) {
      webhook.active = true;
    }

    await this.logActivity(partnerId, 'webhook_created', {
      webhookId: webhook.id,
      url: webhook.url,
      events: webhook.events,
      testResult: testResult.success
    });

    return webhook;
  }

  /**
   * Webhookイベントの送信
   */
  async sendWebhookEvent(
    event: string,
    data: any,
    filters?: Record<string, any>
  ): Promise<void> {
    const relevantWebhooks = Array.from(this.webhooks.values())
      .filter(webhook => 
        webhook.active && 
        webhook.events.includes(event) &&
        this.matchesWebhookFilters(webhook, data, filters)
      );

    for (const webhook of relevantWebhooks) {
      await this.deliverWebhookEvent(webhook, event, data);
    }
  }

  // ===== SDK管理 =====

  /**
   * SDK設定の初期化
   */
  private initializeSdkConfig(): void {
    this.sdkConfig = {
      languages: [
        {
          language: 'javascript',
          version: '2.0.0',
          status: 'stable',
          features: ['rest_api', 'websocket', 'typescript_support'],
          examples: [
            {
              title: 'Basic DNS Query',
              description: 'Execute a basic DNS query',
              language: 'javascript',
              code: `
const DNSweeper = require('@dnsweeper/sdk');

const client = new DNSweeper({
  apiKey: 'your-api-key'
});

async function queryDns() {
  try {
    const result = await client.dns.query({
      domain: 'example.com',
      type: 'A'
    });
    console.log('DNS Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

queryDns();
              `,
              dependencies: ['@dnsweeper/sdk']
            }
          ],
          dependencies: ['axios', 'ws'],
          minimumVersion: '14.0.0'
        },
        {
          language: 'python',
          version: '2.0.0',
          status: 'stable',
          features: ['rest_api', 'async_support', 'type_hints'],
          examples: [
            {
              title: 'Basic DNS Query',
              description: 'Execute a basic DNS query',
              language: 'python',
              code: `
import asyncio
from dnsweeper import DNSweeper

async def main():
    client = DNSweeper(api_key='your-api-key')
    
    try:
        result = await client.dns.query(
            domain='example.com',
            record_type='A'
        )
        print(f'DNS Result: {result}')
    except Exception as error:
        print(f'Error: {error}')
    finally:
        await client.close()

if __name__ == '__main__':
    asyncio.run(main())
              `,
              dependencies: ['dnsweeper-sdk']
            }
          ],
          dependencies: ['aiohttp', 'pydantic'],
          minimumVersion: '3.8'
        },
        {
          language: 'go',
          version: '2.0.0',
          status: 'stable',
          features: ['rest_api', 'context_support', 'structured_logging'],
          examples: [
            {
              title: 'Basic DNS Query',
              description: 'Execute a basic DNS query',
              language: 'go',
              code: `
package main

import (
    "context"
    "fmt"
    "log"
    
    "github.com/dnsweeper/go-sdk/dnsweeper"
)

func main() {
    client := dnsweeper.NewClient("your-api-key")
    
    ctx := context.Background()
    result, err := client.DNS.Query(ctx, &dnsweeper.QueryRequest{
        Domain: "example.com",
        Type:   "A",
    })
    
    if err != nil {
        log.Fatalf("Error: %v", err)
    }
    
    fmt.Printf("DNS Result: %+v\\n", result)
}
              `,
              dependencies: []
            }
          ],
          dependencies: [],
          minimumVersion: '1.19'
        }
      ],
      features: [
        {
          name: 'DNS Query API',
          description: 'Query DNS records programmatically',
          available: true,
          languages: ['javascript', 'python', 'go', 'java', 'csharp'],
          examples: [],
          documentation: '/docs/sdk/dns-query'
        },
        {
          name: 'Real-time Monitoring',
          description: 'Monitor DNS changes in real-time',
          available: true,
          languages: ['javascript', 'python', 'go'],
          examples: [],
          documentation: '/docs/sdk/monitoring'
        },
        {
          name: 'Bulk Operations',
          description: 'Perform bulk DNS operations efficiently',
          available: true,
          languages: ['javascript', 'python', 'go', 'java'],
          examples: [],
          documentation: '/docs/sdk/bulk-operations'
        }
      ],
      documentation: {
        apiReference: '/docs/api-reference',
        quickStart: '/docs/quickstart',
        examples: '/docs/examples',
        changelog: '/docs/changelog'
      },
      support: {
        issueTracker: 'https://github.com/dnsweeper/sdk/issues',
        community: 'https://community.dnsweeper.com',
        slack: 'https://dnsweeperdev.slack.com'
      },
      packaging: {
        npm: { packageName: '@dnsweeper/sdk', version: '2.0.0' },
        pypi: { packageName: 'dnsweeper-sdk', version: '2.0.0' },
        maven: { groupId: 'com.dnsweeper', artifactId: 'dnsweeper-sdk', version: '2.0.0' },
        nuget: { packageName: 'DNSweeper.SDK', version: '2.0.0' },
        go: { modulePath: 'github.com/dnsweeper/go-sdk', version: 'v2.0.0' }
      }
    };
  }

  // ===== 分析とメトリクス =====

  /**
   * API分析データの取得
   */
  async getApiAnalytics(
    startDate: Date,
    endDate: Date,
    partnerId?: string
  ): Promise<ApiAnalytics> {
    const allRequests = partnerId 
      ? this.apiRequests.get(partnerId) || []
      : Array.from(this.apiRequests.values()).flat();

    const periodRequests = allRequests.filter(req => 
      req.timestamp >= startDate && req.timestamp <= endDate
    );

    const analytics: ApiAnalytics = {
      period: { startDate, endDate },
      overall: this.calculateOverallStats(periodRequests),
      byPartner: this.calculatePartnerStats(periodRequests),
      byEndpoint: this.calculateEndpointStats(periodRequests),
      byTime: this.calculateTimeSeriesData(periodRequests, startDate, endDate),
      topErrors: this.calculateTopErrors(periodRequests),
      rateLimitHits: this.calculateRateLimitHits(periodRequests)
    };

    return analytics;
  }

  // ===== プライベートメソッド =====

  private initializePartnerProgram(): void {
    // サンプルパートナーの作成
    const techPartner: Partial<Partner> = {
      name: 'CloudTech Solutions',
      type: 'technology',
      companyName: 'CloudTech Solutions Inc.',
      contactEmail: 'partnerships@cloudtech.com',
      website: 'https://cloudtech.com',
      description: 'クラウドインフラストラクチャのテクノロジーパートナー',
      supportContact: {
        name: 'John Smith',
        email: 'support@cloudtech.com',
        timezone: 'America/New_York'
      },
      businessInfo: {
        country: 'US',
        industry: 'Cloud Infrastructure',
        companySize: '100-500',
        useCase: 'DNS monitoring integration for cloud platforms'
      },
      contractInfo: {
        startDate: new Date(),
        billingModel: 'revenue_share',
        revenueSharePercent: 15
      }
    };

    this.registerPartner(techPartner);
  }

  private setupRateLimiting(): void {
    // レート制限の定期リセット
    setInterval(() => {
      this.resetRateLimits();
    }, 60000); // 1分ごと
  }

  private startAnalyticsCollection(): void {
    // 分析データの定期集計
    setInterval(() => {
      this.aggregateAnalyticsData();
    }, 300000); // 5分ごと
  }

  // ヘルパーメソッド（プレースホルダー）
  private generatePartnerId(): string { return `partner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
  private generateApiKey(): string { return `ak_${Math.random().toString(36).substr(2, 32)}`; }
  private generateSecretKey(): string { return `sk_${Math.random().toString(36).substr(2, 64)}`; }
  private generateClientId(): string { return `client_${Math.random().toString(36).substr(2, 16)}`; }
  private generateClientSecret(): string { return `secret_${Math.random().toString(36).substr(2, 32)}`; }
  private generateRequestId(): string { return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
  private generateIntegrationId(): string { return `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
  private generateWebhookId(): string { return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
  private generateWebhookSecret(): string { return `whsec_${Math.random().toString(36).substr(2, 32)}`; }

  private generateInitialCredentials(): PartnerCredentials {
    return {
      apiKey: this.generateApiKey(),
      secretKey: this.generateSecretKey(),
      authMethod: 'api_key',
      scopes: ['read'],
      lastRotated: new Date(),
      rotationInterval: 90
    };
  }

  private getDefaultPermissions(type: PartnerType): PartnerPermissions {
    return {
      resources: [
        {
          resource: 'dns_records',
          permissions: ['read']
        }
      ],
      operations: [],
      dataAccess: {
        personalData: false,
        analyticsData: false,
        logData: false,
        configurationData: false,
        aggregatedData: true,
        dataRetentionDays: 30,
        dataExportFormats: ['json'],
        maskingRules: []
      },
      webhookAccess: false,
      sdkAccess: true,
      customEndpoints: [],
      ipWhitelist: [],
      environments: ['development']
    };
  }

  private getDefaultRateLimits(type: PartnerType): RateLimit[] {
    return [
      {
        endpoint: '/api/v1/*',
        method: '*',
        limit: 1000,
        window: 3600,
        quotaReset: 'rolling',
        overagePolicy: 'reject',
        customHeaders: true
      }
    ];
  }

  private initializeMetrics(): any {
    return {
      apiUsage: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        last24h: 0,
        last7d: 0,
        last30d: 0
      },
      dataUsage: {
        recordsRead: 0,
        recordsWritten: 0,
        dataTransferGB: 0,
        storageUsedGB: 0
      },
      revenue: {
        generated: 0,
        shared: 0,
        commission: 0,
        currency: 'USD'
      },
      customers: {
        referred: 0,
        active: 0,
        churn: 0
      },
      supportMetrics: {
        ticketsCreated: 0,
        ticketsResolved: 0,
        averageResolutionTime: 0,
        satisfactionScore: 0
      }
    };
  }

  // その他のプレースホルダーメソッド
  private async initiateApprovalProcess(partner: Partner): Promise<void> {}
  private async logActivity(partnerId: string, activity: string, metadata: any): Promise<void> {}
  private async sendWelcomeEmail(partner: Partner): Promise<void> {}
  private async generatePartnerDocumentation(partner: Partner): Promise<void> {}
  private getTierPermissions(type: PartnerType, tier: string): PartnerPermissions { return this.getDefaultPermissions(type); }
  private getTierRateLimits(type: PartnerType, tier: string): RateLimit[] { return this.getDefaultRateLimits(type); }
  private getPartnerScopes(partner: Partner): string[] { return ['read', 'write']; }
  private async generateKeyPair(): Promise<any> { return { publicKey: 'pubkey', privateKeyId: 'keyid' }; }
  private async findPartnerByApiKey(apiKey: string): Promise<Partner | null> {
    return Array.from(this.partners.values()).find(p => p.credentials.apiKey === apiKey) || null;
  }
  private async checkEndpointPermission(partner: Partner, endpoint: string, method: string): Promise<boolean> { return true; }
  private async checkRateLimit(partnerId: string, endpoint: string, method: string): Promise<any> {
    return { allowed: true, remaining: 100, resetTime: new Date() };
  }
  private async updatePartnerMetrics(partnerId: string, request: ApiRequest): Promise<void> {}
  private async detectAnomalousActivity(partnerId: string, request: ApiRequest): Promise<void> {}
  private async findRequestById(requestId: string): Promise<ApiRequest | null> { return null; }
  private async analyzeApiError(partnerId: string, request: ApiRequest, response: ApiResponse): Promise<void> {}
  private async testEndpoint(endpoint: any): Promise<any> { return { responseTime: 100 }; }
  private async testDataMapping(mapping: any[]): Promise<void> {}
  private async testTransformation(transformation: any): Promise<void> {}
  private async testWebhook(webhook: WebhookConfig): Promise<{ success: boolean }> { return { success: true }; }
  private matchesWebhookFilters(webhook: WebhookConfig, data: any, filters?: any): boolean { return true; }
  private async deliverWebhookEvent(webhook: WebhookConfig, event: string, data: any): Promise<void> {}
  private calculateOverallStats(requests: ApiRequest[]): any { return {}; }
  private calculatePartnerStats(requests: ApiRequest[]): any { return {}; }
  private calculateEndpointStats(requests: ApiRequest[]): any { return {}; }
  private calculateTimeSeriesData(requests: ApiRequest[], start: Date, end: Date): any[] { return []; }
  private calculateTopErrors(requests: ApiRequest[]): any[] { return []; }
  private calculateRateLimitHits(requests: ApiRequest[]): any[] { return []; }
  private resetRateLimits(): void {}
  private aggregateAnalyticsData(): void {}
}

/**
 * グローバルサービスインスタンス
 */
export const partnerApiService = new PartnerApiService();