/**
 * ベースコマンドクラス
 *
 * すべてのCLIコマンドの共通機能を提供
 * - 共通オプションの管理
 * - エラーハンドリング
 * - ログ出力
 * - バリデーション
 * - 結果出力
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

import { Command } from 'commander';

import { Logger } from '../lib/logger.js';
import { createFormatter } from '../lib/output-formatter.js';

import type {
  DNSRecordType,
  IDNSRecord,
  OutputFormat,
} from '../types/index.js';

export interface BaseCommandOptions {
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
  output?: string;
  colors?: boolean;
}

export abstract class BaseCommand {
  protected logger!: Logger;
  protected command: Command;

  constructor(name: string, description: string) {
    this.command = new Command(name).description(description);
    this.addCommonOptions();
  }

  /**
   * 共通オプションの追加
   */
  protected addCommonOptions(): void {
    this.command
      .option('-v, --verbose', '詳細出力を有効化')
      .option('-q, --quiet', 'エラー以外の出力を抑制')
      .option('--no-colors', '色付き出力を無効化');
  }

  /**
   * 出力関連オプションの追加
   */
  protected addOutputOptions(): void {
    this.command
      .option('-j, --json', 'JSON形式で出力')
      .option('-o, --output <file>', '結果をファイルに出力');
  }

  /**
   * Logger初期化
   */
  protected initLogger(options: BaseCommandOptions): void {
    this.logger = new Logger({
      verbose: options.verbose,
      quiet: options.quiet,
    });
  }

  /**
   * エラーハンドリング付き実行
   */
  protected async executeWithErrorHandling(
    fn: () => Promise<void>,
    errorMessage?: string
  ): Promise<void> {
    try {
      await fn();
    } catch (error) {
      if (this.logger?.stopSpinner) {
        this.logger.stopSpinner(false, errorMessage || 'エラーが発生しました');
      }

      if (this.logger) {
        this.logger.error(
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      } else {
        console.error(error);
      }

      process.exit(1);
    }
  }

  /**
   * スピナー付き実行
   */
  protected async executeWithSpinner<T>(
    message: string,
    fn: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T> {
    this.logger.startSpinner(message);

    try {
      const result = await fn();
      this.logger.stopSpinner(true, successMessage);
      return result;
    } catch (error) {
      this.logger.stopSpinner(false, errorMessage || 'エラーが発生しました');
      throw error;
    }
  }

  /**
   * ドメイン名の検証
   */
  protected validateDomain(domain: string): void {
    if (!domain || typeof domain !== 'string') {
      throw new Error('ドメイン名が指定されていません');
    }

    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      throw new Error(`無効なドメイン名: ${domain}`);
    }

    if (domain.length > 253) {
      throw new Error('ドメイン名が長すぎます（253文字以下）');
    }

    const labels = domain.split('.');
    for (const label of labels) {
      if (label.length > 63) {
        throw new Error('各ラベルは63文字以下である必要があります');
      }
    }
  }

  /**
   * ファイル存在チェック
   */
  protected validateFileExists(filePath: string): string {
    const resolvedPath = resolve(filePath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`ファイルが見つかりません: ${resolvedPath}`);
    }
    return resolvedPath;
  }

  /**
   * タイムアウト値の検証
   */
  protected validateTimeout(
    timeout: string | undefined,
    defaultValue = '5000'
  ): number {
    const value = parseInt(timeout || defaultValue, 10);
    if (isNaN(value) || value <= 0 || value > 60000) {
      throw new Error('タイムアウトは1-60000msの範囲で指定してください');
    }
    return value;
  }

  /**
   * 出力形式の検証
   */
  protected validateOutputFormat(
    format: string | undefined,
    allowedFormats: string[]
  ): OutputFormat {
    const normalizedFormat = format?.toLowerCase() || 'table';
    if (!allowedFormats.includes(normalizedFormat)) {
      throw new Error(
        `無効な出力形式: ${format}. 利用可能: ${allowedFormats.join(', ')}`
      );
    }
    return normalizedFormat as OutputFormat;
  }

  /**
   * DNS解決結果の変換（共通処理）
   */
  protected convertToIDNSRecords(
    lookupResult: { records?: unknown[] },
    domain: string,
    recordType: DNSRecordType
  ): IDNSRecord[] {
    if (!lookupResult.records || !Array.isArray(lookupResult.records)) {
      return [];
    }

    return lookupResult.records.map((record: any) => {
      const baseRecord = {
        name: domain,
        type: recordType,
        ttl: record.ttl || 300,
        class: 'IN' as const,
      };

      switch (recordType) {
        case 'A':
        case 'AAAA':
          return {
            ...baseRecord,
            data: record.address || record.value || '',
          };
        case 'CNAME':
        case 'NS':
        case 'PTR':
          return {
            ...baseRecord,
            data: record.value || '',
          };
        case 'MX':
          return {
            ...baseRecord,
            data: record.exchange || '',
            priority: record.priority || 0,
          };
        case 'TXT':
          return {
            ...baseRecord,
            data: Array.isArray(record.entries)
              ? record.entries.join('')
              : record.value || '',
          };
        case 'SOA':
          return {
            ...baseRecord,
            data: [
              record.nsname || '',
              record.hostmaster || '',
              record.serial || 0,
              record.refresh || 0,
              record.retry || 0,
              record.expire || 0,
              record.minttl || 0,
            ].join(' '),
          };
        case 'SRV':
          return {
            ...baseRecord,
            data: record.target || '',
            priority: record.priority || 0,
            weight: record.weight || 0,
            port: record.port || 0,
          };
        default:
          return {
            ...baseRecord,
            data: JSON.stringify(record),
          };
      }
    });
  }

  /**
   * 結果の出力（共通処理）
   */
  protected async outputResults(
    result: any,
    format: OutputFormat,
    options: BaseCommandOptions & { output?: string }
  ): Promise<void> {
    const formatter = createFormatter({
      format,
      colors: options.colors !== false,
      verbose: options.verbose || false,
      compact: format === 'json' && !options.verbose,
    });

    if (options.output) {
      await formatter.writeToFile(result, options.output);
      this.logger.success(`結果を ${options.output} に保存しました`);
    } else {
      const output = formatter.format(result);
      this.logger.info(output);
    }
  }

  /**
   * コマンドのアクション設定
   */
  public setAction(action: (...args: any[]) => Promise<void>): void {
    this.command.action(async (...args) => {
      await this.executeWithErrorHandling(async () => {
        await action(...args);
      });
    });
  }

  /**
   * コマンドを取得
   */
  public getCommand(): Command {
    return this.command;
  }

  /**
   * 抽象メソッド - サブクラスで実装
   */
  abstract execute(...args: any[]): Promise<void>;
}
