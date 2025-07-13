/**
 * cname-chain.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as dns } from 'node:dns';
import {
  traceCnameChain,
  validateCnameChain,
  getCnameChainStats,
  traceMultipleCnameChains,
  type CnameChainResult,
  type CnameChainOptions
} from '../../src/utils/cname-chain.js';

// DNS モジュールをモック
vi.mock('node:dns', () => ({
  promises: {
    resolveCname: vi.fn()
  }
}));

const mockResolveCname = vi.mocked(dns.resolveCname);

describe('cname-chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('traceCnameChain', () => {
    it('単純なCNAMEチェーンを追跡', async () => {
      // www.example.com -> example.com -> (終了)
      mockResolveCname
        .mockResolvedValueOnce(['example.com'])
        .mockRejectedValueOnce({ code: 'ENODATA' });

      const result = await traceCnameChain('www.example.com');

      expect(result.chain).toEqual(['www.example.com', 'example.com']);
      expect(result.finalTarget).toBe('example.com');
      expect(result.hasLoop).toBe(false);
      expect(result.maxDepthReached).toBe(false);
      expect(result.resolutionTime).toBeGreaterThan(0);
    });

    it('複数段のCNAMEチェーンを追跡', async () => {
      // alias.example.com -> www.example.com -> example.com -> (終了)
      mockResolveCname
        .mockResolvedValueOnce(['www.example.com'])
        .mockResolvedValueOnce(['example.com'])
        .mockRejectedValueOnce({ code: 'ENODATA' });

      const result = await traceCnameChain('alias.example.com');

      expect(result.chain).toEqual(['alias.example.com', 'www.example.com', 'example.com']);
      expect(result.finalTarget).toBe('example.com');
      expect(result.hasLoop).toBe(false);
      expect(result.maxDepthReached).toBe(false);
    });

    it('CNAMEループを検知', async () => {
      // a.example.com -> b.example.com -> a.example.com (ループ)
      mockResolveCname
        .mockResolvedValueOnce(['b.example.com'])
        .mockResolvedValueOnce(['a.example.com']);

      const result = await traceCnameChain('a.example.com');

      expect(result.chain).toEqual(['a.example.com', 'b.example.com']);
      expect(result.hasLoop).toBe(true);
      expect(result.finalTarget).toBeNull();
    });

    it('最大深度に到達', async () => {
      // 無限チェーンの模擬
      mockResolveCname.mockImplementation((domain) => {
        const num = parseInt(domain.split('.')[0].replace('level', '')) || 0;
        return Promise.resolve([`level${num + 1}.example.com`]);
      });

      const result = await traceCnameChain('level1.example.com', { maxDepth: 5 });

      expect(result.chain).toHaveLength(5);
      expect(result.maxDepthReached).toBe(true);
      expect(result.hasLoop).toBe(false);
      expect(result.finalTarget).toBe('level5.example.com');
    });

    it('タイムアウトを適切に処理', async () => {
      // 永続的に解決しないPromise
      mockResolveCname.mockImplementation(() => new Promise(() => {}));

      const result = await traceCnameChain('timeout.example.com', { timeout: 100 });

      expect(result.chain).toEqual(['timeout.example.com']);
      expect(result.hasLoop).toBe(false);
      expect(result.maxDepthReached).toBe(false);
    });

    it('DNS解決エラーを適切に処理', async () => {
      mockResolveCname.mockRejectedValueOnce({ code: 'ENOTFOUND' });

      const result = await traceCnameChain('notfound.example.com');

      expect(result.chain).toEqual(['notfound.example.com']);
      expect(result.finalTarget).toBe('notfound.example.com');
      expect(result.hasLoop).toBe(false);
    });

    it('空のCNAME応答を処理', async () => {
      mockResolveCname.mockResolvedValueOnce([]);

      const result = await traceCnameChain('empty.example.com');

      expect(result.chain).toEqual(['empty.example.com']);
      expect(result.finalTarget).toBe('empty.example.com');
      expect(result.hasLoop).toBe(false);
    });

    it('followToEndオプションの動作', async () => {
      mockResolveCname.mockResolvedValueOnce(['target.example.com']);

      const result = await traceCnameChain('source.example.com', { followToEnd: false });

      expect(result.chain).toEqual(['source.example.com']);
      expect(result.finalTarget).toBe('target.example.com');
    });

    it('複数のCNAME結果の最初を使用', async () => {
      mockResolveCname
        .mockResolvedValueOnce(['first.example.com', 'second.example.com'])
        .mockRejectedValueOnce({ code: 'ENODATA' });

      const result = await traceCnameChain('multi.example.com');

      expect(result.chain).toEqual(['multi.example.com', 'first.example.com']);
      expect(result.finalTarget).toBe('first.example.com');
    });

    it('大文字小文字を正規化', async () => {
      mockResolveCname
        .mockResolvedValueOnce(['TARGET.EXAMPLE.COM'])
        .mockRejectedValueOnce({ code: 'ENODATA' });

      const result = await traceCnameChain('SOURCE.EXAMPLE.COM');

      expect(result.chain).toEqual(['source.example.com', 'target.example.com']);
      expect(result.finalTarget).toBe('target.example.com');
    });
  });

  describe('validateCnameChain', () => {
    it('正常なチェーンを検証', () => {
      const validChain: CnameChainResult = {
        chain: ['www.example.com', 'example.com'],
        finalTarget: 'example.com',
        hasLoop: false,
        maxDepthReached: false,
        resolutionTime: 100
      };

      const validation = validateCnameChain(validChain);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.recommendations).toHaveLength(0);
    });

    it('ループを含むチェーンを検証', () => {
      const loopChain: CnameChainResult = {
        chain: ['a.example.com', 'b.example.com'],
        finalTarget: null,
        hasLoop: true,
        maxDepthReached: false,
        resolutionTime: 100
      };

      const validation = validateCnameChain(loopChain);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('CNAMEチェーンにループが検出されました');
      expect(validation.recommendations).toContain('DNSレコードの設定を確認し、循環参照を修正してください');
    });

    it('最大深度に到達したチェーンを検証', () => {
      const maxDepthChain: CnameChainResult = {
        chain: Array.from({ length: 10 }, (_, i) => `level${i}.example.com`),
        finalTarget: 'level9.example.com',
        hasLoop: false,
        maxDepthReached: true,
        resolutionTime: 100
      };

      const validation = validateCnameChain(maxDepthChain);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('CNAMEチェーンが最大深度に達しました');
      expect(validation.recommendations).toContain('不必要に長いCNAMEチェーンを短縮することを検討してください');
    });

    it('長いチェーンに警告', () => {
      const longChain: CnameChainResult = {
        chain: Array.from({ length: 7 }, (_, i) => `level${i}.example.com`),
        finalTarget: 'level6.example.com',
        hasLoop: false,
        maxDepthReached: false,
        resolutionTime: 100
      };

      const validation = validateCnameChain(longChain);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('CNAMEチェーンが長すぎます（7段階）');
      expect(validation.recommendations).toContain('パフォーマンスのため、CNAMEチェーンを5段階以下に短縮することをお勧めします');
    });

    it('解決時間が長い場合に警告', () => {
      const slowChain: CnameChainResult = {
        chain: ['www.example.com', 'example.com'],
        finalTarget: 'example.com',
        hasLoop: false,
        maxDepthReached: false,
        resolutionTime: 3000 // 3秒
      };

      const validation = validateCnameChain(slowChain);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('CNAME解決に時間がかかりすぎています（3000ms）');
      expect(validation.recommendations).toContain('DNSサーバーの応答性能を確認してください');
    });

    it('最終ターゲットが解決できない場合', () => {
      const unresolved: CnameChainResult = {
        chain: ['www.example.com'],
        finalTarget: null,
        hasLoop: false,
        maxDepthReached: false,
        resolutionTime: 100
      };

      const validation = validateCnameChain(unresolved);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('CNAMEチェーンの最終ターゲットが解決できませんでした');
      expect(validation.recommendations).toContain('DNSレコードの設定を確認してください');
    });

    it('複数の問題を同時に検出', () => {
      const problematicChain: CnameChainResult = {
        chain: Array.from({ length: 8 }, (_, i) => `level${i}.example.com`),
        finalTarget: null,
        hasLoop: true,
        maxDepthReached: true,
        resolutionTime: 2500
      };

      const validation = validateCnameChain(problematicChain);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(1);
      expect(validation.recommendations.length).toBeGreaterThan(1);
    });
  });

  describe('getCnameChainStats', () => {
    it('空の結果リストの統計', () => {
      const stats = getCnameChainStats([]);

      expect(stats.totalChains).toBe(0);
      expect(stats.averageDepth).toBe(0);
      expect(stats.maxDepth).toBe(0);
      expect(stats.loopCount).toBe(0);
      expect(stats.averageResolutionTime).toBe(0);
      expect(stats.healthScore).toBe(100);
    });

    it('複数チェーンの統計を計算', () => {
      const results: CnameChainResult[] = [
        {
          chain: ['a.example.com', 'b.example.com'],
          finalTarget: 'b.example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 100
        },
        {
          chain: ['c.example.com', 'd.example.com', 'e.example.com'],
          finalTarget: 'e.example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 200
        },
        {
          chain: ['f.example.com', 'g.example.com'],
          finalTarget: null,
          hasLoop: true,
          maxDepthReached: false,
          resolutionTime: 150
        }
      ];

      const stats = getCnameChainStats(results);

      expect(stats.totalChains).toBe(3);
      expect(stats.averageDepth).toBe((2 + 3 + 2) / 3);
      expect(stats.maxDepth).toBe(3);
      expect(stats.loopCount).toBe(1);
      expect(stats.averageResolutionTime).toBe((100 + 200 + 150) / 3);
      expect(stats.healthScore).toBeLessThan(100); // ループがあるため
    });

    it('ヘルススコアの計算', () => {
      // 全て正常なチェーン
      const healthyResults: CnameChainResult[] = [
        {
          chain: ['a.example.com', 'b.example.com'],
          finalTarget: 'b.example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 100
        },
        {
          chain: ['c.example.com', 'd.example.com'],
          finalTarget: 'd.example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 150
        }
      ];

      const healthyStats = getCnameChainStats(healthyResults);
      expect(healthyStats.healthScore).toBe(100);

      // 問題のあるチェーンを含む
      const problematicResults: CnameChainResult[] = [
        ...healthyResults,
        {
          chain: ['e.example.com', 'f.example.com'],
          finalTarget: null,
          hasLoop: true,
          maxDepthReached: false,
          resolutionTime: 100
        }
      ];

      const problematicStats = getCnameChainStats(problematicResults);
      expect(problematicStats.healthScore).toBeLessThan(100);
    });

    it('長いチェーンがヘルススコアに影響', () => {
      const longChainResults: CnameChainResult[] = [
        {
          chain: Array.from({ length: 8 }, (_, i) => `level${i}.example.com`),
          finalTarget: 'level7.example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 100
        }
      ];

      const stats = getCnameChainStats(longChainResults);
      expect(stats.healthScore).toBeLessThan(100);
    });

    it('最大深度到達がヘルススコアに影響', () => {
      const maxDepthResults: CnameChainResult[] = [
        {
          chain: Array.from({ length: 10 }, (_, i) => `level${i}.example.com`),
          finalTarget: 'level9.example.com',
          hasLoop: false,
          maxDepthReached: true,
          resolutionTime: 100
        }
      ];

      const stats = getCnameChainStats(maxDepthResults);
      expect(stats.healthScore).toBeLessThan(100);
    });
  });

  describe('traceMultipleCnameChains', () => {
    it('複数ドメインを並列で追跡', async () => {
      const domains = ['www.example.com', 'api.example.com'];

      mockResolveCname
        .mockResolvedValueOnce(['example.com'])      // www.example.com
        .mockRejectedValueOnce({ code: 'ENODATA' })  // example.com (終了)
        .mockResolvedValueOnce(['internal.example.com']) // api.example.com
        .mockRejectedValueOnce({ code: 'ENODATA' }); // internal.example.com (終了)

      const results = await traceMultipleCnameChains(domains, { concurrency: 2 });

      expect(results.size).toBe(2);
      expect(results.has('www.example.com')).toBe(true);
      expect(results.has('api.example.com')).toBe(true);

      const wwwResult = results.get('www.example.com')!;
      expect(wwwResult.chain).toEqual(['www.example.com', 'example.com']);
      expect(wwwResult.finalTarget).toBe('example.com');

      const apiResult = results.get('api.example.com')!;
      expect(apiResult.chain).toEqual(['api.example.com', 'internal.example.com']);
      expect(apiResult.finalTarget).toBe('internal.example.com');
    });

    it('エラーが発生したドメインも結果に含める', async () => {
      const domains = ['error.example.com'];

      mockResolveCname.mockRejectedValueOnce(new Error('Network error'));

      const results = await traceMultipleCnameChains(domains);

      expect(results.size).toBe(1);
      expect(results.has('error.example.com')).toBe(true);

      const errorResult = results.get('error.example.com')!;
      expect(errorResult.chain).toEqual(['error.example.com']);
      expect(errorResult.finalTarget).toBeNull();
    });

    it('並列数制限が動作', async () => {
      const domains = ['a.example.com', 'b.example.com', 'c.example.com'];
      let concurrentCalls = 0;
      let maxConcurrent = 0;

      mockResolveCname.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        concurrentCalls--;
        throw { code: 'ENODATA' };
      });

      await traceMultipleCnameChains(domains, { concurrency: 2 });

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it('空のドメインリストを処理', async () => {
      const results = await traceMultipleCnameChains([]);

      expect(results.size).toBe(0);
    });

    it('オプションがチェーン追跡に正しく渡される', async () => {
      const domains = ['test.example.com'];

      mockResolveCname.mockRejectedValueOnce({ code: 'ENODATA' });

      const results = await traceMultipleCnameChains(domains, {
        maxDepth: 5,
        timeout: 1000,
        followToEnd: false
      });

      expect(results.size).toBe(1);
      // オプションが正しく渡されることの間接的な確認
      // （実際の動作は traceCnameChain の単体テストで確認済み）
    });
  });

  describe('エラーハンドリング', () => {
    it('DNS解決の各種エラーコードを処理', async () => {
      const errorCodes = ['ENOTFOUND', 'ENODATA', 'ESERVFAIL', 'ETIMEOUT'];

      for (const code of errorCodes) {
        mockResolveCname.mockRejectedValueOnce({ code });

        const result = await traceCnameChain(`${code.toLowerCase()}.example.com`);

        expect(result.chain).toEqual([`${code.toLowerCase()}.example.com`]);
        expect(result.finalTarget).toBe(`${code.toLowerCase()}.example.com`);
        expect(result.hasLoop).toBe(false);
      }
    });

    it('予期しないエラーを適切に処理', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockResolveCname.mockRejectedValueOnce(unexpectedError);

      const result = await traceCnameChain('unexpected.example.com');

      expect(result.chain).toEqual(['unexpected.example.com']);
      // エラーが発生してもクラッシュしないことを確認
    });

    it('無効な入力でもエラーにならない', async () => {
      await expect(traceCnameChain('')).resolves.toBeDefined();
      await expect(traceCnameChain('   ')).resolves.toBeDefined();
    });
  });

  describe('パフォーマンス', () => {
    it('大量のドメインを効率的に処理', async () => {
      const domains = Array.from({ length: 100 }, (_, i) => `domain${i}.example.com`);

      mockResolveCname.mockImplementation(async () => {
        throw { code: 'ENODATA' };
      });

      const start = Date.now();
      const results = await traceMultipleCnameChains(domains, { concurrency: 10 });
      const duration = Date.now() - start;

      expect(results.size).toBe(100);
      expect(duration).toBeLessThan(5000); // 5秒以内
    });

    it('タイムアウト設定が適切に機能', async () => {
      mockResolveCname.mockImplementation(() => new Promise(() => {})); // 永続的に待機

      const start = Date.now();
      const result = await traceCnameChain('timeout-test.example.com', { timeout: 100 });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(200); // タイムアウト + バッファ
      expect(result.chain).toEqual(['timeout-test.example.com']);
    });
  });
});