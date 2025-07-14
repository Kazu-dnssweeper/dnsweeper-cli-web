import { describe, it, expect, vi } from 'vitest';
import {
  runConcurrent,
  mapConcurrent,
  ProgressTracker,
  processBatch,
  runConcurrentWithRetry
} from '../../../src/utils/concurrent.js';

describe('concurrent utilities', () => {
  describe('runConcurrent', () => {
    it('並列実行数を制限して実行する', async () => {
      const tasks: (() => Promise<number>)[] = [];
      const executionOrder: number[] = [];
      let running = 0;
      let maxRunning = 0;

      // 10個のタスクを作成
      for (let i = 0; i < 10; i++) {
        tasks.push(async () => {
          running++;
          maxRunning = Math.max(maxRunning, running);
          executionOrder.push(i);
          
          // ランダムな遅延
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          
          running--;
          return i;
        });
      }

      const results = await runConcurrent(tasks, { concurrency: 3 });

      expect(results).toHaveLength(10);
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(maxRunning).toBeLessThanOrEqual(3);
    });

    it('空の配列を処理できる', async () => {
      const results = await runConcurrent([], { concurrency: 5 });
      expect(results).toEqual([]);
    });

    it('エラーが発生した場合、AggregateErrorをスローする', async () => {
      const tasks = [
        async () => 1,
        async () => { throw new Error('Task 2 failed'); },
        async () => 3,
        async () => { throw new Error('Task 4 failed'); },
      ];

      await expect(runConcurrent(tasks)).rejects.toThrow(AggregateError);
      
      try {
        await runConcurrent(tasks);
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toHaveLength(2);
      }
    });

    it('進捗コールバックが呼ばれる', async () => {
      const onProgress = vi.fn();
      const tasks = Array(5).fill(null).map((_, i) => async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return i;
      });

      await runConcurrent(tasks, { concurrency: 2, onProgress });

      expect(onProgress).toHaveBeenCalledTimes(5);
      expect(onProgress).toHaveBeenCalledWith(1, 5);
      expect(onProgress).toHaveBeenCalledWith(5, 5);
    });
  });

  describe('mapConcurrent', () => {
    it('配列の要素に対して並列処理を実行', async () => {
      const items = [1, 2, 3, 4, 5];
      const mapper = async (item: number, index: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return item * 2;
      };

      const results = await mapConcurrent(items, mapper, { concurrency: 2 });

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('インデックスが正しく渡される', async () => {
      const items = ['a', 'b', 'c'];
      const indices: number[] = [];
      
      await mapConcurrent(items, async (item, index) => {
        indices.push(index);
        return item;
      });

      expect(indices.sort()).toEqual([0, 1, 2]);
    });
  });

  describe('ProgressTracker', () => {
    it('進捗を正しく追跡する', async () => {
      const updates: any[] = [];
      const tracker = new ProgressTracker(10, (info) => {
        updates.push({ ...info });
      });

      for (let i = 0; i < 5; i++) {
        tracker.increment();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      expect(updates).toHaveLength(5);
      expect(updates[4].completed).toBe(5);
      expect(updates[4].total).toBe(10);
      expect(updates[4].percentage).toBe(50);
      expect(updates[4].remaining).toBe(5);
    });

    it('レートとETAを計算する', async () => {
      const tracker = new ProgressTracker(100);
      
      // 高速に50個完了
      for (let i = 0; i < 50; i++) {
        tracker.increment();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const progress = tracker.getProgress();
      expect(progress.rate).toBeGreaterThan(0);
      expect(progress.eta).toBeGreaterThan(0);
      expect(progress.elapsed).toBeGreaterThan(0);
    });
  });

  describe('processBatch', () => {
    it('バッチ単位で処理する', async () => {
      const items = Array.from({ length: 10 }, (_, i) => i);
      const processedBatches: number[][] = [];
      
      const processor = async (batch: number[]) => {
        processedBatches.push([...batch]);
        return batch.map(x => x * 2);
      };

      const results = await processBatch(items, 3, processor);

      expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
      expect(processedBatches).toHaveLength(4);
      expect(processedBatches[0]).toEqual([0, 1, 2]);
      expect(processedBatches[1]).toEqual([3, 4, 5]);
      expect(processedBatches[2]).toEqual([6, 7, 8]);
      expect(processedBatches[3]).toEqual([9]);
    });

    it('空の配列を処理できる', async () => {
      const processor = async (batch: number[]) => batch;
      const results = await processBatch([], 5, processor);
      expect(results).toEqual([]);
    });
  });

  describe('runConcurrentWithRetry', () => {
    it('失敗したタスクをリトライする', async () => {
      let attempt = 0;
      const task = async () => {
        attempt++;
        if (attempt < 3) {
          throw new Error(`Attempt ${attempt} failed`);
        }
        return 'success';
      };

      const results = await runConcurrentWithRetry([task], {
        maxRetries: 3,
        retryDelay: 10
      });

      expect(results).toEqual(['success']);
      expect(attempt).toBe(3);
    });

    it('最大リトライ回数後にエラーをスロー', async () => {
      const task = async () => {
        throw new Error('Always fails');
      };

      await expect(runConcurrentWithRetry([task], {
        maxRetries: 2,
        retryDelay: 10
      })).rejects.toThrow(AggregateError);
    });

    it('リトライ遅延が増加する', async () => {
      const delays: number[] = [];
      let lastTime = Date.now();
      
      const task = async () => {
        const now = Date.now();
        const delay = now - lastTime;
        delays.push(delay);
        lastTime = now;
        
        if (delays.length < 3) {
          throw new Error('Retry needed');
        }
        return 'success';
      };

      await runConcurrentWithRetry([task], {
        maxRetries: 3,
        retryDelay: 20
      });

      // 最初の実行を除いて、遅延が増加していることを確認
      expect(delays[1]).toBeGreaterThanOrEqual(20);
      expect(delays[2]).toBeGreaterThanOrEqual(delays[1]);
    });
  });
});