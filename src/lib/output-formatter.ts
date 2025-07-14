/**
 * 出力フォーマッター - 分析結果の出力形式を管理
 */

import { writeFileSync } from 'fs';

import chalk from 'chalk';

import type { IDNSRecord, DNSRecordType } from '../types/index.js';

/**
 * 出力形式
 */
export type OutputFormat = 'json' | 'csv' | 'table' | 'text';

/**
 * リスクレベル
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 出力オプション
 */
export interface OutputOptions {
  format: OutputFormat;
  colors: boolean;
  outputFile?: string;
  verbose: boolean;
  compact: boolean;
}

/**
 * 分析結果データ
 */
export interface AnalysisResult {
  summary: {
    total: number;
    byType: Record<DNSRecordType, number>;
    byRisk: Record<RiskLevel, number>;
    duration: number;
  };
  records: Array<
    IDNSRecord & {
      riskLevel: RiskLevel;
      riskScore: number;
      recommendations: string[];
    }
  >;
  metadata: {
    scannedAt: Date;
    source: string;
    version: string;
  };
}

/**
 * テーブル列設定
 */
interface TableColumn {
  key: string;
  header: string;
  width: number;
  align: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

/**
 * 出力フォーマッター
 */
export class OutputFormatter {
  private options: OutputOptions;
  private riskColors: Record<RiskLevel, (text: string) => string>;

  constructor(options: Partial<OutputOptions> = {}) {
    this.options = {
      format: 'table',
      colors: true,
      verbose: false,
      compact: false,
      ...options,
    };

    // リスクレベル別の色設定
    this.riskColors = {
      low: chalk.green,
      medium: chalk.yellow,
      high: chalk.red,
      critical: chalk.red.bold,
    };
  }

  /**
   * 分析結果を指定された形式で出力
   */
  format(result: AnalysisResult): string {
    switch (this.options.format) {
      case 'json':
        return this.formatJSON(result);
      case 'csv':
        return this.formatCSV(result);
      case 'table':
        return this.formatTable(result);
      case 'text':
        return this.formatText(result);
      default:
        throw new Error(`サポートされていない出力形式: ${this.options.format}`);
    }
  }

  /**
   * ファイルに出力
   */
  async writeToFile(result: AnalysisResult, filename?: string): Promise<void> {
    const outputFile = filename || this.options.outputFile;
    if (!outputFile) {
      throw new Error('出力ファイル名が指定されていません');
    }

    const content = this.format(result);

    if (this.options.format === 'csv' && outputFile.endsWith('.csv')) {
      // CSVの場合はBOM付きUTF-8で保存
      const bom = '\uFEFF';
      writeFileSync(outputFile, bom + content, 'utf8');
    } else {
      writeFileSync(outputFile, content, 'utf8');
    }
  }

  /**
   * JSON形式で出力
   */
  private formatJSON(result: AnalysisResult): string {
    if (this.options.compact) {
      return JSON.stringify(result);
    }
    return JSON.stringify(result, null, 2);
  }

  /**
   * CSV形式で出力
   */
  private formatCSV(result: AnalysisResult): string {
    const headers = [
      'ID',
      'Name',
      'Type',
      'Value',
      'TTL',
      'Risk Level',
      'Risk Score',
      'Priority',
      'Weight',
      'Port',
      'Created',
      'Updated',
      'Recommendations',
    ];

    const rows = result.records.map((record) => [
      record.id,
      record.name,
      record.type,
      record.value,
      record.ttl,
      record.riskLevel,
      record.riskScore,
      record.priority || '',
      record.weight || '',
      record.port || '',
      record.created.toISOString(),
      record.updated.toISOString(),
      record.recommendations.join('; '),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => this.escapeCsvCell(String(cell))).join(','))
      .join('\n');
  }

  /**
   * テーブル形式で出力
   */
  private formatTable(result: AnalysisResult): string {
    const output: string[] = [];

    // サマリー情報
    output.push(this.formatSummary(result.summary));
    output.push('');

    // レコードテーブル
    if (result.records.length > 0) {
      output.push(this.formatRecordsTable(result.records));
    }

    // メタデータ
    if (this.options.verbose) {
      output.push('');
      output.push(this.formatMetadata(result.metadata));
    }

    return output.join('\n');
  }

  /**
   * テキスト形式で出力
   */
  private formatText(result: AnalysisResult): string {
    const output: string[] = [];

    output.push('=== DNS分析結果 ===');
    output.push('');

    // サマリー
    output.push(this.formatSummary(result.summary));
    output.push('');

    // レコード詳細
    for (const record of result.records) {
      output.push(this.formatRecordDetail(record));
      output.push('');
    }

    return output.join('\n');
  }

  /**
   * サマリー情報をフォーマット
   */
  private formatSummary(summary: AnalysisResult['summary']): string {
    const lines: string[] = [];

    lines.push(this.colorize('📊 分析サマリー', 'title'));
    lines.push(this.createSeparator());

    lines.push(`総レコード数: ${this.colorize(summary.total.toString(), 'number')}`);
    lines.push(`分析時間: ${this.colorize((summary.duration / 1000).toFixed(2) + 's', 'number')}`);
    lines.push('');

    // レコードタイプ別統計
    lines.push('📝 レコードタイプ別:');
    for (const [type, count] of Object.entries(summary.byType)) {
      if (count > 0) {
        lines.push(`  ${type.padEnd(6)}: ${this.colorize(count.toString(), 'number')}`);
      }
    }
    lines.push('');

    // リスクレベル別統計
    lines.push('⚠️  リスクレベル別:');
    for (const [level, count] of Object.entries(summary.byRisk)) {
      if (count > 0) {
        const coloredLevel = this.colorizeRisk(level as RiskLevel, level.toUpperCase());
        // パディング計算時は色なしの文字列長を使用
        const paddingLength = 15 - level.toUpperCase().length;
        lines.push(
          `  ${coloredLevel}${' '.repeat(paddingLength)}: ${this.colorize(count.toString(), 'number')}`,
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * レコードテーブルをフォーマット
   */
  private formatRecordsTable(records: AnalysisResult['records']): string {
    const columns: TableColumn[] = [
      { key: 'name', header: 'Name', width: 30, align: 'left' },
      { key: 'type', header: 'Type', width: 6, align: 'center' },
      { key: 'value', header: 'Value', width: 25, align: 'left' },
      { key: 'ttl', header: 'TTL', width: 8, align: 'right' },
      {
        key: 'riskLevel',
        header: 'Risk',
        width: 10,
        align: 'center',
        format: (level: RiskLevel) => this.colorizeRisk(level, level.toUpperCase()),
      },
      { key: 'riskScore', header: 'Score', width: 6, align: 'right' },
    ];

    const lines: string[] = [];

    // ヘッダー
    const headerLine = columns
      .map((col) => this.padCell(this.colorize(col.header, 'header'), col.width, col.align))
      .join(' | ');
    lines.push(headerLine);

    // セパレーター
    const separatorLine = columns.map((col) => '-'.repeat(col.width)).join('-+-');
    lines.push(separatorLine);

    // データ行
    for (const record of records) {
      const dataLine = columns
        .map((col) => {
          const value = record[col.key as keyof typeof record];
          const formattedValue = col.format ? col.format(value) : String(value);
          return this.padCell(formattedValue, col.width, col.align);
        })
        .join(' | ');
      lines.push(dataLine);
    }

    return lines.join('\n');
  }

  /**
   * レコード詳細をフォーマット
   */
  private formatRecordDetail(record: AnalysisResult['records'][0]): string {
    const lines: string[] = [];

    lines.push(`🔍 ${this.colorize(record.name, 'title')} (${record.type})`);
    lines.push(`   値: ${record.value}`);
    lines.push(`   TTL: ${record.ttl}s`);
    lines.push(
      `   リスク: ${this.colorizeRisk(record.riskLevel, record.riskLevel.toUpperCase())} (スコア: ${record.riskScore})`,
    );

    if (record.recommendations.length > 0) {
      lines.push('   推奨事項:');
      for (const rec of record.recommendations) {
        lines.push(`     • ${rec}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * メタデータをフォーマット
   */
  private formatMetadata(metadata: AnalysisResult['metadata']): string {
    const lines: string[] = [];

    lines.push(this.colorize('📋 メタデータ', 'title'));
    lines.push(this.createSeparator());
    lines.push(`スキャン日時: ${metadata.scannedAt.toLocaleString('ja-JP')}`);
    lines.push(`ソース: ${metadata.source}`);
    lines.push(`バージョン: ${metadata.version}`);

    return lines.join('\n');
  }

  /**
   * リスクレベルに応じた色付け
   */
  private colorizeRisk(level: RiskLevel, text: string): string {
    if (!this.options.colors) {
      return text;
    }
    return this.riskColors[level](text);
  }

  /**
   * 汎用色付け
   */
  private colorize(text: string, type: 'title' | 'header' | 'number' | 'normal'): string {
    if (!this.options.colors) {
      return text;
    }

    switch (type) {
      case 'title':
        return chalk.cyan.bold(text);
      case 'header':
        return chalk.blue.bold(text);
      case 'number':
        return chalk.magenta(text);
      case 'normal':
      default:
        return text;
    }
  }

  /**
   * セルの文字列調整
   */
  private padCell(text: string, width: number, align: 'left' | 'center' | 'right'): string {
    // ANSIエスケープシーケンスを除いた実際の文字数を取得
    const cleanText = text.replace(/\u001b\[[0-9;]*m/g, '');
    const padding = width - cleanText.length;

    if (padding <= 0) {
      return text.slice(0, width);
    }

    switch (align) {
      case 'right':
        return ' '.repeat(padding) + text;
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
      case 'left':
      default:
        return text + ' '.repeat(padding);
    }
  }

  /**
   * セパレーター作成
   */
  private createSeparator(length: number = 50): string {
    return '─'.repeat(length);
  }

  /**
   * CSVセルのエスケープ
   */
  private escapeCsvCell(value: string): string {
    // カンマ、ダブルクォート、改行を含む場合はダブルクォートで囲む
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }
}

/**
 * デフォルト設定でのフォーマッター作成
 */
export function createFormatter(options?: Partial<OutputOptions>): OutputFormatter {
  return new OutputFormatter(options);
}

/**
 * クイック出力関数
 */
export function formatAnalysisResult(
  result: AnalysisResult,
  format: OutputFormat = 'table',
  colors: boolean = true,
): string {
  const formatter = new OutputFormatter({ format, colors });
  return formatter.format(result);
}
