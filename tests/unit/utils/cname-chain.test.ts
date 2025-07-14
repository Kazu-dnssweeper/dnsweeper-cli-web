/**
 * cname-chain.ts のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promises as dns } from 'node:dns';

import {
  traceCnameChain,
  validateCnameChain,
  getCnameChainStats,
  traceMultipleCnameChains,
  type CnameChainResult,
  type CnameChainOptions
} from '../../../src/utils/cname-chain.js';

// node:dns をモック化
vi.mock('node:dns', () => ({
  promises: {
    resolveCname: vi.fn()
  }
}));

describe('cname-chain utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('traceCnameChain', () => {
    it('should trace a simple CNAME chain', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname
        .mockImplementation(async (domain) => {
          await new Promise(resolve => setTimeout(resolve, 1)); // Small delay to ensure time > 0
          if (domain === 'www.example.com') {
            return ['example.com'];
          }
          throw { code: 'ENODATA' };
        });

      const result = await traceCnameChain('www.example.com');

      expect(result.chain).toEqual(['www.example.com', 'example.com']);
      expect(result.finalTarget).toBe('example.com');
      expect(result.hasLoop).toBe(false);
      expect(result.maxDepthReached).toBe(false);
      expect(result.resolutionTime).toBeGreaterThan(0);
    });

    it('should detect CNAME loops', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname
        .mockResolvedValueOnce(['b.example.com'])
        .mockResolvedValueOnce(['a.example.com']);

      const result = await traceCnameChain('a.example.com');

      expect(result.chain).toEqual(['a.example.com', 'b.example.com']);
      expect(result.hasLoop).toBe(true);
      expect(result.finalTarget).toBe(null);
    });

    it('should handle max depth reached', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      // 常に次のドメインを返すモック
      mockResolveCname.mockImplementation(async (domain) => {
        const currentNum = parseInt(domain.split('.')[0].replace('domain', ''), 10);
        return [`domain${currentNum + 1}.example.com`];
      });

      const result = await traceCnameChain('domain1.example.com', { maxDepth: 3 });

      expect(result.chain).toHaveLength(3);
      expect(result.maxDepthReached).toBe(true);
      expect(result.finalTarget).toBe('domain4.example.com');
    });

    it('should handle resolution timeout', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const result = await traceCnameChain('slow.example.com', { timeout: 100 });
      
      // タイムアウトエラーはcatch内で処理されるので、結果は返される
      expect(result.chain).toEqual(['slow.example.com']);
      expect(result.finalTarget).toBe(null);
    });

    it('should handle DNS resolution errors', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname
        .mockResolvedValueOnce(['target.example.com'])
        .mockRejectedValueOnce({ code: 'ENOTFOUND' });

      const result = await traceCnameChain('www.example.com');

      expect(result.chain).toEqual(['www.example.com', 'target.example.com']);
      expect(result.finalTarget).toBe('target.example.com');
    });

    it('should handle no CNAME records', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname.mockRejectedValueOnce({ code: 'ENODATA' });

      const result = await traceCnameChain('example.com');

      expect(result.chain).toEqual(['example.com']);
      expect(result.finalTarget).toBe('example.com');
      expect(result.hasLoop).toBe(false);
    });

    it('should handle followToEnd option', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname.mockResolvedValueOnce(['target.example.com']);

      const result = await traceCnameChain('www.example.com', { followToEnd: false });

      expect(result.chain).toEqual(['www.example.com']);
      expect(result.finalTarget).toBe('target.example.com');
      expect(mockResolveCname).toHaveBeenCalledTimes(1);
    });

    it('should handle empty CNAME response', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname.mockResolvedValueOnce([]);

      const result = await traceCnameChain('www.example.com');

      expect(result.chain).toEqual(['www.example.com']);
      expect(result.finalTarget).toBe('www.example.com');
    });

    it('should handle multiple CNAME records', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname
        .mockResolvedValueOnce(['target1.example.com', 'target2.example.com'])
        .mockRejectedValueOnce({ code: 'ENODATA' });

      const result = await traceCnameChain('www.example.com');

      expect(result.chain).toEqual(['www.example.com', 'target1.example.com']);
      expect(result.finalTarget).toBe('target1.example.com');
    });

    it('should handle case insensitive domains', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname
        .mockResolvedValueOnce(['TARGET.EXAMPLE.COM'])
        .mockRejectedValueOnce({ code: 'ENODATA' });

      const result = await traceCnameChain('WWW.EXAMPLE.COM');

      expect(result.chain).toEqual(['www.example.com', 'target.example.com']);
      expect(result.finalTarget).toBe('target.example.com');
    });
  });

  describe('validateCnameChain', () => {
    it('should validate a healthy CNAME chain', () => {
      const result: CnameChainResult = {
        chain: ['www.example.com', 'example.com'],
        finalTarget: 'example.com',
        hasLoop: false,
        maxDepthReached: false,
        resolutionTime: 100
      };

      const validation = validateCnameChain(result);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.recommendations).toHaveLength(0);
    });

    it('should detect loop issues', () => {
      const result: CnameChainResult = {
        chain: ['a.example.com', 'b.example.com'],
        finalTarget: null,
        hasLoop: true,
        maxDepthReached: false,
        resolutionTime: 100
      };

      const validation = validateCnameChain(result);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('CNAMEチェーンにループが検出されました');
      expect(validation.recommendations).toContain('DNSレコードの設定を確認し、循環参照を修正してください');
    });

    it('should detect max depth reached', () => {
      const result: CnameChainResult = {
        chain: Array(10).fill(null).map((_, i) => `domain${i}.example.com`),
        finalTarget: 'domain10.example.com',
        hasLoop: false,
        maxDepthReached: true,
        resolutionTime: 100
      };

      const validation = validateCnameChain(result);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('CNAMEチェーンが最大深度に達しました');
      expect(validation.recommendations).toContain('不必要に長いCNAMEチェーンを短縮することを検討してください');
    });

    it('should detect long chains', () => {
      const result: CnameChainResult = {
        chain: Array(7).fill(null).map((_, i) => `domain${i}.example.com`),
        finalTarget: 'domain7.example.com',
        hasLoop: false,
        maxDepthReached: false,
        resolutionTime: 100
      };

      const validation = validateCnameChain(result);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('CNAMEチェーンが長すぎます（7段階）');
      expect(validation.recommendations).toContain('パフォーマンスのため、CNAMEチェーンを5段階以下に短縮することをお勧めします');
    });

    it('should detect slow resolution', () => {
      const result: CnameChainResult = {
        chain: ['www.example.com', 'example.com'],
        finalTarget: 'example.com',
        hasLoop: false,
        maxDepthReached: false,
        resolutionTime: 3000
      };

      const validation = validateCnameChain(result);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('CNAME解決に時間がかかりすぎています（3000ms）');
      expect(validation.recommendations).toContain('DNSサーバーの応答性能を確認してください');
    });

    it('should detect missing final target', () => {
      const result: CnameChainResult = {
        chain: ['www.example.com'],
        finalTarget: null,
        hasLoop: false,
        maxDepthReached: false,
        resolutionTime: 100
      };

      const validation = validateCnameChain(result);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('CNAMEチェーンの最終ターゲットが解決できませんでした');
      expect(validation.recommendations).toContain('DNSレコードの設定を確認してください');
    });
  });

  describe('getCnameChainStats', () => {
    it('should calculate stats for empty results', () => {
      const stats = getCnameChainStats([]);

      expect(stats.totalChains).toBe(0);
      expect(stats.averageDepth).toBe(0);
      expect(stats.maxDepth).toBe(0);
      expect(stats.loopCount).toBe(0);
      expect(stats.averageResolutionTime).toBe(0);
      expect(stats.healthScore).toBe(100);
    });

    it('should calculate stats for healthy chains', () => {
      const results: CnameChainResult[] = [
        {
          chain: ['www.example.com', 'example.com'],
          finalTarget: 'example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 100
        },
        {
          chain: ['blog.example.com', 'www.example.com', 'example.com'],
          finalTarget: 'example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 150
        }
      ];

      const stats = getCnameChainStats(results);

      expect(stats.totalChains).toBe(2);
      expect(stats.averageDepth).toBe(2.5);
      expect(stats.maxDepth).toBe(3);
      expect(stats.loopCount).toBe(0);
      expect(stats.averageResolutionTime).toBe(125);
      expect(stats.healthScore).toBe(100);
    });

    it('should penalize loops in health score', () => {
      const results: CnameChainResult[] = [
        {
          chain: ['a.example.com', 'b.example.com'],
          finalTarget: null,
          hasLoop: true,
          maxDepthReached: false,
          resolutionTime: 100
        },
        {
          chain: ['www.example.com', 'example.com'],
          finalTarget: 'example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 100
        }
      ];

      const stats = getCnameChainStats(results);

      expect(stats.loopCount).toBe(1);
      expect(stats.healthScore).toBe(75); // 100 - (1/2 * 50)
    });

    it('should penalize long chains in health score', () => {
      const results: CnameChainResult[] = [
        {
          chain: Array(7).fill(null).map((_, i) => `domain${i}.example.com`),
          finalTarget: 'domain7.example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 100
        },
        {
          chain: ['www.example.com', 'example.com'],
          finalTarget: 'example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 100
        }
      ];

      const stats = getCnameChainStats(results);

      expect(stats.healthScore).toBe(90); // 100 - (1/2 * 20)
    });

    it('should penalize max depth reached in health score', () => {
      const results: CnameChainResult[] = [
        {
          chain: Array(10).fill(null).map((_, i) => `domain${i}.example.com`),
          finalTarget: 'domain10.example.com',
          hasLoop: false,
          maxDepthReached: true,
          resolutionTime: 100
        },
        {
          chain: ['www.example.com', 'example.com'],
          finalTarget: 'example.com',
          hasLoop: false,
          maxDepthReached: false,
          resolutionTime: 100
        }
      ];

      const stats = getCnameChainStats(results);

      expect(stats.healthScore).toBe(75); // 100 - (1/2 * 20) - (1/2 * 30)
    });

    it('should not go below 0 health score', () => {
      const results: CnameChainResult[] = [
        {
          chain: Array(10).fill(null).map((_, i) => `domain${i}.example.com`),
          finalTarget: null,
          hasLoop: true,
          maxDepthReached: true,
          resolutionTime: 100
        }
      ];

      const stats = getCnameChainStats(results);

      expect(stats.healthScore).toBe(0); // Math.max(0, 100 - 50 - 20 - 30)
    });
  });

  describe('traceMultipleCnameChains', () => {
    it('should trace multiple domains concurrently', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      // Set up separate mock implementations for each domain
      mockResolveCname.mockImplementation(async (domain) => {
        if (domain === 'www.example1.com') {
          return ['example1.com'];
        } else if (domain === 'example1.com') {
          throw { code: 'ENODATA' };
        } else if (domain === 'www.example2.com') {
          return ['example2.com'];
        } else if (domain === 'example2.com') {
          throw { code: 'ENODATA' };
        }
        throw { code: 'ENOTFOUND' };
      });

      const domains = ['www.example1.com', 'www.example2.com'];
      const results = await traceMultipleCnameChains(domains);

      expect(results.size).toBe(2);
      expect(results.get('www.example1.com')?.finalTarget).toBe('example1.com');
      expect(results.get('www.example2.com')?.finalTarget).toBe('example2.com');
    });

    it('should handle errors gracefully', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname.mockImplementation(async (domain) => {
        if (domain === 'www.example.com') {
          return ['example.com'];
        } else if (domain === 'example.com') {
          throw { code: 'ENODATA' };
        } else if (domain === 'invalid.domain') {
          throw { code: 'ENOTFOUND' };
        }
        throw { code: 'ENOTFOUND' };
      });

      const domains = ['www.example.com', 'invalid.domain'];
      const results = await traceMultipleCnameChains(domains);

      expect(results.size).toBe(2);
      expect(results.get('www.example.com')?.finalTarget).toBe('example.com');
      expect(results.get('invalid.domain')?.finalTarget).toBe('invalid.domain');
      expect(results.get('invalid.domain')?.chain).toEqual(['invalid.domain']);
    });

    it('should respect concurrency limit', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      let concurrentCalls = 0;
      let maxConcurrentCalls = 0;

      mockResolveCname.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        concurrentCalls--;
        throw { code: 'ENODATA' };
      });

      const domains = Array(10).fill(null).map((_, i) => `domain${i}.example.com`);
      await traceMultipleCnameChains(domains, { concurrency: 3 });

      expect(maxConcurrentCalls).toBeLessThanOrEqual(3);
    });

    it('should handle empty domain list', async () => {
      const results = await traceMultipleCnameChains([]);

      expect(results.size).toBe(0);
    });

    it('should pass chain options to traceCnameChain', async () => {
      const mockResolveCname = vi.mocked(dns.resolveCname);
      
      mockResolveCname.mockRejectedValue({ code: 'ENODATA' });

      const domains = ['www.example.com'];
      const results = await traceMultipleCnameChains(domains, { 
        maxDepth: 5, 
        timeout: 1000, 
        followToEnd: false 
      });

      expect(results.size).toBe(1);
      expect(results.get('www.example.com')?.finalTarget).toBe('www.example.com');
    });
  });
});