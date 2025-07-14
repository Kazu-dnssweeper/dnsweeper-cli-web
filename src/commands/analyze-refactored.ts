/**
 * analyzeコマンド - ドメインリストの詳細分析（リファクタリング版）
 */

import { BaseCommand } from './base-command.js';
import { CSVProcessor } from '../lib/csv-processor.js';
import { DNSResolver } from '../lib/dns-resolver.js';
import { RiskCalculator } from '../lib/risk-calculator.js';
import { validateDNSServer } from '../lib/validators.js';
import type { IDNSRecord, OutputFormat, AnalysisResult } from '../types/index.js';

interface AnalyzeOptions {
  format?: string;
  output?: string;
  timeout?: string;
  nameserver?: string;
  parallel?: string;
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
  colors?: boolean;
}

interface DomainAnalysis {
  domain: string;
  status: 'active' | 'inactive' | 'error';
  records: {
    A: IDNSRecord[];
    AAAA: IDNSRecord[];
    MX: IDNSRecord[];
    TXT: IDNSRecord[];
    NS: IDNSRecord[];
    CNAME: IDNSRecord[];
  };
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  error?: string;
}

export class AnalyzeCommand extends BaseCommand {
  private csvProcessor!: CSVProcessor;
  private resolver!: DNSResolver;
  private riskCalculator!: RiskCalculator;

  constructor() {
    super('analyze', 'ドメインリストを読み込んで詳細分析');
    this.setupCommand();
  }

  private setupCommand(): void {
    this.command
      .argument('<file>', 'CSVファイルのパス')
      .option(
        '-f, --format <format>',
        '出力形式 (table, json, csv)',
        'table'
      )
      .option('--timeout <ms>', 'タイムアウト (ミリ秒)', '5000')
      .option('-n, --nameserver <server>', 'カスタムネームサーバー')
      .option('-p, --parallel <count>', '並列処理数', '10');

    // 出力オプションを追加
    this.addOutputOptions();

    // アクションを設定
    this.setAction(this.execute.bind(this));
  }

  async execute(file: string, options: AnalyzeOptions): Promise<void> {
    // Loggerを初期化
    this.initLogger(options);

    // ファイルの検証
    const filePath = this.validateFileExists(file);
    
    // オプションの検証
    const timeout = this.validateTimeout(options.timeout);
    const parallel = this.validateParallel(options.parallel);
    const format = this.validateOutputFormat(
      options.json ? 'json' : options.format,
      ['table', 'json', 'csv']
    );

    // カスタムネームサーバーの検証
    if (options.nameserver) {
      validateDNSServer(options.nameserver);
    }

    // コンポーネントの初期化
    this.csvProcessor = new CSVProcessor();
    this.resolver = new DNSResolver({
      timeout,
      servers: options.nameserver ? [options.nameserver] : undefined,
    });
    this.riskCalculator = new RiskCalculator({ logger: this.logger });

    // CSVファイルの読み込み
    const domains = await this.executeWithSpinner(
      'CSVファイルを読み込み中...',
      async () => {
        const records = await this.csvProcessor.read(filePath);
        return this.extractDomains(records);
      },
      `ドメインの読み込み完了`,
      'ファイルの読み込みに失敗しました'
    );

    this.logger.info(`${domains.length} 件のドメインを分析します`);

    // ドメインの分析
    const results = await this.analyzeDomains(domains, parallel);

    // サマリーの生成
    const summary = this.generateSummary(results);

    // 結果の出力
    const output = {
      summary,
      domains: results,
      metadata: {
        analyzedAt: new Date().toISOString(),
        totalDomains: domains.length,
        activeCount: summary.activeCount,
        inactiveCount: summary.inactiveCount,
        errorCount: summary.errorCount,
      },
    };

    await this.outputResults(output, format as OutputFormat, options);
  }

  /**
   * ドメインの抽出
   */
  private extractDomains(records: any[]): string[] {
    const domains = new Set<string>();

    for (const record of records) {
      // 'domain', 'name', 'ドメイン名' などのカラムを探す
      const domain = record.domain || record.name || record['ドメイン名'] || record.Domain;
      if (domain && typeof domain === 'string') {
        domains.add(domain.trim().toLowerCase());
      }
    }

    if (domains.size === 0) {
      throw new Error('CSVファイルからドメインを抽出できませんでした');
    }

    return Array.from(domains);
  }

  /**
   * ドメインの分析
   */
  private async analyzeDomains(
    domains: string[],
    parallel: number
  ): Promise<DomainAnalysis[]> {
    const results: DomainAnalysis[] = [];
    const total = domains.length;
    let completed = 0;

    // バッチ処理
    for (let i = 0; i < domains.length; i += parallel) {
      const batch = domains.slice(i, i + parallel);
      
      const batchResults = await Promise.all(
        batch.map(domain => this.analyzeSingleDomain(domain))
      );

      results.push(...batchResults);
      completed += batch.length;

      // 進捗表示
      if (this.logger.verbose || completed % 50 === 0) {
        this.logger.info(`進捗: ${completed}/${total} (${Math.round(completed / total * 100)}%)`);
      }
    }

    return results;
  }

  /**
   * 単一ドメインの分析
   */
  private async analyzeSingleDomain(domain: string): Promise<DomainAnalysis> {
    try {
      // 基本的なドメイン検証
      this.validateDomain(domain);

      // 各レコードタイプの解決
      const [a, aaaa, mx, txt, ns, cname] = await Promise.all([
        this.resolveRecords(domain, 'A'),
        this.resolveRecords(domain, 'AAAA'),
        this.resolveRecords(domain, 'MX'),
        this.resolveRecords(domain, 'TXT'),
        this.resolveRecords(domain, 'NS'),
        this.resolveRecords(domain, 'CNAME'),
      ]);

      const records = { A: a, AAAA: aaaa, MX: mx, TXT: txt, NS: ns, CNAME: cname };
      const allRecords = [...a, ...aaaa, ...mx, ...txt, ...ns, ...cname];

      // ステータスの判定
      const status = allRecords.length > 0 ? 'active' : 'inactive';

      // リスク分析
      const riskScore = await this.riskCalculator.calculateRiskScore(domain, allRecords);
      const factors = this.riskCalculator.identifyRiskFactors(allRecords);

      return {
        domain,
        status,
        records,
        riskScore,
        riskLevel: this.getRiskLevel(riskScore),
        factors,
      };
    } catch (error) {
      return {
        domain,
        status: 'error',
        records: { A: [], AAAA: [], MX: [], TXT: [], NS: [], CNAME: [] },
        riskScore: 0,
        riskLevel: 'low',
        factors: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * レコードの解決
   */
  private async resolveRecords(domain: string, type: string): Promise<IDNSRecord[]> {
    try {
      const result = await this.resolver.resolve(domain, type as any);
      return this.convertToIDNSRecords(result, domain, type as any);
    } catch {
      return [];
    }
  }

  /**
   * 並列処理数の検証
   */
  private validateParallel(value: string | undefined): number {
    const parallel = parseInt(value || '10', 10);
    if (isNaN(parallel) || parallel < 1 || parallel > 100) {
      throw new Error('並列処理数は1-100の範囲で指定してください');
    }
    return parallel;
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
   * サマリーの生成
   */
  private generateSummary(results: DomainAnalysis[]): {
    activeCount: number;
    inactiveCount: number;
    errorCount: number;
    riskDistribution: Record<string, number>;
    topRiskFactors: Array<{ factor: string; count: number }>;
  } {
    const activeCount = results.filter(r => r.status === 'active').length;
    const inactiveCount = results.filter(r => r.status === 'inactive').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    // リスク分布
    const riskDistribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    results.forEach(r => {
      riskDistribution[r.riskLevel]++;
    });

    // リスク要因の集計
    const factorCounts = new Map<string, number>();
    results.forEach(r => {
      r.factors.forEach(factor => {
        factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
      });
    });

    const topRiskFactors = Array.from(factorCounts.entries())
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      activeCount,
      inactiveCount,
      errorCount,
      riskDistribution,
      topRiskFactors,
    };
  }
}

/**
 * analyzeコマンドを作成（後方互換性のため）
 */
export function createAnalyzeCommand() {
  const command = new AnalyzeCommand();
  return command.getCommand();
}