/**
 * DNSweeperの基底エラークラス
 */
export class DnsSweeperError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'DnsSweeperError';

    // スタックトレースを保持
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * エラーの詳細情報を整形して返す
   */
  toDetailedString(): string {
    let result = `${this.name} [${this.code}]: ${this.message}`;
    if (this.details) {
      result += '\n詳細情報:';
      for (const [key, value] of Object.entries(this.details)) {
        result += `\n  ${key}: ${JSON.stringify(value)}`;
      }
    }
    return result;
  }
}

/**
 * DNS解決関連のエラー
 */
export class DnsResolutionError extends DnsSweeperError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'DNS_RESOLUTION_ERROR', details);
    this.name = 'DnsResolutionError';
  }
}

/**
 * CSV処理関連のエラー
 */
export class CsvProcessingError extends DnsSweeperError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CSV_PROCESSING_ERROR', details);
    this.name = 'CsvProcessingError';
  }
}

/**
 * 設定関連のエラー
 */
export class ConfigurationError extends DnsSweeperError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

/**
 * 検証エラー
 */
export class ValidationError extends DnsSweeperError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * API関連のエラー
 */
export class ApiError extends DnsSweeperError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message, 'API_ERROR', details);
    this.name = 'ApiError';
  }
}

/**
 * ファイル操作関連のエラー
 */
export class FileOperationError extends DnsSweeperError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'FILE_OPERATION_ERROR', details);
    this.name = 'FileOperationError';
  }
}

/**
 * タイムアウトエラー
 */
export class TimeoutError extends DnsSweeperError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}

/**
 * エラーハンドリングユーティリティ
 */
export class ErrorHandler {
  /**
   * エラーをラップして詳細情報を追加
   */
  static wrap(
    error: unknown,
    context: string,
    details?: Record<string, any>
  ): DnsSweeperError {
    if (error instanceof DnsSweeperError) {
      // 既存のDnsSweeperErrorの場合は詳細を追加
      return new DnsSweeperError(`${context}: ${error.message}`, error.code, {
        ...error.details,
        ...details,
      });
    }

    if (error instanceof Error) {
      // 通常のErrorの場合はラップ
      return new DnsSweeperError(
        `${context}: ${error.message}`,
        'WRAPPED_ERROR',
        {
          originalError: error.name,
          stack: error.stack,
          ...details,
        }
      );
    }

    // その他の場合
    return new DnsSweeperError(
      `${context}: 不明なエラーが発生しました`,
      'UNKNOWN_ERROR',
      {
        error: String(error),
        ...details,
      }
    );
  }

  /**
   * エラーメッセージをユーザーフレンドリーに変換
   */
  static getUserFriendlyMessage(error: unknown): string {
    if (error instanceof DnsResolutionError) {
      return `DNS解決エラー: ${error.message}`;
    }

    if (error instanceof CsvProcessingError) {
      return `CSV処理エラー: ${error.message}`;
    }

    if (error instanceof ConfigurationError) {
      return `設定エラー: ${error.message}`;
    }

    if (error instanceof ValidationError) {
      return `入力検証エラー: ${error.message}`;
    }

    if (error instanceof ApiError) {
      const status = error.statusCode
        ? ` (ステータスコード: ${error.statusCode})`
        : '';
      return `APIエラー: ${error.message}${status}`;
    }

    if (error instanceof FileOperationError) {
      return `ファイル操作エラー: ${error.message}`;
    }

    if (error instanceof TimeoutError) {
      return `タイムアウトエラー: ${error.message}`;
    }

    if (error instanceof Error) {
      return `エラー: ${error.message}`;
    }

    return '予期しないエラーが発生しました';
  }

  /**
   * リトライ可能なエラーかどうかを判定
   */
  static isRetryable(error: unknown): boolean {
    if (error instanceof TimeoutError) {
      return true;
    }

    if (error instanceof DnsResolutionError) {
      // DNS一時的なエラーはリトライ可能
      const code = (error.details?.code as string) || '';
      return ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'].includes(code);
    }

    if (error instanceof ApiError) {
      // 5xx系のエラーや429（Rate Limit）はリトライ可能
      const status = error.statusCode || 0;
      return status >= 500 || status === 429;
    }

    return false;
  }

  /**
   * エラーの重要度を判定
   */
  static getSeverity(
    error: unknown
  ): 'critical' | 'error' | 'warning' | 'info' {
    if (
      error instanceof ConfigurationError ||
      error instanceof ValidationError
    ) {
      return 'critical'; // 設定ミスは修正が必要
    }

    if (
      error instanceof ApiError &&
      error.statusCode &&
      error.statusCode >= 500
    ) {
      return 'error'; // サーバーエラー
    }

    if (error instanceof TimeoutError || error instanceof DnsResolutionError) {
      return 'warning'; // 一時的な問題の可能性
    }

    return 'error';
  }
}
