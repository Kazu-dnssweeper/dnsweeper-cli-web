/**
 * メモリ最適化ユーティリティ
 * 大容量データ処理時のメモリ効率を向上
 */

export interface MemoryUsage {
  used: number;
  external: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
}

export interface StreamProcessorOptions {
  chunkSize: number;
  highWaterMark: number;
  objectMode: boolean;
  onMemoryWarning?: (usage: MemoryUsage) => void;
  memoryWarningThreshold?: number; // MB
}

export class MemoryOptimizer {
  private static readonly DEFAULT_WARNING_THRESHOLD = 512; // 512MB

  /**
   * 現在のメモリ使用量を取得
   */
  static getMemoryUsage(): MemoryUsage {
    const usage = process.memoryUsage();
    return {
      used: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
    };
  }

  /**
   * メモリ使用量をログ出力
   */
  static logMemoryUsage(label = 'Memory usage'): void {
    const usage = this.getMemoryUsage();
    console.log(`${label}:`, {
      'Heap Used': `${usage.heapUsed}MB`,
      'Heap Total': `${usage.heapTotal}MB`,
      External: `${usage.external}MB`,
      RSS: `${usage.rss}MB`,
    });
  }

  /**
   * メモリ警告チェック
   */
  static checkMemoryWarning(
    threshold = this.DEFAULT_WARNING_THRESHOLD,
    onWarning?: (usage: MemoryUsage) => void
  ): boolean {
    const usage = this.getMemoryUsage();

    if (usage.heapUsed > threshold) {
      onWarning?.(usage);
      return true;
    }

    return false;
  }

  /**
   * ガベージコレクション強制実行
   */
  static forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    } else {
      console.warn(
        'Garbage collection is not exposed. Run with --expose-gc flag.'
      );
    }
  }

  /**
   * メモリ効率的な配列チャンク処理
   */
  static async processArrayInChunks<T, R>(
    array: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    chunkSize = 1000,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    let processed = 0;

    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk);

      results.push(...chunkResults);
      processed += chunk.length;

      onProgress?.(processed, array.length);

      // メモリ警告チェック
      this.checkMemoryWarning(512, usage => {
        console.warn(`Memory warning: ${usage.heapUsed}MB used`);
        this.forceGarbageCollection();
      });
    }

    return results;
  }

  /**
   * WeakMapベースのキャッシュ（メモリリーク防止）
   */
  static createWeakCache<K extends object, V>(): WeakMap<K, V> {
    return new WeakMap<K, V>();
  }

  /**
   * LRUキャッシュの実装
   */
  static createLRUCache<K, V>(maxSize: number): LRUCache<K, V> {
    return new LRUCache<K, V>(maxSize);
  }
}

/**
 * LRUキャッシュ実装
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // LRUのため再挿入
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 最古のアイテムを削除
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
}

/**
 * ストリーミング処理用のメモリ効率的なプロセッサー
 */
export class StreamProcessor<T> {
  private options: StreamProcessorOptions;
  private processedCount = 0;

  constructor(options: Partial<StreamProcessorOptions> = {}) {
    this.options = {
      chunkSize: 1000,
      highWaterMark: 64 * 1024, // 64KB
      objectMode: true,
      memoryWarningThreshold: 512,
      ...options,
    };
  }

  /**
   * ストリーミング処理
   */
  async processStream<R>(
    items: AsyncIterable<T> | Iterable<T>,
    processor: (item: T) => Promise<R> | R
  ): Promise<R[]> {
    const results: R[] = [];
    let chunk: T[] = [];

    for await (const item of items) {
      chunk.push(item);

      if (chunk.length >= this.options.chunkSize) {
        const chunkResults = await this.processChunk(chunk, processor);
        results.push(...chunkResults);
        chunk = []; // チャンクをクリア

        // メモリチェック
        this.checkMemoryAndCleanup();
      }
    }

    // 残りのアイテムを処理
    if (chunk.length > 0) {
      const chunkResults = await this.processChunk(chunk, processor);
      results.push(...chunkResults);
    }

    return results;
  }

  private async processChunk<R>(
    chunk: T[],
    processor: (item: T) => Promise<R> | R
  ): Promise<R[]> {
    const results: R[] = [];

    for (const item of chunk) {
      try {
        const result = await processor(item);
        results.push(result);
        this.processedCount++;
      } catch (error) {
        console.error('Error processing item:', error);
      }
    }

    return results;
  }

  private checkMemoryAndCleanup(): void {
    const threshold = this.options.memoryWarningThreshold || 512;

    MemoryOptimizer.checkMemoryWarning(threshold, usage => {
      this.options.onMemoryWarning?.(usage);
      MemoryOptimizer.forceGarbageCollection();
    });
  }

  getProcessedCount(): number {
    return this.processedCount;
  }

  reset(): void {
    this.processedCount = 0;
  }
}
