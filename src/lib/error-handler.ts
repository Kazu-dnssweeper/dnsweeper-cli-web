/**
 * エラーハンドラー
 *
 * 統一されたエラー処理を提供
 */

import type { Logger } from './logger.js';

export interface ErrorContext {
  command?: string;
  domain?: string;
  file?: string;
  operation?: string;
  details?: Record<string, any>;
}

export class ErrorHandler {
  private logger: Logger;
  private context: ErrorContext;

  constructor(logger: Logger, context: ErrorContext = {}) {
    this.logger = logger;
    this.context = context;
  }

  /**
   * エラーを処理
   */
  handle(error: unknown, customMessage?: string): void {
    // スピナーを停止
    if (this.logger.stopSpinner) {
      this.logger.stopSpinner(false, customMessage || 'エラーが発生しました');
    }

    // エラーメッセージの生成
    const message = this.formatError(error);

    // エラーログ出力
    this.logger.error(message);

    // デバッグ情報の出力（verboseモード時）
    if (this.context && Object.keys(this.context).length > 0) {
      this.logger.debug('エラーコンテキスト:', this.context);
    }

    // スタックトレースの出力（verboseモード時）
    if (error instanceof Error && error.stack) {
      this.logger.debug('スタックトレース:', error.stack);
    }
  }

  /**
   * エラーメッセージのフォーマット
   */
  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return this.formatKnownError(error);
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null) {
      return JSON.stringify(error, null, 2);
    }

    return 'Unknown error occurred';
  }

  /**
   * 既知のエラータイプのフォーマット
   */
  private formatKnownError(error: Error): string {
    const errorName = error.name;
    const errorMessage = error.message;

    // 特定のエラータイプに対する処理
    switch (errorName) {
      case 'ValidationError':
        return `入力検証エラー: ${errorMessage}`;

      case 'NetworkError':
      case 'ENOTFOUND':
      case 'ETIMEDOUT':
        return `ネットワークエラー: ${errorMessage}`;

      case 'FileNotFoundError':
      case 'ENOENT':
        return `ファイルが見つかりません: ${errorMessage}`;

      case 'PermissionError':
      case 'EACCES':
        return `権限エラー: ${errorMessage}`;

      case 'DNSError':
        return `DNS解決エラー: ${errorMessage}`;

      case 'AuthenticationError':
        return `認証エラー: ${errorMessage}`;

      case 'RateLimitError':
        return `レート制限エラー: ${errorMessage}`;

      case 'SyntaxError':
        return `構文エラー: ${errorMessage}`;

      case 'TypeError':
        return `型エラー: ${errorMessage}`;

      default:
        return errorMessage;
    }
  }

  /**
   * コンテキストの更新
   */
  updateContext(context: Partial<ErrorContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * エラーの再スロー（必要に応じて）
   */
  rethrow(error: unknown, customMessage?: string): never {
    this.handle(error, customMessage);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(customMessage || 'An error occurred');
  }

  /**
   * 条件付きエラーハンドリング
   */
  handleIf(condition: boolean, error: unknown, customMessage?: string): void {
    if (condition) {
      this.handle(error, customMessage);
    }
  }

  /**
   * 非同期エラーハンドリング
   */
  async handleAsync<T>(
    fn: () => Promise<T>,
    customMessage?: string
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, customMessage);
      return undefined;
    }
  }

  /**
   * エラーのラップ
   */
  wrap(error: unknown, additionalMessage: string): Error {
    if (error instanceof Error) {
      error.message = `${additionalMessage}: ${error.message}`;
      return error;
    }

    return new Error(`${additionalMessage}: ${String(error)}`);
  }
}

/**
 * カスタムエラークラス
 */
export class DNSweeperError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: ErrorContext
  ) {
    super(message);
    this.name = 'DNSweeperError';
  }
}

export class ValidationError extends DNSweeperError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends DNSweeperError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

export class FileError extends DNSweeperError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'FILE_ERROR', context);
    this.name = 'FileError';
  }
}

export class DNSError extends DNSweeperError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'DNS_ERROR', context);
    this.name = 'DNSError';
  }
}

export class AuthenticationError extends DNSweeperError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'AUTH_ERROR', context);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends DNSweeperError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'RATE_LIMIT_ERROR', context);
    this.name = 'RateLimitError';
  }
}
