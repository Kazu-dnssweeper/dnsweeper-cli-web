/**
 * 地域設定管理システム
 *
 * 地域別DNS設定の管理、初期化、取得機能
 */

import type { Logger } from './logger.js';
import type { RegionalDNSConfig } from './regional-dns-types.js';

export class RegionalConfigManager {
  private logger: Logger;
  private regionalConfigs: Map<string, RegionalDNSConfig>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.regionalConfigs = new Map();
    this.initializeRegionalConfigs();
  }

  /**
   * 地域設定の取得
   */
  getRegionalConfig(region: string): RegionalDNSConfig | undefined {
    return this.regionalConfigs.get(region);
  }

  /**
   * すべての地域設定の取得
   */
  getAllRegionalConfigs(): Map<string, RegionalDNSConfig> {
    return new Map(this.regionalConfigs);
  }

  /**
   * 利用可能な地域リスト取得
   */
  getAvailableRegions(): string[] {
    return Array.from(this.regionalConfigs.keys());
  }

  /**
   * 地域設定の更新
   */
  updateRegionalConfig(
    region: string,
    config: Partial<RegionalDNSConfig>
  ): void {
    const existingConfig = this.regionalConfigs.get(region);
    if (existingConfig) {
      const updatedConfig = { ...existingConfig, ...config };
      this.regionalConfigs.set(region, updatedConfig);

      this.logger.info('地域設定を更新しました', {
        region,
        updatedFields: Object.keys(config),
      });
    } else {
      this.logger.warn('存在しない地域の設定更新を試行しました', { region });
    }
  }

  /**
   * 新しい地域設定の追加
   */
  addRegionalConfig(region: string, config: RegionalDNSConfig): void {
    if (this.regionalConfigs.has(region)) {
      this.logger.warn('既存の地域設定を上書きしました', { region });
    }

    this.regionalConfigs.set(region, config);
    this.logger.info('新しい地域設定を追加しました', { region });
  }

  /**
   * 地域設定の削除
   */
  removeRegionalConfig(region: string): boolean {
    const result = this.regionalConfigs.delete(region);
    if (result) {
      this.logger.info('地域設定を削除しました', { region });
    } else {
      this.logger.warn('存在しない地域設定の削除を試行しました', { region });
    }
    return result;
  }

  /**
   * 地域設定のバリデーション
   */
  validateRegionalConfig(config: RegionalDNSConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 必須フィールドのチェック
    if (!config.region) errors.push('地域名は必須です');
    if (!config.name) errors.push('設定名は必須です');
    if (!config.primaryDNS || config.primaryDNS.length === 0) {
      errors.push('プライマリDNSサーバーは最低1つ必要です');
    }

    // DNS設定のバリデーション
    const dnsServers = [
      ...config.primaryDNS,
      ...config.secondaryDNS,
      ...config.localDNS,
    ];
    for (const dns of dnsServers) {
      if (!this.isValidDNSServer(dns)) {
        errors.push(`無効なDNSサーバー: ${dns}`);
      }
    }

    // パフォーマンス目標のバリデーション
    if (config.performanceTargets.responseTime <= 0) {
      errors.push('応答時間目標は正の数である必要があります');
    }
    if (
      config.performanceTargets.uptime < 0 ||
      config.performanceTargets.uptime > 100
    ) {
      errors.push('稼働率目標は0-100の範囲で設定してください');
    }

    // ビジネス時間のバリデーション
    if (
      !this.isValidTimeFormat(config.businessHours.start) ||
      !this.isValidTimeFormat(config.businessHours.end)
    ) {
      errors.push('ビジネス時間の形式が無効です (HH:mm形式で入力してください)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 地域別DNS設定の初期化
   */
  private initializeRegionalConfigs(): void {
    // 北米地域設定
    this.regionalConfigs.set('north-america', {
      region: 'north-america',
      name: '北米地域DNS設定',
      primaryDNS: ['8.8.8.8', '8.8.4.4'],
      secondaryDNS: ['1.1.1.1', '1.0.0.1'],
      localDNS: ['208.67.222.222', '208.67.220.220'],
      cdnPreferences: ['cloudflare', 'fastly', 'amazon-cloudfront'],
      optimizationTargets: ['低遅延', '高可用性', 'CDN最適化'],
      securityFeatures: ['dnssec', 'dns-over-https', 'threat-filtering'],
      performanceTargets: {
        responseTime: 10,
        uptime: 99.9,
        throughput: 10000,
      },
      complianceRequirements: {
        dataLocalization: false,
        encryptionRequired: true,
        auditLogging: true,
        retentionPeriod: 2555, // 7年
      },
      businessHours: {
        timezone: 'America/New_York',
        start: '09:00',
        end: '17:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      supportedLanguages: ['en', 'es'],
    });

    // ヨーロッパ地域設定
    this.regionalConfigs.set('europe', {
      region: 'europe',
      name: 'ヨーロッパ地域DNS設定',
      primaryDNS: ['1.1.1.1', '1.0.0.1'],
      secondaryDNS: ['8.8.8.8', '8.8.4.4'],
      localDNS: ['213.73.91.35', '212.89.130.180'],
      cdnPreferences: ['fastly', 'cloudflare', 'keycdn'],
      optimizationTargets: ['GDPR準拠', '低遅延', 'データローカライゼーション'],
      securityFeatures: ['dnssec', 'dns-over-https', 'gdpr-compliance'],
      performanceTargets: {
        responseTime: 15,
        uptime: 99.95,
        throughput: 8000,
      },
      complianceRequirements: {
        dataLocalization: true,
        encryptionRequired: true,
        auditLogging: true,
        retentionPeriod: 2190, // 6年
      },
      businessHours: {
        timezone: 'Europe/London',
        start: '09:00',
        end: '17:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      supportedLanguages: ['en', 'de', 'fr', 'es', 'it'],
    });

    // アジア太平洋地域設定
    this.regionalConfigs.set('asia-pacific', {
      region: 'asia-pacific',
      name: 'アジア太平洋地域DNS設定',
      primaryDNS: ['1.1.1.1', '1.0.0.1'],
      secondaryDNS: ['8.8.8.8', '8.8.4.4'],
      localDNS: ['210.17.9.228', '168.95.1.1'],
      cdnPreferences: ['amazon-cloudfront', 'alibaba-cloud', 'naver-cloud'],
      optimizationTargets: ['低遅延', '高スループット', '多言語対応'],
      securityFeatures: ['dnssec', 'dns-over-https', 'threat-filtering'],
      performanceTargets: {
        responseTime: 20,
        uptime: 99.8,
        throughput: 12000,
      },
      complianceRequirements: {
        dataLocalization: true,
        encryptionRequired: true,
        auditLogging: true,
        retentionPeriod: 1825, // 5年
      },
      businessHours: {
        timezone: 'Asia/Tokyo',
        start: '09:00',
        end: '18:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      supportedLanguages: ['ja', 'ko', 'zh', 'en'],
    });

    // 中国地域設定
    this.regionalConfigs.set('china', {
      region: 'china',
      name: '中国地域DNS設定',
      primaryDNS: ['223.5.5.5', '223.6.6.6'],
      secondaryDNS: ['114.114.114.114', '114.114.115.115'],
      localDNS: ['180.76.76.76', '119.29.29.29'],
      cdnPreferences: ['alibaba-cloud', 'tencent-cloud', 'baidu-cloud'],
      optimizationTargets: ['国内アクセス最適化', '法規制準拠', 'ICP対応'],
      securityFeatures: ['dnssec', 'local-compliance', 'content-filtering'],
      performanceTargets: {
        responseTime: 25,
        uptime: 99.5,
        throughput: 15000,
      },
      complianceRequirements: {
        dataLocalization: true,
        encryptionRequired: true,
        auditLogging: true,
        retentionPeriod: 1825, // 5年
      },
      businessHours: {
        timezone: 'Asia/Shanghai',
        start: '09:00',
        end: '18:00',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      supportedLanguages: ['zh'],
    });

    this.logger.info('地域別DNS設定を初期化しました', {
      regionCount: this.regionalConfigs.size,
      regions: Array.from(this.regionalConfigs.keys()),
    });
  }

  /**
   * DNSサーバーのバリデーション
   */
  private isValidDNSServer(dns: string): boolean {
    // IPv4アドレスの形式チェック
    const ipv4Pattern =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6アドレスの形式チェック（簡易版）
    const ipv6Pattern = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    // ホスト名の形式チェック
    const hostnamePattern =
      /^(?=.{1,253}$)(?:(?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)*(?!-)([a-zA-Z0-9-]{1,63})(?<!-)$/;

    return (
      ipv4Pattern.test(dns) ||
      ipv6Pattern.test(dns) ||
      hostnamePattern.test(dns)
    );
  }

  /**
   * 時間形式のバリデーション
   */
  private isValidTimeFormat(time: string): boolean {
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timePattern.test(time);
  }

  /**
   * 設定統計の取得
   */
  getConfigStatistics(): {
    totalRegions: number;
    avgPrimaryDNS: number;
    avgSecondaryDNS: number;
    mostCommonSecurityFeatures: string[];
    avgResponseTimeTarget: number;
  } {
    const configs = Array.from(this.regionalConfigs.values());

    const securityFeatureCounts = new Map<string, number>();
    let totalResponseTime = 0;
    let totalPrimaryDNS = 0;
    let totalSecondaryDNS = 0;

    configs.forEach(config => {
      totalPrimaryDNS += config.primaryDNS.length;
      totalSecondaryDNS += config.secondaryDNS.length;
      totalResponseTime += config.performanceTargets.responseTime;

      config.securityFeatures.forEach(feature => {
        securityFeatureCounts.set(
          feature,
          (securityFeatureCounts.get(feature) || 0) + 1
        );
      });
    });

    const mostCommonSecurityFeatures = Array.from(
      securityFeatureCounts.entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([feature]) => feature);

    return {
      totalRegions: configs.length,
      avgPrimaryDNS: Math.round((totalPrimaryDNS / configs.length) * 10) / 10,
      avgSecondaryDNS:
        Math.round((totalSecondaryDNS / configs.length) * 10) / 10,
      mostCommonSecurityFeatures,
      avgResponseTimeTarget:
        Math.round((totalResponseTime / configs.length) * 10) / 10,
    };
  }
}
