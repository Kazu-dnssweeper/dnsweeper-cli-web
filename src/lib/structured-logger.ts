/**
 * 構造化ログシステム（winston相当機能）
 */

import { existsSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * ログレベル
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  HTTP = 3,
  VERBOSE = 4,
  DEBUG = 5,
  SILLY = 6,
}

/**
 * ログレベル名
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'error',
  [LogLevel.WARN]: 'warn',
  [LogLevel.INFO]: 'info',
  [LogLevel.HTTP]: 'http',
  [LogLevel.VERBOSE]: 'verbose',
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.SILLY]: 'silly',
};

/**
 * ログエントリ
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  levelName: string;
  message: string;
  meta?: Record<string, any>;
  context?: string;
  correlationId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * ログフォーマット設定
 */
export interface LogFormat {
  colorize?: boolean;
  json?: boolean;
  timestamp?: boolean | string;
  prettyPrint?: boolean;
  align?: boolean;
}

/**
 * ログトランスポート（出力先）
 */
export abstract class LogTransport {
  protected level: LogLevel;
  protected format: LogFormat;

  constructor(level: LogLevel = LogLevel.INFO, format: LogFormat = {}) {
    this.level = level;
    this.format = format;
  }

  abstract write(entry: LogEntry): Promise<void> | void;

  shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  protected formatEntry(entry: LogEntry): string {
    if (this.format.json) {
      return JSON.stringify(entry);
    }

    const timestamp = this.format.timestamp
      ? typeof this.format.timestamp === 'string'
        ? new Date().toISOString()
        : entry.timestamp
      : '';

    const level = this.format.colorize
      ? this.colorizeLevel(entry.levelName)
      : entry.levelName.toUpperCase();

    const message = entry.message;
    const meta =
      entry.meta && Object.keys(entry.meta).length > 0
        ? this.format.prettyPrint
          ? `\n${JSON.stringify(entry.meta, null, 2)}`
          : ` ${JSON.stringify(entry.meta)}`
        : '';

    const context = entry.context ? ` [${entry.context}]` : '';
    const correlationId = entry.correlationId ? ` (${entry.correlationId})` : '';
    const duration = entry.duration !== undefined ? ` +${entry.duration}ms` : '';

    const parts = [
      timestamp && `[${timestamp}]`,
      level,
      context,
      correlationId,
      message,
      duration,
      meta,
    ].filter(Boolean);

    return this.format.align ? parts.join(' ').replace(/\s+/g, ' ') : parts.join(' ');
  }

  private colorizeLevel(levelName: string): string {
    const colors: Record<string, string> = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m', // Yellow
      info: '\x1b[36m', // Cyan
      http: '\x1b[35m', // Magenta
      verbose: '\x1b[34m', // Blue
      debug: '\x1b[32m', // Green
      silly: '\x1b[37m', // White
    };

    const reset = '\x1b[0m';
    const color = colors[levelName.toLowerCase()] || '';
    return `${color}${levelName.toUpperCase()}${reset}`;
  }
}

/**
 * コンソール出力トランスポート
 */
export class ConsoleTransport extends LogTransport {
  constructor(
    level: LogLevel = LogLevel.INFO,
    format: LogFormat = { colorize: true, timestamp: true },
  ) {
    super(level, format);
  }

  write(entry: LogEntry): void {
    const formatted = this.formatEntry(entry);

    if (entry.level === LogLevel.ERROR) {
      console.error(formatted);
    } else if (entry.level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }
}

/**
 * ファイル出力トランスポート
 */
export class FileTransport extends LogTransport {
  private filename: string;
  private maxSize: number;
  private maxFiles: number;
  private currentSize: number = 0;

  constructor(
    filename: string,
    level: LogLevel = LogLevel.INFO,
    format: LogFormat = { json: true, timestamp: true },
    options: { maxSize?: number; maxFiles?: number } = {},
  ) {
    super(level, format);
    this.filename = filename;
    this.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 5;
  }

  async write(entry: LogEntry): Promise<void> {
    try {
      const formatted = this.formatEntry(entry) + '\n';

      // ディレクトリが存在しない場合は作成
      const dir = dirname(this.filename);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // ファイルサイズローテーション
      if (this.currentSize + formatted.length > this.maxSize) {
        await this.rotateFile();
        this.currentSize = 0;
      }

      await writeFile(this.filename, formatted, { flag: 'a' });
      this.currentSize += formatted.length;
    } catch (error) {
      console.error('Failed to write log file:', error);
    }
  }

  private async rotateFile(): Promise<void> {
    try {
      // ファイルを番号付きでローテーション
      for (let i = this.maxFiles - 1; i > 0; i--) {
        const oldFile = `${this.filename}.${i}`;
        const newFile = `${this.filename}.${i + 1}`;

        if (existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            // 最古のファイルを削除
            const { unlink } = await import('node:fs/promises');
            await unlink(oldFile);
          } else {
            const { rename } = await import('node:fs/promises');
            await rename(oldFile, newFile);
          }
        }
      }

      // 現在のファイルを .1 にリネーム
      if (existsSync(this.filename)) {
        const { rename } = await import('node:fs/promises');
        await rename(this.filename, `${this.filename}.1`);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }
}

/**
 * 構造化ロガー
 */
export class StructuredLogger {
  private transports: LogTransport[] = [];
  private defaultMeta: Record<string, any> = {};
  private contextStack: string[] = [];

  constructor(transports: LogTransport[] = []) {
    this.transports = transports;
  }

  /**
   * トランスポートを追加
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /**
   * デフォルトメタデータを設定
   */
  setDefaultMeta(meta: Record<string, any>): void {
    this.defaultMeta = { ...this.defaultMeta, ...meta };
  }

  /**
   * コンテキストをプッシュ
   */
  pushContext(context: string): void {
    this.contextStack.push(context);
  }

  /**
   * コンテキストをポップ
   */
  popContext(): string | undefined {
    return this.contextStack.pop();
  }

  /**
   * 現在のコンテキストを取得
   */
  getCurrentContext(): string | undefined {
    return this.contextStack.length > 0 ? this.contextStack.join(':') : undefined;
  }

  /**
   * ログを出力
   */
  log(
    level: LogLevel,
    message: string,
    meta?: Record<string, any>,
    options?: {
      context?: string;
      correlationId?: string;
      duration?: number;
      error?: Error;
    },
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      levelName: LOG_LEVEL_NAMES[level],
      message,
      meta: { ...this.defaultMeta, ...meta },
      context: options?.context || this.getCurrentContext(),
      correlationId: options?.correlationId,
      duration: options?.duration,
    };

    // エラー情報の追加
    if (options?.error) {
      entry.error = {
        name: options.error.name,
        message: options.error.message,
        stack: options.error.stack,
        code: (options.error as any).code,
      };
    }

    // 各トランスポートにログを送信
    for (const transport of this.transports) {
      if (transport.shouldLog(level)) {
        const result = transport.write(entry);
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error('Transport write error:', error);
          });
        }
      }
    }
  }

  /**
   * エラーログ
   */
  error(message: string, meta?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, meta, { error });
  }

  /**
   * 警告ログ
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * 情報ログ
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * HTTPログ
   */
  http(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.HTTP, message, meta);
  }

  /**
   * 詳細ログ
   */
  verbose(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.VERBOSE, message, meta);
  }

  /**
   * デバッグログ
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * 詳細デバッグログ
   */
  silly(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.SILLY, message, meta);
  }

  /**
   * タイマー開始
   */
  startTimer(label: string): () => void {
    const start = Date.now();

    return () => {
      const duration = Date.now() - start;
      this.info(`Timer: ${label}`, { duration });
    };
  }

  /**
   * パフォーマンス測定
   */
  async profile<T>(
    label: string,
    fn: () => Promise<T> | T,
    level: LogLevel = LogLevel.INFO,
  ): Promise<T> {
    const start = Date.now();
    this.log(level, `Starting: ${label}`);

    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.log(level, `Completed: ${label}`, { duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(
        `Failed: ${label}`,
        { duration },
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * 子ロガーを作成
   */
  child(meta: Record<string, any>, context?: string): StructuredLogger {
    const childLogger = new StructuredLogger(this.transports);
    childLogger.setDefaultMeta({ ...this.defaultMeta, ...meta });

    if (context) {
      childLogger.contextStack = [...this.contextStack, context];
    } else {
      childLogger.contextStack = [...this.contextStack];
    }

    return childLogger;
  }

  /**
   * ログレベルを文字列から解析
   */
  static parseLogLevel(level: string): LogLevel {
    const normalizedLevel = level.toLowerCase();

    switch (normalizedLevel) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
      case 'warning':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'http':
        return LogLevel.HTTP;
      case 'verbose':
        return LogLevel.VERBOSE;
      case 'debug':
        return LogLevel.DEBUG;
      case 'silly':
        return LogLevel.SILLY;
      default:
        return LogLevel.INFO;
    }
  }
}

/**
 * デフォルトロガーを作成
 */
export function createLogger(
  options: {
    level?: LogLevel | string;
    console?: boolean;
    file?: string;
    meta?: Record<string, any>;
  } = {},
): StructuredLogger {
  const level =
    typeof options.level === 'string'
      ? StructuredLogger.parseLogLevel(options.level)
      : options.level || LogLevel.INFO;

  const transports: LogTransport[] = [];

  // コンソール出力
  if (options.console !== false) {
    const consoleFormat: LogFormat = {
      colorize: process.stdout.isTTY,
      timestamp: true,
      align: true,
    };
    transports.push(new ConsoleTransport(level, consoleFormat));
  }

  // ファイル出力
  if (options.file) {
    const fileFormat: LogFormat = {
      json: true,
      timestamp: true,
    };
    transports.push(new FileTransport(options.file, level, fileFormat));
  }

  const logger = new StructuredLogger(transports);

  if (options.meta) {
    logger.setDefaultMeta(options.meta);
  }

  return logger;
}

/**
 * グローバルロガー
 */
let globalLogger: StructuredLogger | null = null;

/**
 * グローバルロガーを設定
 */
export function setGlobalLogger(logger: StructuredLogger): void {
  globalLogger = logger;
}

/**
 * グローバルロガーを取得
 */
export function getLogger(): StructuredLogger {
  if (!globalLogger) {
    globalLogger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      console: true,
      file: process.env.LOG_FILE,
      meta: {
        service: 'dnsweeper',
        version: process.env.npm_package_version || '1.0.0',
      },
    });
  }

  return globalLogger;
}

/**
 * ログミドルウェア（関数デコレーター）
 */
export function logMethod(
  level: LogLevel = LogLevel.DEBUG,
  includeArgs: boolean = false,
  includeResult: boolean = false,
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    if (!descriptor || typeof descriptor.value !== 'function') {
      return descriptor;
    }
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = getLogger();
      const className = target.constructor.name;
      const methodName = `${className}.${propertyName}`;

      const meta: Record<string, any> = {};
      if (includeArgs) {
        meta.args = args;
      }

      logger.pushContext(methodName);
      const timer = logger.startTimer(methodName);

      try {
        logger.log(level, `Method called: ${methodName}`, meta);

        const result = await method.apply(this, args);

        if (includeResult) {
          logger.log(level, `Method completed: ${methodName}`, { result });
        } else {
          logger.log(level, `Method completed: ${methodName}`);
        }

        timer();
        return result;
      } catch (error) {
        logger.error(
          `Method failed: ${methodName}`,
          meta,
          error instanceof Error ? error : new Error(String(error)),
        );
        timer();
        throw error;
      } finally {
        logger.popContext();
      }
    };

    return descriptor;
  };
}
