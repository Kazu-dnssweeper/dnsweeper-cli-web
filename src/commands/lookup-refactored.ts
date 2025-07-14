/**
 * lookupコマンド - DNS解決を実行して結果を表示（リファクタリング版）
 */

import { BaseCommand } from './base-command.js';
import { DNSResolver } from '../lib/dns-resolver.js';
import { RiskCalculator } from '../lib/risk-calculator.js';
import { validateRecordType, validateDNSServer } from '../lib/validators.js';
import type { DNSRecordType, IDNSRecord, OutputFormat, AnalysisResult } from '../types/index.js';

interface LookupOptions {
  type?: string;
  format?: string;
  output?: string;
  timeout?: string;
  nameserver?: string;
  verbose?: boolean;
  json?: boolean;
  quiet?: boolean;
  colors?: boolean;
  analyze?: boolean;
}

export class LookupCommand extends BaseCommand {
  private resolver!: DNSResolver;
  private riskCalculator!: RiskCalculator;

  constructor() {
    super('lookup', 'DNS解決を実行して結果を表示');
    this.setupCommand();
  }

  private setupCommand(): void {
    this.command
      .alias('resolve')
      .argument('<domain>', '解決するドメイン名')
      .option(
        '-t, --type <type>',
        'レコードタイプ (A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, PTR)',
        'A'
      )
      .option(
        '-f, --format <format>',
        '出力形式 (table, json, csv, text)',
        'table'
      )
      .option('--timeout <ms>', 'タイムアウト (ミリ秒)', '5000')
      .option('-n, --nameserver <server>', 'カスタムネームサーバー')
      .option('-a, --analyze', 'リスク分析を実行');

    // 出力オプションを追加
    this.addOutputOptions();

    // アクションを設定
    this.setAction(this.execute.bind(this));
  }

  async execute(domain: string, options: LookupOptions): Promise<void> {
    // Loggerを初期化
    this.initLogger(options);

    // バリデーション
    this.validateDomain(domain);
    const recordType = validateRecordType(options.type || 'A');
    const timeout = this.validateTimeout(options.timeout);
    const format = this.validateOutputFormat(
      options.json ? 'json' : options.format,
      ['table', 'json', 'csv', 'text']
    );

    // カスタムネームサーバーの検証
    if (options.nameserver) {
      validateDNSServer(options.nameserver);
    }

    // リゾルバーの初期化
    this.resolver = new DNSResolver({
      timeout,
      servers: options.nameserver ? [options.nameserver] : undefined,
    });

    if (options.analyze) {
      this.riskCalculator = new RiskCalculator({ logger: this.logger });
    }

    // DNS解決の実行
    const result = await this.executeWithSpinner(
      `${domain} の ${recordType} レコードを解決中...`,
      async () => {
        const lookupResult = await this.resolver.resolve(domain, recordType);
        const records = this.convertToIDNSRecords(lookupResult, domain, recordType);

        // リスク分析の実行（オプション）
        let analysisResult: AnalysisResult | undefined;
        if (options.analyze && this.riskCalculator) {
          analysisResult = await this.analyzeRecords(domain, records);
        }

        return {
          domain,
          recordType,
          records,
          metadata: {
            resolverUsed: options.nameserver || 'System Default',
            queryTime: new Date().toISOString(),
            recordCount: records.length,
          },
          analysis: analysisResult,
        };
      },
      '解決完了',
      '解決に失敗しました'
    );

    // 結果の表示
    this.logger.success(
      `${result.records.length} 件の ${recordType} レコードが見つかりました`
    );

    // 結果の出力
    await this.outputResults(result, format as OutputFormat, options);
  }

  /**
   * リスク分析の実行
   */
  private async analyzeRecords(
    domain: string,
    records: IDNSRecord[]
  ): Promise<AnalysisResult> {
    const riskScore = await this.riskCalculator.calculateRiskScore(domain, records);
    const factors = this.riskCalculator.identifyRiskFactors(records);

    return {
      domain,
      riskScore,
      riskLevel: this.getRiskLevel(riskScore),
      factors,
      recommendations: this.generateRecommendations(factors),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * リスクレベルの判定
   */
  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score <= 20) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 80) return 'high';
    return 'critical';
  }

  /**
   * 推奨事項の生成
   */
  private generateRecommendations(factors: string[]): string[] {
    const recommendations: string[] = [];

    if (factors.includes('No SPF record')) {
      recommendations.push('SPFレコードを設定してメールのなりすましを防ぎましょう');
    }
    if (factors.includes('No DMARC record')) {
      recommendations.push('DMARCレコードを設定してメール認証を強化しましょう');
    }
    if (factors.includes('No DNSSEC')) {
      recommendations.push('DNSSECを有効化してDNS応答の改ざんを防ぎましょう');
    }
    if (factors.includes('Short TTL')) {
      recommendations.push('TTLを適切な値に設定してDNSクエリの負荷を軽減しましょう');
    }
    if (factors.includes('Multiple MX with same priority')) {
      recommendations.push('MXレコードの優先度を適切に設定しましょう');
    }

    return recommendations;
  }
}

/**
 * lookupコマンドを作成（後方互換性のため）
 */
export function createLookupCommand() {
  const command = new LookupCommand();
  return command.getCommand();
}