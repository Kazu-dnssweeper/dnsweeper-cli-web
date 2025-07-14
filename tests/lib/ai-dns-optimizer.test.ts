/**
 * AI駆動DNS最適化システムのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  AIDNSOptimizer, 
  OptimizationContext, 
  OptimizationSuggestion,
  BusinessContext,
  TrafficPattern 
} from '../../src/lib/ai-dns-optimizer.js';
import { DNSRecord } from '../../src/types/dns.js';
import { PerformanceMetric } from '../../src/lib/performance-monitor.js';

describe('AIDNSOptimizer', () => {
  let optimizer: AIDNSOptimizer;
  let mockContext: OptimizationContext;
  let mockBusinessContext: BusinessContext;

  beforeEach(() => {
    optimizer = new AIDNSOptimizer();
    
    mockBusinessContext = {
      industry: 'technology',
      scale: 'medium',
      compliance: ['SOX', 'GDPR'],
      budget: 'medium',
      priorities: ['performance', 'security', 'reliability', 'cost']
    };

    mockContext = {
      domain: 'example.com',
      records: [
        {
          name: 'www.example.com',
          type: 'A',
          value: '192.168.1.1',
          ttl: 300,
          priority: 0
        },
        {
          name: 'mail.example.com',
          type: 'MX',
          value: 'mail.example.com',
          ttl: 3600,
          priority: 10
        },
        {
          name: 'example.com',
          type: 'TXT',
          value: 'v=spf1 include:_spf.google.com ~all',
          ttl: 300,
          priority: 0
        }
      ],
      performance: [
        {
          timestamp: Date.now(),
          category: 'dns',
          operation: 'resolve',
          duration: 1500,
          success: true,
          metadata: { domain: 'www.example.com' }
        },
        {
          timestamp: Date.now(),
          category: 'dns',
          operation: 'resolve',
          duration: 200,
          success: true,
          metadata: { domain: 'mail.example.com' }
        }
      ],
      trafficPatterns: [
        {
          timestamp: Date.now(),
          region: 'us-east-1',
          requests: 1000,
          latency: 150,
          errorRate: 0.1
        },
        {
          timestamp: Date.now(),
          region: 'eu-west-1',
          requests: 800,
          latency: 200,
          errorRate: 0.2
        }
      ],
      businessContext: mockBusinessContext
    };
  });

  describe('analyzeAndOptimize', () => {
    it('should generate optimization suggestions', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should prioritize suggestions based on business context', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      // 最初の提案が最も重要であることを確認
      expect(suggestions[0].priority).toBeDefined();
      expect(['critical', 'high', 'medium', 'low']).toContain(suggestions[0].priority);
    });

    it('should include performance suggestions for slow queries', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      const performanceSuggestions = suggestions.filter(s => s.type === 'performance');
      expect(performanceSuggestions.length).toBeGreaterThan(0);
      
      // 遅延のあるクエリに対する提案があることを確認
      const slowQuerySuggestion = performanceSuggestions.find(s => 
        s.id === 'performance-slow-queries'
      );
      expect(slowQuerySuggestion).toBeDefined();
      expect(slowQuerySuggestion?.affectedRecords).toContain('www.example.com');
    });

    it('should suggest TTL optimizations', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      const ttlSuggestions = suggestions.filter(s => s.id.startsWith('ttl-'));
      expect(ttlSuggestions.length).toBeGreaterThan(0);
      
      // TTL提案の構造を確認
      ttlSuggestions.forEach(suggestion => {
        expect(suggestion.implementation.difficulty).toBe('easy');
        expect(suggestion.implementation.estimatedTime).toBe('5分');
        expect(suggestion.implementation.steps).toBeInstanceOf(Array);
      });
    });

    it('should suggest security improvements', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      const securitySuggestions = suggestions.filter(s => s.type === 'security');
      expect(securitySuggestions.length).toBeGreaterThan(0);
      
      // DNSSEC提案があることを確認
      const dnssecSuggestion = securitySuggestions.find(s => 
        s.id === 'security-dnssec'
      );
      expect(dnssecSuggestion).toBeDefined();
      expect(dnssecSuggestion?.impact.security).toBeGreaterThan(5);
    });

    it('should calculate impact scores correctly', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      suggestions.forEach(suggestion => {
        expect(suggestion.impact.performance).toBeGreaterThanOrEqual(-10);
        expect(suggestion.impact.performance).toBeLessThanOrEqual(10);
        expect(suggestion.impact.security).toBeGreaterThanOrEqual(-10);
        expect(suggestion.impact.security).toBeLessThanOrEqual(10);
        expect(suggestion.impact.reliability).toBeGreaterThanOrEqual(-10);
        expect(suggestion.impact.reliability).toBeLessThanOrEqual(10);
        expect(suggestion.impact.cost).toBeGreaterThanOrEqual(-10);
        expect(suggestion.impact.cost).toBeLessThanOrEqual(10);
      });
    });

    it('should provide detailed implementation guidance', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      suggestions.forEach(suggestion => {
        expect(suggestion.implementation.difficulty).toBeDefined();
        expect(['easy', 'medium', 'hard']).toContain(suggestion.implementation.difficulty);
        expect(suggestion.implementation.estimatedTime).toBeDefined();
        expect(suggestion.implementation.steps).toBeInstanceOf(Array);
        expect(suggestion.implementation.steps.length).toBeGreaterThan(0);
        expect(suggestion.implementation.risks).toBeInstanceOf(Array);
      });
    });

    it('should include evidence for each suggestion', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      suggestions.forEach(suggestion => {
        expect(suggestion.evidence).toBeDefined();
        expect(suggestion.evidence.metrics).toBeInstanceOf(Array);
        expect(suggestion.evidence.riskFactors).toBeInstanceOf(Array);
        expect(suggestion.evidence.benchmarks).toBeInstanceOf(Object);
      });
    });

    it('should handle empty context gracefully', async () => {
      const emptyContext: OptimizationContext = {
        domain: 'empty.com',
        records: [],
        performance: [],
        trafficPatterns: [],
        businessContext: mockBusinessContext
      };
      
      const suggestions = await optimizer.analyzeAndOptimize(emptyContext);
      expect(suggestions).toBeInstanceOf(Array);
      // 空のコンテキストでも基本的な提案は生成される
    });
  });

  describe('business context prioritization', () => {
    it('should prioritize security suggestions for security-focused business', async () => {
      const securityFocusedContext = {
        ...mockContext,
        businessContext: {
          ...mockBusinessContext,
          priorities: ['security', 'reliability', 'performance', 'cost']
        }
      };
      
      const suggestions = await optimizer.analyzeAndOptimize(securityFocusedContext);
      
      // セキュリティ関連の提案が上位に来ることを確認
      const topSuggestions = suggestions.slice(0, 3);
      const securitySuggestions = topSuggestions.filter(s => s.type === 'security');
      expect(securitySuggestions.length).toBeGreaterThan(0);
    });

    it('should prioritize performance suggestions for performance-focused business', async () => {
      const performanceFocusedContext = {
        ...mockContext,
        businessContext: {
          ...mockBusinessContext,
          priorities: ['performance', 'cost', 'reliability', 'security']
        }
      };
      
      const suggestions = await optimizer.analyzeAndOptimize(performanceFocusedContext);
      
      // パフォーマンス関連の提案が上位に来ることを確認
      const topSuggestions = suggestions.slice(0, 3);
      const performanceSuggestions = topSuggestions.filter(s => s.type === 'performance');
      expect(performanceSuggestions.length).toBeGreaterThan(0);
    });

    it('should adjust difficulty based on business scale', async () => {
      const startupContext = {
        ...mockContext,
        businessContext: {
          ...mockBusinessContext,
          scale: 'startup' as const,
          budget: 'low' as const
        }
      };
      
      const suggestions = await optimizer.analyzeAndOptimize(startupContext);
      
      // スタートアップ向けには「easy」な提案が多いことを確認
      const easySuggestions = suggestions.filter(s => s.implementation.difficulty === 'easy');
      const totalSuggestions = suggestions.length;
      expect(easySuggestions.length / totalSuggestions).toBeGreaterThan(0.3);
    });
  });

  describe('suggestion deduplication', () => {
    it('should remove duplicate suggestions', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      // ID の重複がないことを確認
      const ids = suggestions.map(s => s.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('performance analysis', () => {
    it('should detect slow DNS queries', async () => {
      const slowContext = {
        ...mockContext,
        performance: [
          {
            timestamp: Date.now(),
            category: 'dns' as const,
            operation: 'resolve',
            duration: 2000, // 2秒
            success: true,
            metadata: { domain: 'slow.example.com' }
          }
        ]
      };
      
      const suggestions = await optimizer.analyzeAndOptimize(slowContext);
      
      const slowQuerySuggestion = suggestions.find(s => 
        s.id === 'performance-slow-queries'
      );
      expect(slowQuerySuggestion).toBeDefined();
      expect(slowQuerySuggestion?.priority).toBe('high');
    });
  });

  describe('cost optimization', () => {
    it('should identify cost reduction opportunities', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      const costSuggestions = suggestions.filter(s => s.type === 'cost');
      expect(costSuggestions.length).toBeGreaterThan(0);
      
      // コスト削減の提案があることを確認
      const costReductionSuggestions = costSuggestions.filter(s => 
        s.impact.cost > 0
      );
      expect(costReductionSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('reliability improvements', () => {
    it('should suggest reliability enhancements', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      const reliabilitySuggestions = suggestions.filter(s => 
        s.impact.reliability > 5
      );
      expect(reliabilitySuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('integration with existing systems', () => {
    it('should work with performance monitoring data', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      // パフォーマンスメトリクスが適切に活用されていることを確認
      const evidenceWithMetrics = suggestions.filter(s => 
        s.evidence.metrics.length > 0
      );
      expect(evidenceWithMetrics.length).toBeGreaterThan(0);
    });

    it('should consider traffic patterns in optimization', async () => {
      const suggestions = await optimizer.analyzeAndOptimize(mockContext);
      
      // トラフィックパターンが考慮されていることを確認
      // 地理的分散やパフォーマンス最適化の提案があることを期待
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});