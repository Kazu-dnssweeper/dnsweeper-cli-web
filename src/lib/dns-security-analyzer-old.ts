/**
 * DNS脅威検出・防御システム - メインクラス
 *
 * 分離された機能モジュールを統合する軽量なマネージャークラス
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';
import { NetworkAnalyzer } from './network-analysis.js';
import { ReputationService } from './reputation-service.js';
import { ThreatDetectors } from './threat-detectors.js';

import type {
  SecurityThreat,
  SecurityConfig,
  ThreatDetectionResult,
  ThreatStatistics,
  NetworkAnalysis,
  ReputationData,
  AlgorithmicAnalysis,
} from './security-types.js';
import type { IDNSRecord as DNSRecord } from '../types/index.js';

/**
 * DNS脅威検出・防御システム
 */
export class DNSSecurityAnalyzer extends EventEmitter {
  private logger: Logger;
  private config: SecurityConfig;
  private threatDatabase: Map<string, SecurityThreat[]>;
  private monitoringInterval?: NodeJS.Timeout;

  // 機能モジュール
  private threatDetectors: ThreatDetectors;
  private networkAnalyzer: NetworkAnalyzer;
  private reputationService: ReputationService;

  constructor(logger?: Logger, config?: Partial<SecurityConfig>) {
    super();

    this.logger = logger || new Logger({ verbose: false });
    this.config = {
      threatDetection: {
        enabledAnalyzers: [
          'malware',
          'phishing',
          'typosquatting',
          'dga',
          'fastflux',
        ],
        confidenceThreshold: 70,
        realTimeMonitoring: true,
      },
      reputationChecking: {
        enabledSources: ['virustotal', 'urlvoid', 'cisco_umbrella', 'opendns'],
        cacheTimeout: 3600000, // 1時間
        parallelChecks: 5,
      },
      alerting: {
        enabledChannels: ['log', 'webhook', 'email'],
        severityThreshold: 'medium',
        rateLimiting: true,
      },
      mitigation: {
        autoBlocking: false,
        quarantineEnabled: true,
        alertingEnabled: true,
      },
      ...config,
    };

    this.threatDatabase = new Map();

    // 機能モジュールの初期化
    this.threatDetectors = new ThreatDetectors(this.logger, this.config);
    this.networkAnalyzer = new NetworkAnalyzer(this.logger, this.config);
    this.reputationService = new ReputationService(this.logger, this.config);

    // イベント転送の設定
    this.setupEventForwarding();

    this.logger.info('DNS脅威検出システム初期化完了', {
      enabledAnalyzers: this.config.threatDetection.enabledAnalyzers,
      confidenceThreshold: this.config.threatDetection.confidenceThreshold,
    });
  }

  /**
   * イベント転送の設定
   */
  private setupEventForwarding(): void {
    // ネットワーク分析のイベント転送
    this.networkAnalyzer.on('analysis-completed', data => {
      this.emit('network-analysis-completed', data);
    });

    // レピュテーションサービスのイベント転送
    this.reputationService.on('reputation-updated', data => {
      this.emit('reputation-updated', data);
    });
  }

  /**
   * 包括的セキュリティ分析
   */
  async analyzeSecurityThreats(
    domains: string[],
    records: DNSRecord[]
  ): Promise<SecurityThreat[]> {
    this.logger.info('DNS脅威検出分析を開始します', {
      domainCount: domains.length,
      recordCount: records.length,
    });

    const threats: SecurityThreat[] = [];
    const startTime = Date.now();

    try {
      // 並列分析の実行
      const analysisPromises = domains.map(domain =>
        this.analyzeDomainThreats(domain, records)
      );
      const domainThreats = await Promise.all(analysisPromises);

      // 結果のマージ
      domainThreats.forEach(threats_array => {
        threats.push(...threats_array);
      });

      // 重複排除と優先度ソート
      const uniqueThreats = this.deduplicateAndSortThreats(threats);

      const analysisTime = Date.now() - startTime;

      this.logger.info('DNS脅威検出分析が完了しました', {
        threatsFound: uniqueThreats.length,
        analysisTime,
        criticalThreats: uniqueThreats.filter(t => t.severity === 'critical')
          .length,
      });

      // 脅威データベースに記録
      uniqueThreats.forEach(threat => {
        this.recordThreat(threat);
        this.emitThreatAlert(threat);
      });

      return uniqueThreats;
    } catch (error) {
      this.logger.error('DNS脅威検出分析エラー', error as Error);
      throw error;
    }
  }

  /**
   * 単一ドメインの脅威分析
   */
  private async analyzeDomainThreats(
    domain: string,
    records: DNSRecord[]
  ): Promise<SecurityThreat[]> {
    const threats: SecurityThreat[] = [];
    const domainRecords = records.filter(
      r => r.name === domain || r.name.endsWith(`.${domain}`)
    );

    // 有効なアナライザーのみを実行
    const enabledAnalyzers = this.config.threatDetection.enabledAnalyzers;
    const analyzers: Promise<SecurityThreat[]>[] = [];

    if (enabledAnalyzers.includes('malware')) {
      analyzers.push(this.threatDetectors.detectMalware(domain, domainRecords));
    }
    if (enabledAnalyzers.includes('phishing')) {
      analyzers.push(
        this.threatDetectors.detectPhishing(domain, domainRecords)
      );
    }
    if (enabledAnalyzers.includes('typosquatting')) {
      analyzers.push(
        this.threatDetectors.detectTyposquatting(domain, domainRecords)
      );
    }
    if (enabledAnalyzers.includes('dga')) {
      analyzers.push(this.threatDetectors.detectDGA(domain, domainRecords));
    }
    if (enabledAnalyzers.includes('fastflux')) {
      analyzers.push(
        this.threatDetectors.detectFastFlux(domain, domainRecords)
      );
    }
    if (enabledAnalyzers.includes('dns_hijacking')) {
      analyzers.push(
        this.threatDetectors.detectDNSHijacking(domain, domainRecords)
      );
    }
    if (enabledAnalyzers.includes('cache_poisoning')) {
      analyzers.push(
        this.threatDetectors.detectCachePoisoning(domain, domainRecords)
      );
    }
    if (enabledAnalyzers.includes('subdomain_takeover')) {
      analyzers.push(
        this.threatDetectors.detectSubdomainTakeover(domain, domainRecords)
      );
    }

    const results = await Promise.allSettled(analyzers);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        threats.push(...result.value);
      } else if (result.status === 'rejected') {
        this.logger.warn(
          `脅威検出アナライザー ${index} でエラーが発生しました:`,
          result.reason
        );
      }
    });

    return threats;
  }

  // 公開API - 分析機能

  /**
   * ネットワーク分析実行
   */
  async performNetworkAnalysis(domain: string): Promise<NetworkAnalysis> {
    return await this.networkAnalyzer.performNetworkAnalysis(domain);
  }

  /**
   * レピュテーションデータ取得
   */
  async getReputationData(domain: string): Promise<ReputationData> {
    return await this.reputationService.getReputationData(domain);
  }

  /**
   * アルゴリズム分析実行
   */
  async performAlgorithmicAnalysis(
    domain: string
  ): Promise<AlgorithmicAnalysis> {
    // 基本的なアルゴリズム分析
    const entropyScore = this.calculateEntropyScore(domain);
    const randomnessScore = this.calculateRandomnessScore(domain);

    return {
      domainGenerationScore: randomnessScore,
      typosquattingScore: this.calculateTyposquattingScore(domain),
      homographScore: this.calculateHomographScore(domain),
      entropyScore,
      ngramAnalysis: this.performNgramAnalysis(domain),
      lexicalAnalysis: this.performLexicalAnalysis(domain),
    };
  }

  // 公開API - 監視機能

  /**
   * リアルタイム監視の開始
   */
  startRealTimeMonitoring(intervalMs = 60000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.emit('monitoring-cycle');
    }, intervalMs);

    this.logger.info('リアルタイム脅威監視を開始しました', {
      interval: intervalMs,
    });
  }

  /**
   * 監視停止
   */
  stopRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.logger.info('リアルタイム脅威監視を停止しました');
    }
  }

  // 公開API - データ管理

  /**
   * 脅威データベースの取得
   */
  getThreatDatabase(): Map<string, SecurityThreat[]> {
    return new Map(this.threatDatabase);
  }

  /**
   * 脅威統計の取得
   */
  getThreatStatistics(): ThreatStatistics {
    const allThreats = Array.from(this.threatDatabase.values()).flat();

    return {
      totalThreats: allThreats.length,
      threatsByType: allThreats.reduce(
        (acc, threat) => {
          acc[threat.type] = (acc[threat.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      threatsBySeverity: allThreats.reduce(
        (acc, threat) => {
          acc[threat.severity] = (acc[threat.severity] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      recentThreats: allThreats
        .filter(threat => Date.now() - threat.timestamp < 86400000) // 24時間以内
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
    };
  }

  /**
   * システム統計の取得
   */
  getSystemStatistics(): {
    networkAnalysis: ReturnType<NetworkAnalyzer['getAnalysisStatistics']>;
    reputation: ReturnType<ReputationService['getReputationStatistics']>;
    threats: ThreatStatistics;
  } {
    return {
      networkAnalysis: this.networkAnalyzer.getAnalysisStatistics(),
      reputation: this.reputationService.getReputationStatistics(),
      threats: this.getThreatStatistics(),
    };
  }

  // 内部メソッド

  private deduplicateAndSortThreats(
    threats: SecurityThreat[]
  ): SecurityThreat[] {
    const unique = new Map<string, SecurityThreat>();

    threats.forEach(threat => {
      const key = `${threat.type}-${threat.domain}`;
      const existing = unique.get(key);

      if (!existing || threat.confidence > existing.confidence) {
        unique.set(key, threat);
      }
    });

    return Array.from(unique.values()).sort((a, b) => {
      // 重要度でソート
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff =
        severityOrder[b.severity] - severityOrder[a.severity];

      if (severityDiff !== 0) return severityDiff;

      // 信頼度でソート
      return b.confidence - a.confidence;
    });
  }

  private recordThreat(threat: SecurityThreat): void {
    const domainThreats = this.threatDatabase.get(threat.domain) || [];
    domainThreats.push(threat);
    this.threatDatabase.set(threat.domain, domainThreats);
  }

  private emitThreatAlert(threat: SecurityThreat): void {
    this.emit('threat', threat);

    if (threat.severity === 'critical' || threat.severity === 'high') {
      this.emit('high-priority-threat', threat);
    }
  }

  // アルゴリズム分析の実装

  private calculateEntropyScore(domain: string): number {
    const chars = domain.replace(/[^a-zA-Z0-9]/g, '');
    const charCounts = new Map<string, number>();

    for (const char of chars) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }

    let entropy = 0;
    const total = chars.length;

    for (const count of charCounts.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    return Math.round((entropy / Math.log2(36)) * 100); // 正規化して0-100に
  }

  private calculateRandomnessScore(domain: string): number {
    // 簡易的なランダム性スコア計算
    const chars = domain.replace(/[^a-zA-Z0-9]/g, '');
    let randomnessScore = 0;

    // 連続文字の検出
    let consecutiveCount = 1;
    for (let i = 1; i < chars.length; i++) {
      if (chars[i] === chars[i - 1]) {
        consecutiveCount++;
      } else {
        if (consecutiveCount > 2) {
          randomnessScore += 20; // 連続文字はランダム性を下げる
        }
        consecutiveCount = 1;
      }
    }

    // 数字と文字の混在
    const hasNumbers = /\d/.test(chars);
    const hasLetters = /[a-zA-Z]/.test(chars);
    if (hasNumbers && hasLetters) {
      randomnessScore += 30;
    }

    return Math.min(100, randomnessScore);
  }

  private calculateTyposquattingScore(domain: string): number {
    // 実際の実装では既知の人気ドメインとの類似度を計算
    return Math.random() * 100;
  }

  private calculateHomographScore(domain: string): number {
    // ホモグラフ攻撃の検出（同じ見た目の異なる文字）
    const homographChars = ['а', 'е', 'о', 'р', 'с', 'х']; // キリル文字の例
    let score = 0;

    for (const char of domain) {
      if (homographChars.includes(char)) {
        score += 25;
      }
    }

    return Math.min(100, score);
  }

  private performNgramAnalysis(
    domain: string
  ): AlgorithmicAnalysis['ngramAnalysis'] {
    const chars = domain.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const bigrams = new Map<string, number>();
    const trigrams = new Map<string, number>();

    // バイグラム分析
    for (let i = 0; i < chars.length - 1; i++) {
      const bigram = chars.slice(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }

    // トライグラム分析
    for (let i = 0; i < chars.length - 2; i++) {
      const trigram = chars.slice(i, i + 3);
      trigrams.set(trigram, (trigrams.get(trigram) || 0) + 1);
    }

    return {
      bigramScore:
        (Array.from(bigrams.values()).reduce((a, b) => a + b, 0) /
          chars.length) *
        100,
      trigramScore:
        (Array.from(trigrams.values()).reduce((a, b) => a + b, 0) /
          chars.length) *
        100,
      characterFrequency: this.calculateCharacterFrequency(chars),
      suspiciousNgrams: [],
    };
  }

  private performLexicalAnalysis(
    domain: string
  ): AlgorithmicAnalysis['lexicalAnalysis'] {
    const chars = domain.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return {
      dictionaryScore: this.calculateDictionaryScore(chars),
      randomnessScore: this.calculateRandomnessScore(chars),
      pronounceabilityScore: this.calculatePronounceabilityScore(chars),
      languageDetection: 'en', // 簡易実装
      suspiciousTokens: [],
    };
  }

  private calculateCharacterFrequency(chars: string): Record<string, number> {
    const frequency: Record<string, number> = {};
    for (const char of chars) {
      frequency[char] = (frequency[char] || 0) + 1;
    }
    return frequency;
  }

  private calculateDictionaryScore(chars: string): number {
    // 実際の実装では辞書との照合を行う
    return Math.random() * 100;
  }

  private calculatePronounceabilityScore(chars: string): number {
    // 発音可能性のスコア（母音・子音の分布）
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    let vowelCount = 0;

    for (const char of chars) {
      if (vowels.includes(char)) {
        vowelCount++;
      }
    }

    const vowelRatio = vowelCount / chars.length;
    // 適度な母音比率（20-50%）が発音しやすい
    return vowelRatio >= 0.2 && vowelRatio <= 0.5 ? 80 : 40;
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.networkAnalyzer.clearCache();
    this.reputationService.clearCache();
    this.logger.info('全キャッシュをクリアしました');
  }
}

// グローバルセキュリティアナライザー
export const globalSecurityAnalyzer = new DNSSecurityAnalyzer();

// 後方互換性のためのエクスポート
export default DNSSecurityAnalyzer;

// 型定義の再エクスポート
export type * from './security-types.js';
