/**
 * 並列実行制御ユーティリティ
 */

export interface ConcurrentOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * 複数のPromiseを並列実行数を制限して実行
 */
export async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  options: ConcurrentOptions = {}
): Promise<T[]> {
  const { concurrency = 10, onProgress } = options;

  if (tasks.length === 0) {
    return [];
  }

  const results: T[] = new Array(tasks.length);
  const errors: { index: number; error: unknown }[] = [];
  let completed = 0;
  let index = 0;

  // ワーカー関数
  async function worker(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++;
      const task = tasks[currentIndex];

      try {
        if (task) {
          results[currentIndex] = await task();
        }
      } catch (error) {
        errors.push({ index: currentIndex, error });
      }

      completed++;
      if (onProgress) {
        onProgress(completed, tasks.length);
      }
    }
  }

  // 指定された並列数でワーカーを起動
  const workers = Array(Math.min(concurrency, tasks.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);

  // エラーがある場合は集約エラーをスロー
  if (errors.length > 0) {
    throw new AggregateError(
      errors.map(e => e.error as Error),
      `${errors.length} out of ${tasks.length} tasks failed`
    );
  }

  return results;
}

/**
 * 配列の要素に対して並列処理を実行
 */
export async function mapConcurrent<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  options: ConcurrentOptions = {}
): Promise<R[]> {
  const tasks = items.map(
    (item, index) => (): Promise<R> => mapper(item, index)
  );
  return runConcurrent(tasks, options);
}

/**
 * 並列処理の進捗を追跡するクラス
 */
export class ProgressTracker {
  private completed = 0;
  private startTime: number;

  constructor(
    private total: number,
    private onUpdate?: (progress: ProgressInfo) => void
  ) {
    this.startTime = Date.now();
  }

  increment(): void {
    this.completed++;
    if (this.onUpdate) {
      this.onUpdate(this.getProgress());
    }
  }

  getProgress(): ProgressInfo {
    const elapsed = Date.now() - this.startTime;
    const rate = this.completed / (elapsed / 1000); // items per second
    const remaining = this.total - this.completed;
    const eta = (remaining / rate) * 1000; // milliseconds

    return {
      completed: this.completed,
      total: this.total,
      percentage: Math.round((this.completed / this.total) * 100),
      elapsed,
      rate,
      eta: Math.round(eta),
      remaining,
    };
  }
}

export interface ProgressInfo {
  completed: number;
  total: number;
  percentage: number;
  elapsed: number;
  rate: number;
  eta: number;
  remaining: number;
}

/**
 * バッチ処理ユーティリティ
 */
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }

  return results;
}

/**
 * リトライ付き並列実行
 */
export async function runConcurrentWithRetry<T>(
  tasks: (() => Promise<T>)[],
  options: ConcurrentOptions & { maxRetries?: number; retryDelay?: number } = {}
): Promise<T[]> {
  const { maxRetries = 3, retryDelay = 1000, ...concurrentOptions } = options;

  const tasksWithRetry = tasks.map(task => async (): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve =>
            setTimeout(resolve, retryDelay * (attempt + 1))
          );
        }
      }
    }

    throw lastError;
  });

  return runConcurrent(tasksWithRetry, concurrentOptions);
}
