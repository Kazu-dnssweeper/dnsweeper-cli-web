/**
 * 構造化ログシステム（リファクタリング済み）
 * 元のファイルは structured-logger-backup.ts として保存
 */

// 新しいモジュール化されたロガーを再エクスポート
export {
  StructuredLogger,
  createLogger,
  defaultLogger,
  LogLevelUtil,
  DEFAULT_LOGGER_CONFIG,
  createFormatter,
  JSONFormatter,
  TextFormatter,
  PrettyFormatter,
  CustomFormatter,
  createTransport,
  ConsoleTransport,
  FileTransport,
  RotatingFileTransport,
  LogLevel,
  LOG_LEVEL_NAMES,
  type LogEntry,
  type LogFormatter,
  type LogTransport,
  type LoggerConfig,
  type TransportConfig,
  type RotationConfig,
} from './logging/index.js';

// 後方互換性のためのデフォルトエクスポート
export { StructuredLogger as default } from './logging/index.js';
