/**
 * サーキットブレーカー - 障害の連鎖を防ぐ
 */

import { EventEmitter } from 'events';

import { Logger } from '@lib/logger.js';

export interface CircuitBreaker {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastStateChange: Date;
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
}

export class CircuitBreakerImpl extends EventEmitter {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private logger: Logger;
  private defaultOptions: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 5000,
    resetTimeout: 30000,
    monitoringPeriod: 60000,
  };

  constructor(options?: CircuitBreakerOptions) {
    super();
    this.logger = new Logger({});
    if (options) {
      this.defaultOptions = { ...this.defaultOptions, ...options };
    }
    this.startMonitoring();
  }

  /**
   * サーキットブレーカーを作成または取得
   */
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    let breaker = this.breakers.get(name);

    if (!breaker) {
      const config = { ...this.defaultOptions, ...options };
      breaker = {
        name,
        state: 'closed',
        failureThreshold: config.failureThreshold,
        successThreshold: config.successThreshold,
        timeout: config.timeout,
        resetTimeout: config.resetTimeout,
        failureCount: 0,
        successCount: 0,
        lastStateChange: new Date(),
      };
      this.breakers.set(name, breaker);
      this.logger.info('サーキットブレーカーを作成しました', { name });
    }

    return breaker;
  }

  /**
   * 関数をサーキットブレーカーでラップ
   */
  async wrap<T>(
    name: string,
    fn: () => Promise<T>,
    options?: CircuitBreakerOptions
  ): Promise<T> {
    const breaker = this.getBreaker(name, options);

    if (breaker.state === 'open') {
      const now = Date.now();
      const timeSinceLastFailure = breaker.lastFailureTime
        ? now - breaker.lastFailureTime.getTime()
        : Infinity;

      if (timeSinceLastFailure > breaker.resetTimeout) {
        this.halfOpen(breaker);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${name}`);
      }
    }

    try {
      const result = await this.executeWithTimeout(fn, breaker.timeout);
      this.onSuccess(breaker);
      return result;
    } catch (error) {
      this.onFailure(breaker);
      throw error;
    }
  }

  /**
   * タイムアウト付きで関数を実行
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      ),
    ]);
  }

  /**
   * 成功時の処理
   */
  private onSuccess(breaker: CircuitBreaker): void {
    breaker.failureCount = 0;

    if (breaker.state === 'half-open') {
      breaker.successCount++;
      if (breaker.successCount >= breaker.successThreshold) {
        this.close(breaker);
      }
    }

    this.emit('success', {
      name: breaker.name,
      state: breaker.state,
    });
  }

  /**
   * 失敗時の処理
   */
  private onFailure(breaker: CircuitBreaker): void {
    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    if (breaker.state === 'half-open') {
      this.open(breaker);
    } else if (
      breaker.state === 'closed' &&
      breaker.failureCount >= breaker.failureThreshold
    ) {
      this.open(breaker);
    }

    this.emit('failure', {
      name: breaker.name,
      state: breaker.state,
      failureCount: breaker.failureCount,
    });
  }

  /**
   * サーキットを開く
   */
  private open(breaker: CircuitBreaker): void {
    breaker.state = 'open';
    breaker.lastStateChange = new Date();
    breaker.successCount = 0;

    this.logger.warn('サーキットブレーカーがOPENになりました', {
      name: breaker.name,
      failureCount: breaker.failureCount,
    });

    this.emit('state-change', {
      name: breaker.name,
      from: 'closed',
      to: 'open',
    });
  }

  /**
   * サーキットを半開にする
   */
  private halfOpen(breaker: CircuitBreaker): void {
    breaker.state = 'half-open';
    breaker.lastStateChange = new Date();
    breaker.successCount = 0;
    breaker.failureCount = 0;

    this.logger.info('サーキットブレーカーがHALF-OPENになりました', {
      name: breaker.name,
    });

    this.emit('state-change', {
      name: breaker.name,
      from: 'open',
      to: 'half-open',
    });
  }

  /**
   * サーキットを閉じる
   */
  private close(breaker: CircuitBreaker): void {
    breaker.state = 'closed';
    breaker.lastStateChange = new Date();
    breaker.successCount = 0;
    breaker.failureCount = 0;

    this.logger.info('サーキットブレーカーがCLOSEDになりました', {
      name: breaker.name,
    });

    this.emit('state-change', {
      name: breaker.name,
      from: 'half-open',
      to: 'closed',
    });
  }

  /**
   * 監視を開始
   */
  private startMonitoring(): void {
    setInterval(() => {
      const stats = this.getStats();
      this.emit('stats', stats);
    }, this.defaultOptions.monitoringPeriod);
  }

  /**
   * 統計情報を取得
   */
  getStats(): Record<string, unknown> {
    const stats = {
      total: this.breakers.size,
      open: 0,
      halfOpen: 0,
      closed: 0,
      breakers: [] as Array<{
        name: string;
        state: string;
        failureCount: number;
        lastFailure?: string;
      }>,
    };

    for (const breaker of this.breakers.values()) {
      switch (breaker.state) {
        case 'open':
          stats.open++;
          break;
        case 'half-open':
          stats.halfOpen++;
          break;
        case 'closed':
          stats.closed++;
          break;
      }

      stats.breakers.push({
        name: breaker.name,
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailure: breaker.lastFailureTime?.toISOString(),
      });
    }

    return stats;
  }

  /**
   * サーキットブレーカーをリセット
   */
  reset(name: string): void {
    const breaker = this.breakers.get(name);
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.successCount = 0;
      breaker.lastFailureTime = undefined;
      breaker.lastStateChange = new Date();

      this.logger.info('サーキットブレーカーをリセットしました', { name });
      this.emit('reset', { name });
    }
  }

  /**
   * すべてのサーキットブレーカーをリセット
   */
  resetAll(): void {
    for (const name of this.breakers.keys()) {
      this.reset(name);
    }
  }
}
