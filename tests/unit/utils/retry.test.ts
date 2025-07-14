/**
 * retry.ts のテスト
 */

import { describe, it, expect, vi } from 'vitest';

import { retry, RetryOptions } from '../../../src/utils/retry.js';

describe('retry utility', () => {
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
    
    const result = await retry(failThenSucceedFn, { maxRetries: 3 });
    
    expect(result).toBe('success');
    expect(failThenSucceedFn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const alwaysFailFn = vi.fn().mockRejectedValue(new Error('always fail'));
    
    await expect(retry(alwaysFailFn, { maxRetries: 2 })).rejects.toThrow('always fail');
    expect(alwaysFailFn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should use custom delay', async () => {
    const failThenSucceedFn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    const start = Date.now();
    await retry(failThenSucceedFn, { maxRetries: 1, delay: 100 });
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
      maxRetries: 2, 
      delay: 50, 
      exponentialBackoff: true 
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
    
    await retry(failThenSucceedFn, { maxRetries: 1, onRetry });
    
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.any(Error),
      1,
      expect.objectContaining({ maxRetries: 1 })
    );
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
    
    await expect(retry(failFn, { maxRetries: 0 })).rejects.toThrow('fail');
    expect(failFn).toHaveBeenCalledTimes(1);
  });

  it('should handle negative delay', async () => {
    const failThenSucceedFn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    const start = Date.now();
    await retry(failThenSucceedFn, { maxRetries: 1, delay: -100 });
    const elapsed = Date.now() - start;
    
    // Should not delay for negative values
    expect(elapsed).toBeLessThan(50);
    expect(failThenSucceedFn).toHaveBeenCalledTimes(2);
  });
});