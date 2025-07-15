/**
 * レピュテーション・脅威情報サービス
 *
 * 外部脅威情報源との統合、レピュテーションデータ管理
 */

import { EventEmitter } from 'events';

import type { Logger } from './logger.js';
import type {
  ReputationData,
  BlacklistStatus,
  ThreatIntelligence,
  HistoricalIncident,
  CommunityReport,
  SecurityConfig,
} from './security-types.js';

export class ReputationService extends EventEmitter {
  private logger: Logger;
  private config: SecurityConfig;
  private reputationCache: Map<string, ReputationData>;
  private threatIntelSources: Map<string, ThreatIntelSource>;
  private blacklistSources: Map<string, BlacklistSource>;
  private cacheTimeout: number;

  constructor(logger: Logger, config: SecurityConfig) {
    super();
    this.logger = logger;
    this.config = config;
    this.reputationCache = new Map();
    this.threatIntelSources = new Map();
    this.blacklistSources = new Map();
    this.cacheTimeout = config.reputationChecking.cacheTimeout;

    this.initializeReputationSources();
  }

  /**
   * ドメインのレピュテーションデータ取得
   */
  async getReputationData(domain: string): Promise<ReputationData> {
    // キャッシュ確認
    const cached = this.reputationCache.get(domain);
    if (cached && this.isCacheValid(domain)) {
      this.logger.debug('レピュテーションデータキャッシュヒット', { domain });
      return cached;
    }

    this.logger.info('レピュテーションデータ取得開始', { domain });

    try {
      const [
        blacklistStatus,
        threatIntelligence,
        historicalIncidents,
        communityReports,
      ] = await Promise.all([
        this.checkBlacklistStatus(domain),
        this.getThreatIntelligence(domain),
        this.getHistoricalIncidents(domain),
        this.getCommunityReports(domain),
      ]);

      const reputationData: ReputationData = {
        blacklistStatus,
        threatIntelligence,
        historicalIncidents,
        communityReports,
      };

      // キャッシュに保存
      this.reputationCache.set(domain, reputationData);
      this.setCacheTimestamp(domain);

      this.logger.info('レピュテーションデータ取得完了', {
        domain,
        blacklistCount: blacklistStatus.length,
        threatIntelCount: threatIntelligence.length,
        incidentCount: historicalIncidents.length,
        reportCount: communityReports.length,
      });

      return reputationData;
    } catch (error) {
      this.logger.error('レピュテーションデータ取得エラー', error as Error);
      throw error;
    }
  }

  /**
   * ブラックリストステータス確認
   */
  private async checkBlacklistStatus(
    domain: string
  ): Promise<BlacklistStatus[]> {
    const statuses: BlacklistStatus[] = [];
    const enabledSources = this.config.reputationChecking.enabledSources;

    const checks = enabledSources
      .filter(source => this.blacklistSources.has(source))
      .map(async source => {
        try {
          const blacklistSource = this.blacklistSources.get(source)!;
          const status = await blacklistSource.checkDomain(domain);
          return {
            source,
            status: status.isBlacklisted
              ? ('blacklisted' as const)
              : ('clean' as const),
            lastChecked: Date.now(),
            reason: status.reason,
          };
        } catch (error) {
          this.logger.warn(`ブラックリスト確認エラー: ${source}`, {
            domain,
            error: (error as Error).message,
          });
          return null;
        }
      });

    const results = await Promise.allSettled(checks);

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        statuses.push(result.value);
      }
    });

    return statuses;
  }

  /**
   * 脅威情報取得
   */
  private async getThreatIntelligence(
    domain: string
  ): Promise<ThreatIntelligence[]> {
    const intelligence: ThreatIntelligence[] = [];
    const enabledSources = this.config.reputationChecking.enabledSources;

    const checks = enabledSources
      .filter(source => this.threatIntelSources.has(source))
      .map(async source => {
        try {
          const intelSource = this.threatIntelSources.get(source)!;
          const data = await intelSource.getThreatIntel(domain);
          return data.map(intel => ({
            source,
            threatType: intel.type,
            confidence: intel.confidence,
            lastSeen: intel.lastSeen,
            details: intel.details,
          }));
        } catch (error) {
          this.logger.warn(`脅威情報取得エラー: ${source}`, {
            domain,
            error: (error as Error).message,
          });
          return [];
        }
      });

    const results = await Promise.allSettled(checks);

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        intelligence.push(...result.value);
      }
    });

    return intelligence;
  }

  /**
   * 履歴インシデント取得
   */
  private async getHistoricalIncidents(
    domain: string
  ): Promise<HistoricalIncident[]> {
    try {
      // 実際の実装では内部データベースまたは外部APIから取得
      const incidents: HistoricalIncident[] = [];

      // サンプルデータ
      if (Math.random() > 0.8) {
        incidents.push({
          timestamp: Date.now() - 86400000, // 1日前
          type: 'phishing',
          description: 'フィッシングサイトとして報告された',
          severity: 'high',
        });
      }

      return incidents;
    } catch (error) {
      this.logger.warn('履歴インシデント取得エラー', {
        domain,
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * コミュニティレポート取得
   */
  private async getCommunityReports(
    domain: string
  ): Promise<CommunityReport[]> {
    try {
      const reports: CommunityReport[] = [];

      // 実際の実装では外部APIやコミュニティフィードから取得
      // サンプルデータ
      if (Math.random() > 0.9) {
        reports.push({
          source: 'community_watch',
          reportType: 'suspicious_activity',
          confidence: 75,
          timestamp: Date.now() - 3600000, // 1時間前
          details: 'コミュニティによって疑わしい活動が報告されました',
        });
      }

      return reports;
    } catch (error) {
      this.logger.warn('コミュニティレポート取得エラー', {
        domain,
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * レピュテーションソースの初期化
   */
  private initializeReputationSources(): void {
    // VirusTotal
    this.threatIntelSources.set('virustotal', new VirusTotalSource());
    this.blacklistSources.set('virustotal', new VirusTotalSource());

    // URLVoid
    this.blacklistSources.set('urlvoid', new URLVoidSource());

    // Cisco Umbrella
    this.threatIntelSources.set('cisco_umbrella', new CiscoUmbrellaSource());
    this.blacklistSources.set('cisco_umbrella', new CiscoUmbrellaSource());

    // OpenDNS
    this.blacklistSources.set('opendns', new OpenDNSSource());

    this.logger.info('レピュテーションソースを初期化しました', {
      threatIntelSources: this.threatIntelSources.size,
      blacklistSources: this.blacklistSources.size,
    });
  }

  // キャッシュ管理

  private isCacheValid(domain: string): boolean {
    const timestamp = this.getCacheTimestamp(domain);
    return timestamp && Date.now() - timestamp < this.cacheTimeout;
  }

  private setCacheTimestamp(domain: string): void {
    (this as Record<string, unknown>)[`${domain}_reputation_timestamp`] =
      Date.now();
  }

  private getCacheTimestamp(domain: string): number | null {
    return (
      ((this as Record<string, unknown>)[
        `${domain}_reputation_timestamp`
      ] as number) || null
    );
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.reputationCache.clear();
    this.logger.info('レピュテーションキャッシュをクリアしました');
  }

  /**
   * レピュテーション統計取得
   */
  getReputationStatistics(): {
    totalQueries: number;
    cacheHitRate: number;
    sourceAvailability: Record<string, boolean>;
    averageResponseTime: number;
  } {
    const sourceAvailability: Record<string, boolean> = {};

    // ソースの可用性チェック（サンプル）
    for (const [source] of this.threatIntelSources) {
      sourceAvailability[source] = Math.random() > 0.1; // 90%の可用性
    }

    return {
      totalQueries: this.reputationCache.size,
      cacheHitRate: 0.75, // サンプル値
      sourceAvailability,
      averageResponseTime: 1500, // ms, サンプル値
    };
  }
}

// レピュテーションソースのインターフェース

interface ThreatIntelSource {
  getThreatIntel(domain: string): Promise<
    {
      type: string;
      confidence: number;
      lastSeen: number;
      details: string;
    }[]
  >;
}

interface BlacklistSource {
  checkDomain(domain: string): Promise<{
    isBlacklisted: boolean;
    reason?: string;
  }>;
}

// レピュテーションソースの実装

class VirusTotalSource implements ThreatIntelSource, BlacklistSource {
  async getThreatIntel(_domain: string): Promise<
    {
      type: string;
      confidence: number;
      lastSeen: number;
      details: string;
    }[]
  > {
    // 実際の実装では VirusTotal API を呼び出し
    if (Math.random() > 0.8) {
      return [
        {
          type: 'malware',
          confidence: 85,
          lastSeen: Date.now() - 3600000,
          details: 'VirusTotal による検出',
        },
      ];
    }
    return [];
  }

  async checkDomain(
    _domain: string
  ): Promise<{ isBlacklisted: boolean; reason?: string }> {
    // 実際の実装では VirusTotal API を呼び出し
    const isBlacklisted = Math.random() > 0.9;
    return {
      isBlacklisted,
      reason: isBlacklisted
        ? 'VirusTotal データベースにブラックリスト登録'
        : undefined,
    };
  }
}

class URLVoidSource implements BlacklistSource {
  async checkDomain(
    _domain: string
  ): Promise<{ isBlacklisted: boolean; reason?: string }> {
    // 実際の実装では URLVoid API を呼び出し
    const isBlacklisted = Math.random() > 0.95;
    return {
      isBlacklisted,
      reason: isBlacklisted
        ? 'URLVoid データベースにブラックリスト登録'
        : undefined,
    };
  }
}

class CiscoUmbrellaSource implements ThreatIntelSource, BlacklistSource {
  async getThreatIntel(_domain: string): Promise<
    {
      type: string;
      confidence: number;
      lastSeen: number;
      details: string;
    }[]
  > {
    // 実際の実装では Cisco Umbrella API を呼び出し
    if (Math.random() > 0.85) {
      return [
        {
          type: 'phishing',
          confidence: 90,
          lastSeen: Date.now() - 1800000,
          details: 'Cisco Umbrella による検出',
        },
      ];
    }
    return [];
  }

  async checkDomain(
    _domain: string
  ): Promise<{ isBlacklisted: boolean; reason?: string }> {
    // 実際の実装では Cisco Umbrella API を呼び出し
    const isBlacklisted = Math.random() > 0.92;
    return {
      isBlacklisted,
      reason: isBlacklisted
        ? 'Cisco Umbrella データベースにブラックリスト登録'
        : undefined,
    };
  }
}

class OpenDNSSource implements BlacklistSource {
  async checkDomain(
    _domain: string
  ): Promise<{ isBlacklisted: boolean; reason?: string }> {
    // 実際の実装では OpenDNS API を呼び出し
    const isBlacklisted = Math.random() > 0.93;
    return {
      isBlacklisted,
      reason: isBlacklisted
        ? 'OpenDNS データベースにブラックリスト登録'
        : undefined,
    };
  }
}
