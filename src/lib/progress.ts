import ora, { type Ora } from 'ora';

import { colorize } from './colors.js';

/**
 * カスタムスピナー設定
 */
export const spinners = {
  dns: {
    interval: 80,
    frames: ['🔍', '🔎', '🔍', '🔎'],
  },
  processing: {
    interval: 100,
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  },
  network: {
    interval: 120,
    frames: ['📡', '📶', '🌐', '📡'],
  },
  analysis: {
    interval: 150,
    frames: ['📊', '📈', '📉', '📊'],
  },
  upload: {
    interval: 100,
    frames: ['⬆️ ', '⬆️ ', '⬆️ ', '⬆️ '],
  },
  download: {
    interval: 100,
    frames: ['⬇️ ', '⬇️ ', '⬇️ ', '⬇️ '],
  },
} as const;

export type SpinnerType = keyof typeof spinners;

/**
 * 進捗表示コンポーネント
 */
export class ProgressDisplay {
  private _spinner: Ora | null = null;
  private isEnabled: boolean;

  /**
   * Oraスピナーインスタンスにアクセス（Loggerとの互換性のため）
   */
  get spinner(): Ora | null {
    return this._spinner;
  }

  constructor(options: { enabled?: boolean } = {}) {
    this.isEnabled = options.enabled ?? process.stdout.isTTY;
  }

  /**
   * スピナーを開始
   */
  start(text: string, _type: SpinnerType = 'processing'): this {
    if (!this.isEnabled) {
      // eslint-disable-next-line no-console
      console.log(text);
      return this;
    }

    this._spinner = ora({
      text: text,
      spinner: 'dots',
      color: 'cyan',
    }).start();

    return this;
  }

  /**
   * スピナーのテキストを更新
   */
  update(text: string): this {
    if (this._spinner) {
      this._spinner.text = text;
    }
    return this;
  }

  /**
   * 成功で終了
   */
  succeed(text?: string): this {
    if (this._spinner) {
      this._spinner.succeed(text);
      this._spinner = null;
    } else if (text) {
      // eslint-disable-next-line no-console
      console.log(colorize.success('✓'), text);
    }
    return this;
  }

  /**
   * 失敗で終了
   */
  fail(text?: string): this {
    if (this._spinner) {
      this._spinner.fail(text);
      this._spinner = null;
    } else if (text) {
      // eslint-disable-next-line no-console
      console.log(colorize.error('✗'), text);
    }
    return this;
  }

  /**
   * 警告で終了
   */
  warn(text?: string): this {
    if (this._spinner) {
      this._spinner.warn(text);
      this._spinner = null;
    } else if (text) {
      // eslint-disable-next-line no-console
      console.log(colorize.warning('⚠'), text);
    }
    return this;
  }

  /**
   * 情報で終了
   */
  info(text?: string): this {
    if (this._spinner) {
      this._spinner.info(text);
      this._spinner = null;
    } else if (text) {
      // eslint-disable-next-line no-console
      console.log(colorize.info('ℹ'), text);
    }
    return this;
  }

  /**
   * 停止
   */
  stop(): this {
    if (this._spinner) {
      this._spinner.stop();
      this._spinner = null;
    }
    return this;
  }

  /**
   * 実行中かどうか
   */
  isSpinning(): boolean {
    return this._spinner?.isSpinning ?? false;
  }
}

/**
 * バッチ進捗表示
 */
export class BatchProgress {
  private total: number;
  private completed: number = 0;
  private failed: number = 0;
  private startTime: number;
  private display: ProgressDisplay;

  constructor(total: number, enabled?: boolean) {
    this.total = total;
    this.startTime = Date.now();
    this.display = new ProgressDisplay({ enabled });
  }

  /**
   * 進捗を開始
   */
  start(text: string = '処理中'): this {
    this.display.start(`${text} (0/${this.total})`, 'processing');
    return this;
  }

  /**
   * アイテム完了
   */
  increment(text?: string): this {
    this.completed++;
    const progress = `(${this.completed + this.failed}/${this.total})`;
    const defaultText = `処理中 ${progress}`;

    this.display.update(text ? `${text} ${progress}` : defaultText);
    return this;
  }

  /**
   * アイテム失敗
   */
  fail(text?: string): this {
    this.failed++;
    const progress = `(${this.completed + this.failed}/${this.total})`;
    const defaultText = `処理中 ${progress} - ${this.failed}件失敗`;

    this.display.update(text ? `${text} ${progress}` : defaultText);
    return this;
  }

  /**
   * 完了
   */
  finish(text?: string): this {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const summary = `${this.completed}件成功, ${this.failed}件失敗 (${elapsed}秒)`;

    if (this.failed === 0) {
      this.display.succeed(text || `完了: ${summary}`);
    } else if (this.completed > 0) {
      this.display.warn(text || `部分完了: ${summary}`);
    } else {
      this.display.fail(text || `失敗: ${summary}`);
    }

    return this;
  }

  /**
   * 進捗情報を取得
   */
  getStats(): {
    total: number;
    completed: number;
    failed: number;
    remaining: number;
    elapsed: number;
  } {
    return {
      total: this.total,
      completed: this.completed,
      failed: this.failed,
      remaining: this.total - this.completed - this.failed,
      elapsed: Date.now() - this.startTime,
    };
  }
}

/**
 * ヘルパー関数: シンプルなスピナー
 */
export function createSpinner(
  text: string,
  type: SpinnerType = 'processing'
): ProgressDisplay {
  return new ProgressDisplay().start(text, type);
}

/**
 * ヘルパー関数: バッチ処理用進捗
 */
export function createBatchProgress(
  total: number,
  text?: string
): BatchProgress {
  return new BatchProgress(total).start(text);
}

/**
 * ヘルパー関数: 非同期処理をスピナー付きで実行
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  type: SpinnerType = 'processing'
): Promise<T> {
  const spinner = createSpinner(text, type);

  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

/**
 * ヘルパー関数: バッチ処理をバッチ進捗付きで実行
 */
export async function withBatchProgress<T, R>(
  items: T[],
  processor: (item: T, progress: BatchProgress) => Promise<R>,
  text?: string
): Promise<R[]> {
  const progress = createBatchProgress(items.length, text);
  const results: R[] = [];

  for (const item of items) {
    try {
      const result = await processor(item, progress);
      results.push(result);
      progress.increment();
    } catch {
      progress.fail();
    }
  }

  progress.finish();
  return results;
}
