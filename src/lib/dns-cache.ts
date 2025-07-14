/**
 * DNS解決結果のキャッシュ機能
 */

import type { IDNSQuery } from '../types/index.js';
import type { IDNSResponse } from './dns-resolver.js';

/**
 * キャッシュエントリ
 */
interface CacheEntry {
  response: IDNSResponse;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
}

/**
 * キャッシュ設定
 */
export interface DnsCacheOptions {
  maxSize?: number;
  defaultTtl?: number;
  maxTtl?: number;
  minTtl?: number;
  cleanupInterval?: number;
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalEvictions: number;
  averageTtl: number;
  oldestEntry: number;
  newestEntry: number;
  memoryUsage: number;
}

/**
 * DNS解決結果のキャッシュクラス
 */
export class DnsCache {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private options: DnsCacheOptions = {}) {
    this.options = {
      maxSize: 1000,
      defaultTtl: 300, // 5分
      maxTtl: 86400, // 24時間
      minTtl: 60, // 1分
      cleanupInterval: 60000, // 1分
      ...options,
    };

    // 定期的なクリーンアップを開始
    this.startCleanup();
  }

  /**
   * キャッシュキーを生成
   */
  private createKey(query: IDNSQuery): string {
    return `${query.domain}:${query.type}:${query.server || 'default'}`.toLowerCase();
  }

  /**
   * TTLを計算（レコードのTTLまたはデフォルトTTLを使用）
   */
  private calculateTtl(response: IDNSResponse): number {
    // レコードからTTLを取得
    const recordTtls = response.records
      .map((record) => record.ttl)
      .filter((ttl) => ttl !== undefined);

    let ttl = this.options.defaultTtl!;

    if (recordTtls.length > 0) {
      // 最小のTTLを使用
      ttl = Math.min(...recordTtls);
    }

    // TTL制限を適用
    ttl = Math.max(this.options.minTtl!, Math.min(this.options.maxTtl!, ttl));

    return ttl;
  }

  /**
   * キャッシュから値を取得
   */
  get(query: IDNSQuery): IDNSResponse | null {
    const key = this.createKey(query);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    const age = (now - entry.timestamp) / 1000;

    // TTL期限切れチェック
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // アクセス統計を更新
    entry.accessCount++;
    entry.lastAccess = now;
    this.stats.hits++;

    return entry.response;
  }

  /**
   * キャッシュに値を設定
   */
  set(query: IDNSQuery, response: IDNSResponse): void {
    // エラーレスポンスはキャッシュしない
    if (response.status === 'error') {
      return;
    }

    const key = this.createKey(query);
    const now = Date.now();
    const ttl = this.calculateTtl(response);

    // キャッシュサイズ制限
    if (this.cache.size >= this.options.maxSize! && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry = {
      response,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccess: now,
    };

    this.cache.set(key, entry);
  }

  /**
   * 最も古いエントリを削除
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * 期限切れエントリをクリーンアップ
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = (now - entry.timestamp) / 1000;
      if (age > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 定期的なクリーンアップを開始
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * 特定のドメインのキャッシュを削除
   */
  invalidate(domain?: string, type?: string): number {
    let deleted = 0;

    for (const [key, _] of this.cache.entries()) {
      const [cachedDomain, cachedType] = key.split(':');

      let shouldDelete = false;

      if (domain && type) {
        shouldDelete = cachedDomain === domain.toLowerCase() && cachedType === type.toUpperCase();
      } else if (domain) {
        shouldDelete = cachedDomain === domain.toLowerCase();
      } else if (type) {
        shouldDelete = cachedType === type.toUpperCase();
      }

      if (shouldDelete) {
        this.cache.delete(key);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    const now = Date.now();
    let totalTtl = 0;
    let oldestEntry = now;
    let newestEntry = 0;

    for (const entry of this.cache.values()) {
      totalTtl += entry.ttl;
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      newestEntry = Math.max(newestEntry, entry.timestamp);
    }

    const averageTtl = this.cache.size > 0 ? totalTtl / this.cache.size : 0;
    const memoryUsage = this.estimateMemoryUsage();

    return {
      totalEntries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      totalEvictions: this.stats.evictions,
      averageTtl: Math.round(averageTtl),
      oldestEntry: this.cache.size > 0 ? now - oldestEntry : 0,
      newestEntry: this.cache.size > 0 ? now - newestEntry : 0,
      memoryUsage,
    };
  }

  /**
   * メモリ使用量を推定
   */
  private estimateMemoryUsage(): number {
    let size = 0;

    for (const [key, entry] of this.cache.entries()) {
      // キーのサイズ
      size += key.length * 2; // UTF-16

      // エントリのサイズ（簡易計算）
      size += JSON.stringify(entry.response).length * 2;
      size += 64; // エントリのメタデータ
    }

    return size;
  }

  /**
   * キャッシュを破棄
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * キャッシュの内容をエクスポート
   */
  export(): Array<{ key: string; entry: CacheEntry }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry: { ...entry },
    }));
  }

  /**
   * キャッシュの内容をインポート
   */
  import(data: Array<{ key: string; entry: CacheEntry }>): void {
    this.clear();

    const now = Date.now();

    for (const { key, entry } of data) {
      // 期限切れでないエントリのみインポート
      const age = (now - entry.timestamp) / 1000;
      if (age < entry.ttl) {
        this.cache.set(key, entry);
      }
    }
  }
}
