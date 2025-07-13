import { ErrorHandler } from '../lib/errors.js';

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  maxDelay?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

/**
 * リトライ機能を提供するユーティリティ
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    maxDelay = 30000,
    onRetry
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // リトライ可能かチェック
      if (!ErrorHandler.isRetryable(error) || attempt === maxAttempts) {
        throw error;
      }

      // リトライコールバック
      if (onRetry) {
        onRetry(attempt, error);
      }

      // 遅延計算
      const currentDelay = calculateDelay(attempt, delay, backoff, maxDelay);
      await sleep(currentDelay);
    }
  }

  throw lastError;
}

/**
 * 遅延時間を計算
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  backoff: 'linear' | 'exponential',
  maxDelay: number
): number {
  let delay: number;

  if (backoff === 'exponential') {
    // 指数バックオフ: delay * 2^(attempt - 1)
    delay = baseDelay * Math.pow(2, attempt - 1);
  } else {
    // 線形バックオフ: delay * attempt
    delay = baseDelay * attempt;
  }

  // ジッターを追加（±10%）
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  delay += jitter;

  // 最大遅延時間を超えないようにする
  return Math.min(delay, maxDelay);
}

/**
 * 指定時間スリープ
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * タイムアウト付きで関数を実行
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}