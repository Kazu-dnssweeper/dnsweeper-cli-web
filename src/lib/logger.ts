/* eslint-disable no-console */
import chalk from 'chalk';

import { colors, colorize, configureColors } from './colors.js';
import { ProgressDisplay, type SpinnerType } from './progress.js';
import {
  getLogger,
  createLogger,
  setGlobalLogger,
  type StructuredLogger,
} from './structured-logger.js';

import type { Ora } from 'ora';

export class Logger {
  private verbose: boolean;
  private quiet: boolean;
  private spinner: Ora | null = null;
  private structuredLogger: StructuredLogger;

  constructor(
    options: {
      verbose?: boolean | undefined;
      quiet?: boolean | undefined;
      enableStructuredLogging?: boolean;
      logFile?: string;
      logLevel?: string;
    } = {}
  ) {
    this.verbose = options.verbose ?? false;
    this.quiet = options.quiet ?? false;

    // カラーモードを初期化
    configureColors();

    // 構造化ログを初期化
    if (options.enableStructuredLogging !== false) {
      this.structuredLogger = createLogger({
        level: options.logLevel || (this.verbose ? 'debug' : 'info'),
        console: false, // 既存のコンソール出力を維持
        file: options.logFile,
        meta: {
          service: 'dnsweeper',
          component: 'cli',
        },
      });
      setGlobalLogger(this.structuredLogger);
    } else {
      this.structuredLogger = getLogger();
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (!this.quiet) {
      console.log(colorize.info('ℹ'), message);
    }
    this.structuredLogger.info(message, meta);
  }

  success(message: string, meta?: Record<string, any>): void {
    if (!this.quiet) {
      console.log(colorize.success('✓'), message);
    }
    this.structuredLogger.info(`SUCCESS: ${message}`, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, any>): void {
    console.error(colorize.error('✗'), message);
    this.structuredLogger.error(message, meta, error);
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (!this.quiet) {
      console.warn(colorize.warning('⚠'), message);
    }
    this.structuredLogger.warn(message, meta);
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.verbose && !this.quiet) {
      console.log(colors.muted('[DEBUG]'), message);
    }
    this.structuredLogger.debug(message, meta);
  }

  startSpinner(
    text: string,
    type: SpinnerType = 'processing',
    meta?: Record<string, any>
  ): void {
    if (!this.quiet) {
      const progress = new ProgressDisplay().start(text, type);
      this.spinner = progress.spinner;
    }
    this.structuredLogger.info(`SPINNER_START: ${text}`, meta);
  }

  stopSpinner(
    success: boolean = true,
    text?: string,
    meta?: Record<string, any>
  ): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(text);
        this.structuredLogger.info(
          `SPINNER_SUCCESS: ${text || 'Operation completed'}`,
          meta
        );
      } else {
        this.spinner.fail(text);
        this.structuredLogger.error(
          `SPINNER_FAIL: ${text || 'Operation failed'}`,
          meta
        );
      }
      this.spinner = null;
    }
  }

  table(data: unknown[], meta?: Record<string, any>): void {
    if (!this.quiet) {
      console.table(data);
    }
    this.structuredLogger.info('TABLE_OUTPUT', {
      ...meta,
      tableData: Array.isArray(data) ? data.slice(0, 10) : data, // 最初の10行のみログ
    });
  }

  json(data: unknown, meta?: Record<string, any>): void {
    console.log(JSON.stringify(data, null, 2));
    this.structuredLogger.info('JSON_OUTPUT', { ...meta, jsonData: data });
  }

  // === 新しい構造化ログメソッド ===

  /**
   * HTTP リクエスト/レスポンスをログ
   */
  http(
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
    meta?: Record<string, any>
  ): void {
    const message = `${method} ${url}${statusCode ? ` ${statusCode}` : ''}${duration ? ` ${duration}ms` : ''}`;

    if (!this.quiet) {
      const color = statusCode && statusCode >= 400 ? chalk.red : chalk.cyan;
      console.log(color('HTTP'), message);
    }

    this.structuredLogger.http(message, {
      ...meta,
      method,
      url,
      statusCode,
      duration,
    });
  }

  /**
   * パフォーマンス測定
   */
  async profile<T>(
    label: string,
    fn: () => Promise<T> | T,
    meta?: Record<string, any>
  ): Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${label}`, meta);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.success(`Completed: ${label} (${duration}ms)`, {
        ...meta,
        duration,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(
        `Failed: ${label} (${duration}ms)`,
        error instanceof Error ? error : new Error(String(error)),
        { ...meta, duration }
      );
      throw error;
    }
  }

  /**
   * タイマー開始
   */
  startTimer(label: string, meta?: Record<string, any>): () => void {
    const start = Date.now();
    this.debug(`Timer started: ${label}`, meta);

    return () => {
      const duration = Date.now() - start;
      this.info(`Timer: ${label} completed in ${duration}ms`, {
        ...meta,
        duration,
      });
    };
  }

  /**
   * 子ロガーを作成
   */
  child(meta: Record<string, any>, context?: string): Logger {
    const childLogger = new Logger({
      verbose: this.verbose,
      quiet: this.quiet,
      enableStructuredLogging: false, // 既存の構造化ログを使用
    });

    childLogger.structuredLogger = this.structuredLogger.child(meta, context);
    return childLogger;
  }

  /**
   * コンテキストをプッシュ
   */
  pushContext(context: string): void {
    this.structuredLogger.pushContext(context);
  }

  /**
   * コンテキストをポップ
   */
  popContext(): string | undefined {
    return this.structuredLogger.popContext();
  }

  /**
   * 構造化ログの統計情報を表示
   */
  showLogStats(): void {
    // ログ統計の表示（実装は構造化ログシステムに依存）
    this.info('Log statistics feature available via structured logging');
  }

  /**
   * ログレベルを変更
   */
  setLogLevel(level: string): void {
    // 注意: 既存のトランスポートのレベルは変更されない
    this.structuredLogger.info(`Log level change requested: ${level}`, {
      newLevel: level,
    });
  }

  /**
   * 重要なイベントをログ（常に出力）
   */
  critical(message: string, meta?: Record<string, any>, error?: Error): void {
    console.error(chalk.red.bold('🚨 CRITICAL'), message);
    this.structuredLogger.error(`CRITICAL: ${message}`, meta, error);
  }

  /**
   * セキュリティ関連のログ
   */
  security(message: string, meta?: Record<string, any>): void {
    if (!this.quiet) {
      console.log(chalk.magenta('🔒 SECURITY'), message);
    }
    this.structuredLogger.warn(`SECURITY: ${message}`, {
      ...meta,
      category: 'security',
    });
  }

  /**
   * パフォーマンス警告
   */
  performance(
    message: string,
    duration: number,
    threshold: number = 1000,
    meta?: Record<string, any>
  ): void {
    const isWarning = duration > threshold;
    const color = isWarning ? chalk.yellow : chalk.green;

    if (!this.quiet) {
      console.log(color('⏱ PERF'), `${message} (${duration}ms)`);
    }

    if (isWarning) {
      this.structuredLogger.warn(`PERFORMANCE: ${message}`, {
        ...meta,
        duration,
        threshold,
      });
    } else {
      this.structuredLogger.info(`PERFORMANCE: ${message}`, {
        ...meta,
        duration,
        threshold,
      });
    }
  }

  /**
   * ビジネスロジック関連のログ
   */
  business(message: string, meta?: Record<string, any>): void {
    if (!this.quiet) {
      console.log(chalk.blue('📊 BUSINESS'), message);
    }
    this.structuredLogger.info(`BUSINESS: ${message}`, {
      ...meta,
      category: 'business',
    });
  }

  /**
   * 既存の構造化ロガーを取得
   */
  getStructuredLogger(): StructuredLogger {
    return this.structuredLogger;
  }
}
