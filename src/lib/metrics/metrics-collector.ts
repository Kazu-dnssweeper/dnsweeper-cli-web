/**
 * メトリクス収集システム
 */

import { EventEmitter } from 'node:events';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

import type { DNSRecordType } from '../../types/index.js';
import { globalTracker, getSystemMetrics, type SystemMetrics } from '../../utils/performance.js';

/**
 * メトリクスのタイプ
 */
export type MetricType = 
  | 'dns_resolution'
  | 'csv_processing'
  | 'risk_analysis'
  | 'command_execution'
  | 'api_call'
  | 'cache_hit'
  | 'error';

/**
 * メトリクスデータ
 */
export interface MetricData {
  type: MetricType;
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string | number>;
  metadata?: Record<string, unknown>;
}

/**
 * DNS解決メトリクス
 */
export interface DnsResolutionMetrics {
  domain: string;
  recordType: DNSRecordType;
  duration: number;
  success: boolean;
  cached: boolean;
  error?: string;
}

/**
 * CSV処理メトリクス
 */
export interface CsvProcessingMetrics {
  fileName: string;
  recordCount: number;
  duration: number;
  bytesProcessed: number;
  format: string;
  errors: number;
}

/**
 * コマンド実行メトリクス
 */
export interface CommandMetrics {
  command: string;
  args: string[];
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * 集計されたメトリクス
 */
export interface AggregatedMetrics {
  period: {
    start: Date;
    end: Date;
  };
  totals: {
    dnsResolutions: number;
    csvRecordsProcessed: number;
    commandsExecuted: number;
    errors: number;
  };
  performance: {
    avgDnsResolutionTime: number;
    avgCsvProcessingTime: number;
    avgCommandExecutionTime: number;
  };
  topDomains: Array<{ domain: string; count: number }>;
  errorRate: number;
  system: SystemMetrics;
}

/**
 * メトリクス収集クラス
 */
export class MetricsCollector extends EventEmitter {
  private metrics: MetricData[] = [];
  private startTime: Date;
  private metricsDir: string;
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly maxMetricsInMemory = 10000;
  private readonly flushIntervalMs = 60000; // 1分

  constructor(metricsDir?: string) {
    super();
    this.startTime = new Date();
    this.metricsDir = metricsDir || join(homedir(), '.dnsweeper', 'metrics');
    this.setupAutoFlush();
  }

  /**
   * メトリクスを記録
   */
  record(metric: MetricData): void {
    this.metrics.push(metric);
    this.emit('metric', metric);

    // メモリ上限に達したら自動的にフラッシュ
    if (this.metrics.length >= this.maxMetricsInMemory) {
      this.flush().catch(err => {
        console.error('Failed to flush metrics:', err);
      });
    }
  }

  /**
   * DNS解決メトリクスを記録
   */
  recordDnsResolution(data: DnsResolutionMetrics): void {
    this.record({
      type: 'dns_resolution',
      name: `dns.${data.recordType.toLowerCase()}`,
      value: data.duration,
      timestamp: new Date(),
      tags: {
        domain: data.domain,
        recordType: data.recordType,
        success: data.success ? 1 : 0,
        cached: data.cached ? 1 : 0
      },
      metadata: data.error ? { error: data.error } : undefined
    });
  }

  /**
   * CSV処理メトリクスを記録
   */
  recordCsvProcessing(data: CsvProcessingMetrics): void {
    this.record({
      type: 'csv_processing',
      name: 'csv.process',
      value: data.duration,
      timestamp: new Date(),
      tags: {
        fileName: data.fileName,
        recordCount: data.recordCount,
        bytesProcessed: data.bytesProcessed,
        format: data.format,
        errors: data.errors
      }
    });
  }

  /**
   * コマンド実行メトリクスを記録
   */
  recordCommandExecution(data: CommandMetrics): void {
    this.record({
      type: 'command_execution',
      name: `command.${data.command}`,
      value: data.duration,
      timestamp: new Date(),
      tags: {
        command: data.command,
        success: data.success ? 1 : 0
      },
      metadata: {
        args: data.args,
        error: data.error
      }
    });
  }

  /**
   * エラーメトリクスを記録
   */
  recordError(error: Error, context?: Record<string, unknown>): void {
    this.record({
      type: 'error',
      name: 'error.count',
      value: 1,
      timestamp: new Date(),
      tags: {
        errorType: error.constructor.name,
        errorCode: (error as any).code || 'UNKNOWN'
      },
      metadata: {
        message: error.message,
        stack: error.stack,
        context
      }
    });
  }

  /**
   * キャッシュヒット率を記録
   */
  recordCacheHit(hit: boolean, cacheType: string): void {
    this.record({
      type: 'cache_hit',
      name: `cache.${cacheType}`,
      value: hit ? 1 : 0,
      timestamp: new Date(),
      tags: {
        hit: hit ? 1 : 0,
        cacheType
      }
    });
  }

  /**
   * メトリクスを集計
   */
  aggregate(startDate?: Date, endDate?: Date): AggregatedMetrics {
    const start = startDate || this.startTime;
    const end = endDate || new Date();
    
    const filteredMetrics = this.metrics.filter(
      m => m.timestamp >= start && m.timestamp <= end
    );

    // DNS解決メトリクス
    const dnsMetrics = filteredMetrics.filter(m => m.type === 'dns_resolution');
    const dnsSuccessful = dnsMetrics.filter(m => m.tags?.success === 1);
    
    // CSV処理メトリクス
    const csvMetrics = filteredMetrics.filter(m => m.type === 'csv_processing');
    const totalCsvRecords = csvMetrics.reduce(
      (sum, m) => sum + (m.tags?.recordCount as number || 0), 
      0
    );

    // コマンド実行メトリクス
    const commandMetrics = filteredMetrics.filter(m => m.type === 'command_execution');
    const successfulCommands = commandMetrics.filter(m => m.tags?.success === 1);

    // エラーメトリクス
    const errorMetrics = filteredMetrics.filter(m => m.type === 'error');

    // トップドメインの集計
    const domainCounts = new Map<string, number>();
    dnsMetrics.forEach(m => {
      const domain = m.tags?.domain as string;
      if (domain) {
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      }
    });
    
    const topDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    return {
      period: { start, end },
      totals: {
        dnsResolutions: dnsMetrics.length,
        csvRecordsProcessed: totalCsvRecords,
        commandsExecuted: commandMetrics.length,
        errors: errorMetrics.length
      },
      performance: {
        avgDnsResolutionTime: this.calculateAverage(dnsSuccessful.map(m => m.value)),
        avgCsvProcessingTime: this.calculateAverage(csvMetrics.map(m => m.value)),
        avgCommandExecutionTime: this.calculateAverage(successfulCommands.map(m => m.value))
      },
      topDomains,
      errorRate: filteredMetrics.length > 0 
        ? (errorMetrics.length / filteredMetrics.length) * 100 
        : 0,
      system: getSystemMetrics()
    };
  }

  /**
   * メトリクスをファイルに保存
   */
  async flush(): Promise<void> {
    if (this.metrics.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `metrics-${timestamp}.json`;
    const filePath = join(this.metricsDir, fileName);

    // ディレクトリを作成
    await mkdir(this.metricsDir, { recursive: true });

    // メトリクスを保存
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.aggregate()
    };

    await writeFile(filePath, JSON.stringify(data, null, 2));
    
    // メモリをクリア
    this.metrics = [];
    
    this.emit('flush', { fileName, recordCount: data.metrics.length });
  }

  /**
   * パフォーマンストラッカーと統合
   */
  integrateWithPerformanceTracker(): void {
    // パフォーマンス測定結果を自動的にメトリクスに変換
    setInterval(() => {
      const results = globalTracker.getResults();
      
      results.forEach(result => {
        if (result.duration > 0) {
          this.record({
            type: 'command_execution',
            name: `performance.${result.name}`,
            value: result.duration,
            timestamp: new Date(result.startTime),
            metadata: result.metadata
          });
        }
      });
      
      // 処理済みの結果をクリア
      globalTracker.clear();
    }, 10000); // 10秒ごと
  }

  /**
   * レポートを生成
   */
  generateReport(format: 'text' | 'json' = 'text'): string {
    const aggregated = this.aggregate();
    
    if (format === 'json') {
      return JSON.stringify(aggregated, null, 2);
    }

    const report: string[] = [
      '=== DNSweeper Metrics Report ===',
      '',
      `Period: ${aggregated.period.start.toISOString()} - ${aggregated.period.end.toISOString()}`,
      '',
      '--- Totals ---',
      `DNS Resolutions: ${aggregated.totals.dnsResolutions}`,
      `CSV Records Processed: ${aggregated.totals.csvRecordsProcessed}`,
      `Commands Executed: ${aggregated.totals.commandsExecuted}`,
      `Errors: ${aggregated.totals.errors}`,
      '',
      '--- Performance ---',
      `Avg DNS Resolution Time: ${aggregated.performance.avgDnsResolutionTime.toFixed(2)}ms`,
      `Avg CSV Processing Time: ${aggregated.performance.avgCsvProcessingTime.toFixed(2)}ms`,
      `Avg Command Execution Time: ${aggregated.performance.avgCommandExecutionTime.toFixed(2)}ms`,
      '',
      '--- Top Domains ---'
    ];

    aggregated.topDomains.forEach(({ domain, count }) => {
      report.push(`  ${domain}: ${count} resolutions`);
    });

    report.push('', '--- System Metrics ---');
    report.push(`CPU Usage: ${aggregated.system.cpu.usage.toFixed(1)}%`);
    report.push(`Memory Usage: ${aggregated.system.memory.usagePercent.toFixed(1)}%`);
    report.push(`Process Uptime: ${(aggregated.system.process.uptime / 60).toFixed(1)} minutes`);

    return report.join('\n');
  }

  /**
   * 自動フラッシュを設定
   */
  private setupAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(err => {
        console.error('Auto-flush failed:', err);
      });
    }, this.flushIntervalMs);
  }

  /**
   * 平均値を計算
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * クリーンアップ
   */
  async destroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    await this.flush();
    this.removeAllListeners();
  }
}

/**
 * グローバルメトリクスコレクターのインスタンス
 */
export const globalMetrics = new MetricsCollector();