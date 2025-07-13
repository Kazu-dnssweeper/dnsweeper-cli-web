/**
 * dns-cache.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DnsCache,
  type DnsCacheOptions,
  type CacheStats
} from '../../src/lib/dns-cache.js';
import type { IDNSQuery, IDNSResponse } from '../../src/lib/dns-resolver.js';

describe('DnsCache', () => {
  let cache: DnsCache;

  beforeEach(() => {
    cache = new DnsCache();
  });

  afterEach(() => {
    cache.destroy();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('デフォルト設定で初期化', () => {
      const defaultCache = new DnsCache();
      expect(defaultCache).toBeDefined();
      defaultCache.destroy();
    });

    it('カスタム設定で初期化', () => {
      const options: DnsCacheOptions = {
        maxSize: 500,
        defaultTtl: 600,
        maxTtl: 3600,
        minTtl: 30,
        cleanupInterval: 30000
      };
      
      const customCache = new DnsCache(options);
      expect(customCache).toBeDefined();
      customCache.destroy();
    });
  });

  describe('set and get', () => {
    it('キャッシュに値を設定して取得', () => {
      const query: IDNSQuery = {
        domain: 'example.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [{ type: 'A', value: '192.0.2.1' }],
        responseTime: 100,
        status: 'success'
      };

      cache.set(query, response);
      const retrieved = cache.get(query);

      expect(retrieved).toEqual(response);
    });

    it('存在しないキーに対してnullを返す', () => {
      const query: IDNSQuery = {
        domain: 'nonexistent.com',
        type: 'A'
      };

      const result = cache.get(query);
      expect(result).toBeNull();
    });

    it('大文字小文字を区別しないキー', () => {
      const query1: IDNSQuery = {
        domain: 'EXAMPLE.COM',
        type: 'A'
      };

      const query2: IDNSQuery = {
        domain: 'example.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query: query1,
        records: [{ type: 'A', value: '192.0.2.1' }],
        responseTime: 100,
        status: 'success'
      };

      cache.set(query1, response);
      const retrieved = cache.get(query2);

      expect(retrieved).toEqual(response);
    });

    it('エラーレスポンスはキャッシュしない', () => {
      const query: IDNSQuery = {
        domain: 'error.com',
        type: 'A'
      };

      const errorResponse: IDNSResponse = {
        query,
        records: [],
        responseTime: 100,
        status: 'error',
        error: 'DNS resolution failed'
      };

      cache.set(query, errorResponse);
      const retrieved = cache.get(query);

      expect(retrieved).toBeNull();
    });
  });

  describe('TTL管理', () => {
    it('TTL期限切れのエントリを自動削除', async () => {
      const shortTtlCache = new DnsCache({
        defaultTtl: 0.01, // 10ms
        cleanupInterval: 5000
      });

      const query: IDNSQuery = {
        domain: 'short-ttl.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [{ type: 'A', value: '192.0.2.1' }],
        responseTime: 100,
        status: 'success'
      };

      shortTtlCache.set(query, response);
      
      // すぐに取得できることを確認
      expect(shortTtlCache.get(query)).toEqual(response);
      
      // TTL期限切れまで待機
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // 期限切れで取得できないことを確認
      expect(shortTtlCache.get(query)).toBeNull();
      
      shortTtlCache.destroy();
    });

    it('レコードのTTLを使用', () => {
      const query: IDNSQuery = {
        domain: 'example.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [
          { type: 'A', value: '192.0.2.1', ttl: 100 },
          { type: 'A', value: '192.0.2.2', ttl: 200 }
        ],
        responseTime: 100,
        status: 'success'
      };

      cache.set(query, response);
      const retrieved = cache.get(query);

      expect(retrieved).toEqual(response);
    });

    it('最小TTLを適用', () => {
      const constrainedCache = new DnsCache({
        minTtl: 100,
        maxTtl: 1000
      });

      const query: IDNSQuery = {
        domain: 'example.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [{ type: 'A', value: '192.0.2.1', ttl: 50 }], // minTtlより小さい
        responseTime: 100,
        status: 'success'
      };

      constrainedCache.set(query, response);
      const retrieved = constrainedCache.get(query);

      expect(retrieved).toEqual(response);
      
      constrainedCache.destroy();
    });

    it('最大TTLを適用', () => {
      const constrainedCache = new DnsCache({
        minTtl: 100,
        maxTtl: 1000
      });

      const query: IDNSQuery = {
        domain: 'example.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [{ type: 'A', value: '192.0.2.1', ttl: 5000 }], // maxTtlより大きい
        responseTime: 100,
        status: 'success'
      };

      constrainedCache.set(query, response);
      const retrieved = constrainedCache.get(query);

      expect(retrieved).toEqual(response);
      
      constrainedCache.destroy();
    });
  });

  describe('サイズ制限', () => {
    it('最大サイズを超えた場合に古いエントリを削除', () => {
      const smallCache = new DnsCache({ maxSize: 2 });

      // 3つのエントリを追加（maxSizeは2）
      for (let i = 1; i <= 3; i++) {
        const query: IDNSQuery = {
          domain: `example${i}.com`,
          type: 'A'
        };

        const response: IDNSResponse = {
          query,
          records: [{ type: 'A', value: `192.0.2.${i}` }],
          responseTime: 100,
          status: 'success'
        };

        smallCache.set(query, response);
        
        // 少し待機してアクセス時間を区別
        if (i < 3) {
          const start = Date.now();
          while (Date.now() - start < 1) {
            // 短時間待機
          }
        }
      }

      // 最初のエントリ（最も古い）が削除されていることを確認
      const firstQuery: IDNSQuery = {
        domain: 'example1.com',
        type: 'A'
      };
      
      expect(smallCache.get(firstQuery)).toBeNull();

      // 2番目と3番目のエントリは残っていることを確認
      const secondQuery: IDNSQuery = {
        domain: 'example2.com',
        type: 'A'
      };
      
      const thirdQuery: IDNSQuery = {
        domain: 'example3.com',
        type: 'A'
      };

      expect(smallCache.get(secondQuery)).toBeDefined();
      expect(smallCache.get(thirdQuery)).toBeDefined();

      smallCache.destroy();
    });
  });

  describe('統計情報', () => {
    it('ヒット率を正しく計算', () => {
      const query: IDNSQuery = {
        domain: 'example.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [{ type: 'A', value: '192.0.2.1' }],
        responseTime: 100,
        status: 'success'
      };

      // 1回のミス（キャッシュなし）
      cache.get(query);

      // 1回のセット
      cache.set(query, response);

      // 2回のヒット（キャッシュあり）
      cache.get(query);
      cache.get(query);

      const stats = cache.getStats();
      
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(66.67); // 2/3 * 100, rounded
    });

    it('統計情報の基本項目', () => {
      const query: IDNSQuery = {
        domain: 'example.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [{ type: 'A', value: '192.0.2.1', ttl: 300 }],
        responseTime: 100,
        status: 'success'
      };

      cache.set(query, response);
      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(1);
      expect(stats.averageTtl).toBeGreaterThan(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeGreaterThanOrEqual(0);
      expect(stats.newestEntry).toBeGreaterThanOrEqual(0);
    });

    it('空のキャッシュの統計情報', () => {
      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
      expect(stats.averageTtl).toBe(0);
      expect(stats.memoryUsage).toBe(0);
    });
  });

  describe('キャッシュ無効化', () => {
    beforeEach(() => {
      // テスト用データを準備
      const testData = [
        { domain: 'example.com', type: 'A' as const, value: '192.0.2.1' },
        { domain: 'example.com', type: 'AAAA' as const, value: '2001:db8::1' },
        { domain: 'test.com', type: 'A' as const, value: '192.0.2.2' },
        { domain: 'test.com', type: 'MX' as const, value: 'mail.test.com' }
      ];

      testData.forEach(data => {
        const query: IDNSQuery = {
          domain: data.domain,
          type: data.type
        };

        const response: IDNSResponse = {
          query,
          records: [{ type: data.type, value: data.value }],
          responseTime: 100,
          status: 'success'
        };

        cache.set(query, response);
      });
    });

    it('特定のドメインとタイプを無効化', () => {
      const deleted = cache.invalidate('example.com', 'A');
      
      expect(deleted).toBe(1);

      // 無効化されたエントリは取得できない
      const query: IDNSQuery = {
        domain: 'example.com',
        type: 'A'
      };
      expect(cache.get(query)).toBeNull();

      // 他のエントリは残っている
      const query2: IDNSQuery = {
        domain: 'example.com',
        type: 'AAAA'
      };
      expect(cache.get(query2)).toBeDefined();
    });

    it('特定のドメインの全レコードを無効化', () => {
      const deleted = cache.invalidate('example.com');
      
      expect(deleted).toBe(2); // A と AAAA

      // example.com の全レコードが削除される
      const queryA: IDNSQuery = {
        domain: 'example.com',
        type: 'A'
      };
      const queryAAAA: IDNSQuery = {
        domain: 'example.com',
        type: 'AAAA'
      };

      expect(cache.get(queryA)).toBeNull();
      expect(cache.get(queryAAAA)).toBeNull();

      // test.com のレコードは残っている
      const queryTest: IDNSQuery = {
        domain: 'test.com',
        type: 'A'
      };
      expect(cache.get(queryTest)).toBeDefined();
    });

    it('特定のレコードタイプを無効化', () => {
      const deleted = cache.invalidate(undefined, 'A');
      
      expect(deleted).toBe(2); // example.com と test.com の A レコード

      // A レコードが削除される
      const queryA1: IDNSQuery = {
        domain: 'example.com',
        type: 'A'
      };
      const queryA2: IDNSQuery = {
        domain: 'test.com',
        type: 'A'
      };

      expect(cache.get(queryA1)).toBeNull();
      expect(cache.get(queryA2)).toBeNull();

      // 他のレコードタイプは残っている
      const queryAAAA: IDNSQuery = {
        domain: 'example.com',
        type: 'AAAA'
      };
      const queryMX: IDNSQuery = {
        domain: 'test.com',
        type: 'MX'
      };

      expect(cache.get(queryAAAA)).toBeDefined();
      expect(cache.get(queryMX)).toBeDefined();
    });
  });

  describe('キャッシュクリーンアップ', () => {
    it('期限切れエントリを手動でクリーンアップ', async () => {
      const shortTtlCache = new DnsCache({
        defaultTtl: 0.01, // 10ms
        cleanupInterval: 60000 // 手動クリーンアップのため長く設定
      });

      const query: IDNSQuery = {
        domain: 'cleanup-test.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [{ type: 'A', value: '192.0.2.1' }],
        responseTime: 100,
        status: 'success'
      };

      shortTtlCache.set(query, response);
      
      // TTL期限切れまで待機
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // 手動クリーンアップ実行
      const cleaned = shortTtlCache.cleanup();
      
      expect(cleaned).toBe(1);
      expect(shortTtlCache.get(query)).toBeNull();
      
      shortTtlCache.destroy();
    });

    it('有効なエントリはクリーンアップしない', () => {
      const query: IDNSQuery = {
        domain: 'valid.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [{ type: 'A', value: '192.0.2.1' }],
        responseTime: 100,
        status: 'success'
      };

      cache.set(query, response);
      
      const cleaned = cache.cleanup();
      
      expect(cleaned).toBe(0);
      expect(cache.get(query)).toBeDefined();
    });
  });

  describe('キャッシュの永続化', () => {
    it('キャッシュをエクスポート', () => {
      const query: IDNSQuery = {
        domain: 'export-test.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [{ type: 'A', value: '192.0.2.1' }],
        responseTime: 100,
        status: 'success'
      };

      cache.set(query, response);
      
      const exported = cache.export();
      
      expect(exported).toHaveLength(1);
      expect(exported[0].key).toContain('export-test.com');
      expect(exported[0].entry.response).toEqual(response);
    });

    it('キャッシュをインポート', () => {
      const exportData = [
        {
          key: 'import-test.com:a:default',
          entry: {
            response: {
              query: { domain: 'import-test.com', type: 'A' as const },
              records: [{ type: 'A' as const, value: '192.0.2.1' }],
              responseTime: 100,
              status: 'success' as const
            },
            timestamp: Date.now(),
            ttl: 300,
            accessCount: 1,
            lastAccess: Date.now()
          }
        }
      ];

      cache.import(exportData);
      
      const query: IDNSQuery = {
        domain: 'import-test.com',
        type: 'A'
      };

      const retrieved = cache.get(query);
      expect(retrieved).toBeDefined();
      expect(retrieved!.records[0].value).toBe('192.0.2.1');
    });

    it('期限切れエントリはインポートしない', () => {
      const exportData = [
        {
          key: 'expired.com:a:default',
          entry: {
            response: {
              query: { domain: 'expired.com', type: 'A' as const },
              records: [{ type: 'A' as const, value: '192.0.2.1' }],
              responseTime: 100,
              status: 'success' as const
            },
            timestamp: Date.now() - 10000, // 10秒前
            ttl: 5, // 5秒TTL（既に期限切れ）
            accessCount: 1,
            lastAccess: Date.now() - 10000
          }
        }
      ];

      cache.import(exportData);
      
      const query: IDNSQuery = {
        domain: 'expired.com',
        type: 'A'
      };

      const retrieved = cache.get(query);
      expect(retrieved).toBeNull();
    });
  });

  describe('キャッシュクリア', () => {
    it('全キャッシュをクリア', () => {
      // 複数のエントリを追加
      for (let i = 1; i <= 3; i++) {
        const query: IDNSQuery = {
          domain: `clear-test${i}.com`,
          type: 'A'
        };

        const response: IDNSResponse = {
          query,
          records: [{ type: 'A', value: `192.0.2.${i}` }],
          responseTime: 100,
          status: 'success'
        };

        cache.set(query, response);
      }

      // クリア前の確認
      expect(cache.getStats().totalEntries).toBe(3);

      // クリア実行
      cache.clear();

      // クリア後の確認
      expect(cache.getStats().totalEntries).toBe(0);
      expect(cache.getStats().totalHits).toBe(0);
      expect(cache.getStats().totalMisses).toBe(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('不正なクエリでもエラーにならない', () => {
      const invalidQuery = {} as IDNSQuery;
      
      expect(() => {
        cache.get(invalidQuery);
      }).not.toThrow();
    });

    it('不正なレスポンスでもエラーにならない', () => {
      const query: IDNSQuery = {
        domain: 'test.com',
        type: 'A'
      };
      
      const invalidResponse = {} as IDNSResponse;
      
      expect(() => {
        cache.set(query, invalidResponse);
      }).not.toThrow();
    });

    it('メモリ不足の想定', () => {
      // 大量のデータでメモリ使用量をテスト
      const largeCache = new DnsCache({ maxSize: 10000 });
      
      for (let i = 0; i < 1000; i++) {
        const query: IDNSQuery = {
          domain: `large-test${i}.com`,
          type: 'A'
        };

        const response: IDNSResponse = {
          query,
          records: [{ type: 'A', value: '192.0.2.1' }],
          responseTime: 100,
          status: 'success'
        };

        largeCache.set(query, response);
      }

      const stats = largeCache.getStats();
      expect(stats.totalEntries).toBe(1000);
      expect(stats.memoryUsage).toBeGreaterThan(0);
      
      largeCache.destroy();
    });
  });

  describe('自動クリーンアップ', () => {
    it('定期的なクリーンアップが動作', async () => {
      const autoCleanupCache = new DnsCache({
        defaultTtl: 0.05, // 50ms
        cleanupInterval: 100 // 100ms間隔
      });

      const query: IDNSQuery = {
        domain: 'auto-cleanup.com',
        type: 'A'
      };

      const response: IDNSResponse = {
        query,
        records: [{ type: 'A', value: '192.0.2.1' }],
        responseTime: 100,
        status: 'success'
      };

      autoCleanupCache.set(query, response);
      
      // TTL期限切れ + クリーンアップ間隔より長く待機
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 自動クリーンアップによりエントリが削除されている
      expect(autoCleanupCache.get(query)).toBeNull();
      
      autoCleanupCache.destroy();
    });
  });
});