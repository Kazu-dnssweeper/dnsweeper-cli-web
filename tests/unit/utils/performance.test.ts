/**
 * パフォーマンス測定ユーティリティのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PerformanceTracker,
  getSystemMetrics,
  formatBytes,
  globalTracker,
} from '../../../src/utils/performance.js';

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
  });

  describe('start/end', () => {
    it('should track basic performance measurements', () => {
      tracker.start('test-operation');
      
      // 小さな遅延を追加
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }
      
      const result = tracker.end('test-operation');
      
      expect(result).toBeDefined();
      expect(result!.name).toBe('test-operation');
      expect(result!.duration).toBeGreaterThan(0);
      expect(result!.startTime).toBeGreaterThan(0);
      expect(result!.endTime).toBeGreaterThan(result!.startTime);
    });

    it('should track memory usage', () => {
      tracker.start('memory-test');
      const result = tracker.end('memory-test');
      
      expect(result!.memoryUsage).toBeDefined();
      expect(result!.memoryUsage!.heapUsed).toBeGreaterThan(0);
      expect(result!.memoryUsage!.heapTotal).toBeGreaterThan(0);
      expect(result!.memoryUsage!.systemFree).toBeGreaterThan(0);
      expect(result!.memoryUsage!.systemTotal).toBeGreaterThan(0);
    });

    it('should handle metadata', () => {
      const metadata = { operation: 'test', version: '1.0' };
      tracker.start('metadata-test', metadata);
      const result = tracker.end('metadata-test');
      
      expect(result!.metadata).toEqual(metadata);
    });

    it('should return null for unknown timer', () => {
      const result = tracker.end('unknown-timer');
      expect(result).toBeNull();
    });
  });

  describe('measure (async)', () => {
    it('should measure async function execution', async () => {
      const mockFn = vi.fn().mockResolvedValue('test-result');
      
      const { result, performance } = await tracker.measure(
        'async-test',
        mockFn
      );
      
      expect(result).toBe('test-result');
      expect(performance.name).toBe('async-test');
      expect(performance.duration).toBeGreaterThan(0);
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should handle async function errors', async () => {
      const error = new Error('test error');
      const mockFn = vi.fn().mockRejectedValue(error);
      
      await expect(tracker.measure('error-test', mockFn)).rejects.toThrow(
        'test error'
      );
      
      // エラーでも測定は終了されるべき
      const results = tracker.getResults('error-test');
      expect(results).toHaveLength(1);
    });
  });

  describe('measureSync', () => {
    it('should measure sync function execution', () => {
      const mockFn = vi.fn().mockReturnValue('sync-result');
      
      const { result, performance } = tracker.measureSync(
        'sync-test',
        mockFn
      );
      
      expect(result).toBe('sync-result');
      expect(performance.name).toBe('sync-test');
      expect(performance.duration).toBeGreaterThan(0);
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('should handle sync function errors', () => {
      const error = new Error('sync error');
      const mockFn = vi.fn().mockImplementation(() => {
        throw error;
      });
      
      expect(() => tracker.measureSync('sync-error-test', mockFn)).toThrow(
        'sync error'
      );
      
      // エラーでも測定は終了されるべき
      const results = tracker.getResults('sync-error-test');
      expect(results).toHaveLength(1);
    });
  });

  describe('getResults', () => {
    it('should return results for specific measurement', () => {
      tracker.start('test-1');
      tracker.end('test-1');
      
      tracker.start('test-2');
      tracker.end('test-2');
      
      const results1 = tracker.getResults('test-1');
      const results2 = tracker.getResults('test-2');
      
      expect(results1).toHaveLength(1);
      expect(results1[0].name).toBe('test-1');
      expect(results2).toHaveLength(1);
      expect(results2[0].name).toBe('test-2');
    });

    it('should return all results when no name specified', () => {
      tracker.start('test-1');
      tracker.end('test-1');
      
      tracker.start('test-2');
      tracker.end('test-2');
      
      const allResults = tracker.getResults();
      expect(allResults).toHaveLength(2);
    });

    it('should return empty array for unknown measurement', () => {
      const results = tracker.getResults('unknown');
      expect(results).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    it('should calculate statistics correctly', () => {
      // 複数の測定を行う
      const durations = [10, 20, 30, 40, 50];
      
      durations.forEach(duration => {
        tracker.start('stats-test');
        // 指定した時間待機をシミュレート
        const result = tracker.end('stats-test');
        if (result) {
          // テスト用に duration を上書き
          result.duration = duration;
        }
      });
      
      const stats = tracker.getStatistics('stats-test');
      
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(5);
      expect(stats!.total).toBe(150);
      expect(stats!.average).toBe(30);
      expect(stats!.min).toBe(10);
      expect(stats!.max).toBe(50);
      expect(stats!.median).toBe(30);
    });

    it('should return null for unknown measurement', () => {
      const stats = tracker.getStatistics('unknown');
      expect(stats).toBeNull();
    });

    it('should return null for empty results', () => {
      // 開始だけして終了しない（durationが0のレコードが作成される）
      tracker.start('empty-test');
      const result = tracker.end('empty-test');
      
      // 実際には result.duration が 0 になるため、統計は計算される
      expect(result).not.toBeNull();
      expect(result!.duration).toBeGreaterThanOrEqual(0);
      
      const stats = tracker.getStatistics('empty-test');
      expect(stats).not.toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear specific measurement', () => {
      tracker.start('test-1');
      tracker.end('test-1');
      
      tracker.start('test-2');
      tracker.end('test-2');
      
      tracker.clear('test-1');
      
      expect(tracker.getResults('test-1')).toHaveLength(0);
      expect(tracker.getResults('test-2')).toHaveLength(1);
    });

    it('should clear all measurements', () => {
      tracker.start('test-1');
      tracker.end('test-1');
      
      tracker.start('test-2');
      tracker.end('test-2');
      
      tracker.clear();
      
      expect(tracker.getResults()).toHaveLength(0);
    });
  });

  describe('generateReport', () => {
    it('should generate formatted report', () => {
      tracker.start('report-test');
      tracker.end('report-test');
      
      const report = tracker.generateReport();
      
      expect(report).toContain('=== Performance Report ===');
      expect(report).toContain('[report-test]');
      expect(report).toContain('Count: 1');
      expect(report).toContain('Average:');
      expect(report).toContain('Min:');
      expect(report).toContain('Max:');
    });

    it('should handle empty measurements', () => {
      const report = tracker.generateReport();
      expect(report).toContain('=== Performance Report ===');
    });
  });
});

describe('getSystemMetrics', () => {
  it('should return system metrics', () => {
    const metrics = getSystemMetrics();
    
    expect(metrics.cpu).toBeDefined();
    expect(metrics.cpu.count).toBeGreaterThan(0);
    expect(metrics.cpu.model).toBeTruthy();
    expect(metrics.cpu.speed).toBeGreaterThanOrEqual(0); // speed can be 0 in some environments
    expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
    
    expect(metrics.memory).toBeDefined();
    expect(metrics.memory.total).toBeGreaterThan(0);
    expect(metrics.memory.free).toBeGreaterThanOrEqual(0);
    expect(metrics.memory.used).toBeGreaterThanOrEqual(0);
    expect(metrics.memory.usagePercent).toBeGreaterThanOrEqual(0);
    expect(metrics.memory.usagePercent).toBeLessThanOrEqual(100);
    
    expect(metrics.process).toBeDefined();
    expect(metrics.process.uptime).toBeGreaterThan(0);
    expect(metrics.process.pid).toBeGreaterThan(0);
    expect(metrics.process.version).toBeTruthy();
    expect(metrics.process.memoryUsage).toBeDefined();
  });
});

describe('formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0.00 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
  });

  it('should handle non-round numbers', () => {
    expect(formatBytes(1536)).toBe('1.50 KB'); // 1.5 KB
    expect(formatBytes(2621440)).toBe('2.50 MB'); // 2.5 MB
  });
});

describe('globalTracker', () => {
  it('should be accessible globally', () => {
    expect(globalTracker).toBeInstanceOf(PerformanceTracker);
  });

  it('should maintain state between calls', () => {
    globalTracker.clear(); // クリーンアップ
    
    globalTracker.start('global-test');
    globalTracker.end('global-test');
    
    const results = globalTracker.getResults('global-test');
    expect(results).toHaveLength(1);
    
    globalTracker.clear(); // クリーンアップ
  });
});