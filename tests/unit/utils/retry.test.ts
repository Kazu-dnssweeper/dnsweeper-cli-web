/**
 * retry.ts のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { withRetry as retry, RetryOptions } from '../../../src/utils/retry.js';
import { ErrorHandler } from '../../../src/lib/errors.js';

// ErrorHandlerをモック
vi.mock('../../../src/lib/errors.js', () => ({
  ErrorHandler: {
    isRetryable: vi.fn().mockReturnValue(true)
  }
}));

describe('retry utility', () => {
  beforeEach(() => {
    // 各テスト前にモックをリセット
    vi.clearAllMocks();
    // デフォルトでリトライ可能に設定
    (ErrorHandler.isRetryable as any).mockReturnValue(true);
  });
  it('should succeed on first try', async () => {
    const successFn = vi.fn().mockResolvedValue('success');
    
    const result = await retry(successFn);
    
    expect(result).toBe('success');
    expect(successFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const failThenSucceedFn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');
    
    const result = await retry(failThenSucceedFn, { maxAttempts: 4 });
    
    expect(result).toBe('success');
    expect(failThenSucceedFn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const alwaysFailFn = vi.fn().mockRejectedValue(new Error('always fail'));
    
    await expect(retry(alwaysFailFn, { maxAttempts: 3 })).rejects.toThrow('always fail');
    expect(alwaysFailFn).toHaveBeenCalledTimes(3); // 3 attempts total
  });

  it('should use custom delay', async () => {
    const failThenSucceedFn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    const start = Date.now();
    await retry(failThenSucceedFn, { maxAttempts: 2, delay: 100 });
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeGreaterThan(90); // Account for timing variance
    expect(failThenSucceedFn).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff', async () => {
    const failThenSucceedFn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');
    
    const start = Date.now();
    await retry(failThenSucceedFn, { 
      maxAttempts: 3, 
      delay: 50, 
      backoff: 'exponential' 
    });
    const elapsed = Date.now() - start;
    
    // Should be at least 50ms + 100ms (exponential backoff)
    expect(elapsed).toBeGreaterThan(140);
    expect(failThenSucceedFn).toHaveBeenCalledTimes(3);
  });

  it('should call onRetry callback', async () => {
    const failThenSucceedFn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    const onRetry = vi.fn();
    
    await retry(failThenSucceedFn, { maxAttempts: 2, onRetry });
    
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('should handle promise-returning functions', async () => {
    const asyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'async result';
    };
    
    const result = await retry(asyncFn);
    
    expect(result).toBe('async result');
  });

  it('should handle synchronous functions', async () => {
    const syncFn = () => 'sync result';
    
    const result = await retry(syncFn);
    
    expect(result).toBe('sync result');
  });

  it('should handle zero max retries', async () => {
    const failFn = vi.fn().mockRejectedValue(new Error('fail'));
    
    await expect(retry(failFn, { maxAttempts: 0 })).rejects.toThrow();
    expect(failFn).toHaveBeenCalledTimes(0); // maxAttempts: 0 means no attempts
  });

  it('should handle negative delay', async () => {
    const failThenSucceedFn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    const start = Date.now();
    await retry(failThenSucceedFn, { maxAttempts: 2, delay: -100 });
    const elapsed = Date.now() - start;
    
    // Should not delay for negative values
    expect(elapsed).toBeLessThan(50);
    expect(failThenSucceedFn).toHaveBeenCalledTimes(2);
  });
});