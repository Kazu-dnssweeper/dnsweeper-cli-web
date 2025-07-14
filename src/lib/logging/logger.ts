/**
 * 構造化ログシステム メインロガー
 */

import { createTransport } from './transports.js';
import { LogLevel, LOG_LEVEL_NAMES } from './types.js';

import type { LogEntry, LoggerConfig, LogTransport } from './types.js';

/**
 * 構造化ロガー
 */
export class StructuredLogger {
  private config: LoggerConfig;
  private transports: LogTransport[];
  private correlationId?: string;
  private context?: string;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.transports = config.transports.map(transportConfig =>
      createTransport(transportConfig)
    );
  }

  /**
   * 相関IDを設定
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * コンテキストを設定
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * ログを出力
   */
  async log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
    error?: Error
  ): Promise<void> {
    if (level > this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LOG_LEVEL_NAMES[level],
      message,
      meta: { ...this.config.defaultMeta, ...meta },
      context: this.context,
      correlationId: this.correlationId,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    };

    // 全トランスポートに並列でログを送信
    const promises = this.transports.map(transport => transport.log(entry));

    try {
      await Promise.all(promises);
    } catch (error) {
      if (this.config.exitOnError) {
        process.exit(1);
      }
    }
  }

  /**
   * ERROR レベルログ
   */
  async error(
    message: string,
    error?: Error,
    meta?: Record<string, unknown>
  ): Promise<void> {
    await this.log(LogLevel.ERROR, message, meta, error);
  }

  /**
   * WARN レベルログ
   */
  async warn(message: string, meta?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.WARN, message, meta);
  }

  /**
   * INFO レベルログ
   */
  async info(message: string, meta?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.INFO, message, meta);
  }

  /**
   * HTTP レベルログ
   */
  async http(message: string, meta?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.HTTP, message, meta);
  }

  /**
   * VERBOSE レベルログ
   */
  async verbose(
    message: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    await this.log(LogLevel.VERBOSE, message, meta);
  }

  /**
   * DEBUG レベルログ
   */
  async debug(message: string, meta?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * SILLY レベルログ
   */
  async silly(message: string, meta?: Record<string, unknown>): Promise<void> {
    await this.log(LogLevel.SILLY, message, meta);
  }

  /**
   * パフォーマンス測定開始
   */
  startTimer(label: string): () => void {
    const start = Date.now();

    return () => {
      const duration = Date.now() - start;
      this.log(LogLevel.INFO, `Timer: ${label}`, { duration });
    };
  }

  /**
   * 子ロガーを作成
   */
  child(
    context: string,
    defaultMeta?: Record<string, unknown>
  ): StructuredLogger {
    const childConfig: LoggerConfig = {
      ...this.config,
      defaultMeta: { ...this.config.defaultMeta, ...defaultMeta },
    };

    const childLogger = new StructuredLogger(childConfig);
    childLogger.setContext(context);

    if (this.correlationId) {
      childLogger.setCorrelationId(this.correlationId);
    }

    return childLogger;
  }

  /**
   * ロガーを閉じる
   */
  async close(): Promise<void> {
    const promises = this.transports.map(transport => transport.close());
    await Promise.all(promises);
  }

  /**
   * 現在のログレベルを取得
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * ログレベルを設定
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * レベルが有効かチェック
   */
  isLevelEnabled(level: LogLevel): boolean {
    return level <= this.config.level;
  }
}

/**
 * デフォルトロガー設定
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  transports: [
    {
      type: 'console',
      level: LogLevel.INFO,
      format: 'pretty',
      colorize: true,
      timestamp: true,
    },
  ],
  exitOnError: false,
};

/**
 * ロガーファクトリー
 */
export function createLogger(
  config: Partial<LoggerConfig> = {}
): StructuredLogger {
  const mergedConfig: LoggerConfig = {
    ...DEFAULT_LOGGER_CONFIG,
    ...config,
    transports: config.transports || DEFAULT_LOGGER_CONFIG.transports,
  };

  return new StructuredLogger(mergedConfig);
}

/**
 * デフォルトロガーインスタンス
 */
export const defaultLogger = createLogger();

/**
 * ログレベルユーティリティ
 */
export const LogLevelUtil = {
  fromString(level: string): LogLevel {
    const levelName = level.toLowerCase();
    const entry = Object.entries(LOG_LEVEL_NAMES).find(
      ([, name]) => name === levelName
    );
    return entry ? (Number(entry[0]) as LogLevel) : LogLevel.INFO;
  },

  toString(level: LogLevel): string {
    return LOG_LEVEL_NAMES[level];
  },

  isValid(level: string): boolean {
    return Object.values(LOG_LEVEL_NAMES).includes(level.toLowerCase());
  },
};
