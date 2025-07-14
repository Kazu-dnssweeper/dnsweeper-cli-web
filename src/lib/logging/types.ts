/**
 * ログシステム型定義
 */

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
  meta?: Record<string, unknown>;
  context?: string;
  correlationId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * トランスポート設定
 */
export interface TransportConfig {
  type: 'console' | 'file' | 'rotating-file';
  level: LogLevel;
  format?: 'json' | 'text' | 'pretty';
  filename?: string;
  maxSize?: number;
  maxFiles?: number;
  colorize?: boolean;
  timestamp?: boolean;
}

/**
 * ログ設定
 */
export interface LoggerConfig {
  level: LogLevel;
  transports: TransportConfig[];
  defaultMeta?: Record<string, unknown>;
  exitOnError?: boolean;
}

/**
 * ログフォーマッター
 */
export interface LogFormatter {
  format(entry: LogEntry): string;
}

/**
 * ログトランスポート
 */
export interface LogTransport {
  log(entry: LogEntry): Promise<void>;
  close(): Promise<void>;
}

/**
 * ファイルローテーション設定
 */
export interface RotationConfig {
  maxSize: number;
  maxFiles: number;
  datePattern?: string;
  compress?: boolean;
}