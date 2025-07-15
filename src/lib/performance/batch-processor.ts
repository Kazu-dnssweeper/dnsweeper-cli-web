/**
 * 高性能バッチ処理ユーティリティ
 * DNS解決やCSV処理の大量データを効率的に処理
 */

export interface BatchProcessorOptions<T> {
  batchSize: number;
  concurrency: number;
  retries: number;
  retryDelay: number;
  onProgress?: (processed: number, total: number) => void;
  onError?: (error: Error, item: T) => void;
}

export interface BatchResult<T, R> {
  successful: R[];
  failed: Array<{ item: T; error: Error }>;
  totalProcessed: number;
  duration: number;
}

export class BatchProcessor<T, R> {
  private options: BatchProcessorOptions<T>;

  constructor(options: Partial<BatchProcessorOptions<T>> = {}) {
    this.options = {
      batchSize: 50,
      concurrency: 10,
      retries: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  /**
   * アイテムのバッチを並列処理
   */
  async process(
    items: T[],
    processor: (item: T) => Promise<R>
  ): Promise<BatchResult<T, R>> {
    const startTime = Date.now();
    const successful: R[] = [];
    const failed: Array<{ item: T; error: Error }> = [];
    let processedCount = 0;

    // アイテムをバッチに分割
    const batches = this.createBatches(items);

    for (const batch of batches) {
      const batchResults = await this.processBatch(batch, processor);

      successful.push(...batchResults.successful);
      failed.push(...batchResults.failed);
      processedCount += batch.length;

      // 進捗報告
      this.options.onProgress?.(processedCount, items.length);
    }

    return {
      successful,
      failed,
      totalProcessed: processedCount,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 単一バッチの並列処理
   */
  private async processBatch(
    batch: T[],
    processor: (item: T) => Promise<R>
  ): Promise<{ successful: R[]; failed: Array<{ item: T; error: Error }> }> {
    const successful: R[] = [];
    const failed: Array<{ item: T; error: Error }> = [];

    // 並行処理制限
    const semaphore = new Semaphore(this.options.concurrency);

    const promises = batch.map(async item => {
      await semaphore.acquire();

      try {
        const result = await this.processWithRetry(item, processor);
        successful.push(result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        failed.push({ item, error: err });
        this.options.onError?.(err, item);
      } finally {
        semaphore.release();
      }
    });

    await Promise.all(promises);

    return { successful, failed };
  }

  /**
   * リトライ機能付きアイテム処理
   */
  private async processWithRetry(
    item: T,
    processor: (item: T) => Promise<R>
  ): Promise<R> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      try {
        return await processor(item);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.options.retries) {
          await this.delay(this.options.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError!;
  }

  /**
   * アイテムをバッチに分割
   */
  private createBatches(items: T[]): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += this.options.batchSize) {
      batches.push(items.slice(i, i + this.options.batchSize));
    }

    return batches;
  }

  /**
   * 指定時間待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * セマフォクラス（並行処理制限）
 */
class Semaphore {
  private available: number;
  private waiters: Array<() => void> = [];

  constructor(count: number) {
    this.available = count;
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return;
    }

    return new Promise<void>(resolve => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    if (this.waiters.length > 0) {
      const resolve = this.waiters.shift()!;
      resolve();
    } else {
      this.available++;
    }
  }
}

/**
 * DNS解決専用のバッチプロセッサー
 */
export class DNSBatchProcessor extends BatchProcessor<string, unknown> {
  constructor(options: Partial<BatchProcessorOptions<string>> = {}) {
    super({
      batchSize: 100,
      concurrency: 20,
      retries: 2,
      retryDelay: 500,
      ...options,
    });
  }
}

/**
 * CSV処理専用のバッチプロセッサー
 */
export class CSVBatchProcessor<T> extends BatchProcessor<T, T> {
  constructor(options: Partial<BatchProcessorOptions<T>> = {}) {
    super({
      batchSize: 1000,
      concurrency: 4,
      retries: 1,
      retryDelay: 100,
      ...options,
    });
  }
}
