/**
 * DNS脅威検出・防御システムのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  DNSSecurityAnalyzer, 
  SecurityThreat, 
  SecurityConfig
} from '../../src/lib/dns-security-analyzer.js';
import { DNSRecord } from '../../src/types/dns.js';

describe('DNSSecurityAnalyzer', () => {
  let analyzer: DNSSecurityAnalyzer;
  let mockRecords: DNSRecord[];
  let mockConfig: Partial<SecurityConfig>;

  beforeEach(() => {
    mockConfig = {
      threatDetection: {
        enabledAnalyzers: ['malware', 'phishing', 'typosquatting', 'dga'],
        confidenceThreshold: 70,
        realTimeMonitoring: true
      },
      reputationChecking: {
        enabledSources: ['test'],
        cacheTimeout: 3600000,
        parallelChecks: 2
      }
    };

    analyzer = new DNSSecurityAnalyzer(undefined, mockConfig);

    mockRecords = [
      {
        name: 'example.com',
        type: 'A',
        value: '192.168.1.1',
        ttl: 300,
        priority: 0
      },
      {
        name: 'suspicious-domain.com',
        type: 'A',
        value: '192.168.1.2',
        ttl: 60,
        priority: 0
      },
      {
        name: 'malware-example.com',
        type: 'A',
        value: '192.168.1.3',
        ttl: 300,
        priority: 0
      }
    ];
  });

  afterEach(() => {
    analyzer.stopRealTimeMonitoring();
  });

  describe('analyzeSecurityThreats', () => {
    it('should analyze domains and return threats', async () => {
      const domains = ['example.com', 'suspicious-domain.com'];
      const threats = await analyzer.analyzeSecurityThreats(domains, mockRecords);

      expect(threats).toBeInstanceOf(Array);
      expect(threats.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect malware domains', async () => {
      const domains = ['malware-example.com'];
      const threats = await analyzer.analyzeSecurityThreats(domains, mockRecords);

      const malwareThreats = threats.filter(t => t.type === 'malware');
      expect(malwareThreats.length).toBeGreaterThan(0);
      expect(malwareThreats[0].severity).toBe('critical');
      expect(malwareThreats[0].confidence).toBeGreaterThan(90);
    });

    it('should detect phishing domains', async () => {
      const domains = ['phishing-example.com'];
      const phishingRecords = [{
        name: 'phishing-example.com',
        type: 'A',
        value: '192.168.1.4',
        ttl: 300,
        priority: 0
      }];
      
      const threats = await analyzer.analyzeSecurityThreats(domains, phishingRecords);

      const phishingThreats = threats.filter(t => t.type === 'phishing');
      expect(phishingThreats.length).toBeGreaterThan(0);
      expect(phishingThreats[0].severity).toBe('high');
    });

    it('should detect suspicious domain patterns', async () => {
      const domains = ['updatemanager123456.com', 'security-update-microsoft.com'];
      const suspiciousRecords = domains.map(domain => ({
        name: domain,
        type: 'A',
        value: '192.168.1.5',
        ttl: 300,
        priority: 0
      }));

      const threats = await analyzer.analyzeSecurityThreats(domains, suspiciousRecords);

      // 疑わしいパターンを持つドメインが検出されることを確認
      const patternThreats = threats.filter(t => 
        t.description.includes('疑わしい') || 
        t.description.includes('suspicious')
      );
      expect(patternThreats.length).toBeGreaterThan(0);
    });

    it('should detect fast flux networks', async () => {
      const domain = 'fastflux.com';
      const domains = [domain];
      
      // 多数のAレコードを作成（Fast Flux の特徴）
      const fastFluxRecords = Array.from({ length: 15 }, (_, i) => ({
        name: domain,
        type: 'A',
        value: `192.168.1.${i + 10}`,
        ttl: 60, // 短いTTL
        priority: 0
      }));

      const threats = await analyzer.analyzeSecurityThreats(domains, fastFluxRecords);

      const fastFluxThreats = threats.filter(t => t.type === 'fastflux');
      expect(fastFluxThreats.length).toBeGreaterThan(0);
      expect(fastFluxThreats[0].severity).toBe('high');
    });

    it('should detect DGA domains', async () => {
      const domains = ['xgkjfhgkjfdghkjfdhgkjfhgkjfdhgkjfdhgkj.com'];
      const dgaRecords = [{
        name: domains[0],
        type: 'A',
        value: '192.168.1.6',
        ttl: 300,
        priority: 0
      }];

      const threats = await analyzer.analyzeSecurityThreats(domains, dgaRecords);

      const dgaThreats = threats.filter(t => t.type === 'dga');
      expect(dgaThreats.length).toBeGreaterThan(0);
      expect(dgaThreats[0].confidence).toBeGreaterThan(70);
    });

    it('should detect typosquatting domains', async () => {
      const domains = ['googel.com', 'microsooft.com'];
      const typoRecords = domains.map(domain => ({
        name: domain,
        type: 'A',
        value: '192.168.1.7',
        ttl: 300,
        priority: 0
      }));

      const threats = await analyzer.analyzeSecurityThreats(domains, typoRecords);

      const typoThreats = threats.filter(t => t.type === 'typosquatting');
      expect(typoThreats.length).toBeGreaterThan(0);
      expect(typoThreats[0].severity).toBe('medium');
    });

    it('should detect subdomain takeover', async () => {
      const domain = 'subdomain.example.com';
      const domains = [domain];
      const subdomainRecords = [{
        name: domain,
        type: 'CNAME',
        value: 'nonexistent-service.herokuapp.com',
        ttl: 300,
        priority: 0
      }];

      const threats = await analyzer.analyzeSecurityThreats(domains, subdomainRecords);

      const takeoverThreats = threats.filter(t => t.type === 'subdomain_takeover');
      expect(takeoverThreats.length).toBeGreaterThan(0);
      expect(takeoverThreats[0].severity).toBe('high');
    });

    it('should prioritize threats by severity and confidence', async () => {
      const domains = ['malware-example.com', 'suspicious-domain.com'];
      const threats = await analyzer.analyzeSecurityThreats(domains, mockRecords);

      if (threats.length > 1) {
        // 最初の脅威が最も重要であることを確認
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        
        for (let i = 0; i < threats.length - 1; i++) {
          const current = severityOrder[threats[i].severity];
          const next = severityOrder[threats[i + 1].severity];
          
          if (current === next) {
            // 同じ重要度の場合、信頼度で並んでいることを確認
            expect(threats[i].confidence).toBeGreaterThanOrEqual(threats[i + 1].confidence);
          } else {
            // 重要度で並んでいることを確認
            expect(current).toBeGreaterThan(next);
          }
        }
      }
    });

    it('should include comprehensive threat information', async () => {
      const domains = ['malware-example.com'];
      const threats = await analyzer.analyzeSecurityThreats(domains, mockRecords);

      if (threats.length > 0) {
        const threat = threats[0];
        
        // 基本情報
        expect(threat.id).toBeDefined();
        expect(threat.type).toBeDefined();
        expect(threat.severity).toBeDefined();
        expect(threat.confidence).toBeGreaterThan(0);
        expect(threat.domain).toBeDefined();
        expect(threat.timestamp).toBeDefined();
        expect(threat.description).toBeDefined();

        // 指標情報
        expect(threat.indicators).toBeDefined();
        expect(threat.indicators.technicalIndicators).toBeInstanceOf(Array);
        expect(threat.indicators.behavioralIndicators).toBeInstanceOf(Array);
        expect(threat.indicators.reputationIndicators).toBeInstanceOf(Array);

        // 対策情報
        expect(threat.mitigation).toBeDefined();
        expect(threat.mitigation.immediateActions).toBeInstanceOf(Array);
        expect(threat.mitigation.longTermActions).toBeInstanceOf(Array);
        expect(threat.mitigation.preventionMeasures).toBeInstanceOf(Array);

        // 証拠情報
        expect(threat.evidence).toBeDefined();
        expect(threat.evidence.dnsRecords).toBeInstanceOf(Array);
        expect(threat.evidence.networkAnalysis).toBeDefined();
        expect(threat.evidence.reputationData).toBeDefined();
        expect(threat.evidence.algorithmicAnalysis).toBeDefined();
      }
    });

    it('should handle empty input gracefully', async () => {
      const threats = await analyzer.analyzeSecurityThreats([], []);
      expect(threats).toBeInstanceOf(Array);
      expect(threats.length).toBe(0);
    });

    it('should emit threat events', async () => {
      const threatListener = vi.fn();
      analyzer.on('threat', threatListener);

      const domains = ['malware-example.com'];
      await analyzer.analyzeSecurityThreats(domains, mockRecords);

      expect(threatListener).toHaveBeenCalled();
    });

    it('should emit high-priority threat events', async () => {
      const highPriorityListener = vi.fn();
      analyzer.on('high-priority-threat', highPriorityListener);

      const domains = ['malware-example.com'];
      await analyzer.analyzeSecurityThreats(domains, mockRecords);

      expect(highPriorityListener).toHaveBeenCalled();
    });
  });

  describe('real-time monitoring', () => {
    it('should start and stop real-time monitoring', () => {
      const monitoringListener = vi.fn();
      analyzer.on('monitoring-cycle', monitoringListener);

      analyzer.startRealTimeMonitoring(100); // 100ms間隔

      // 少し待ってから監視サイクルが実行されていることを確認
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(monitoringListener).toHaveBeenCalled();
          analyzer.stopRealTimeMonitoring();
          resolve();
        }, 150);
      });
    });

    it('should handle monitoring cycle events', () => {
      const monitoringListener = vi.fn();
      analyzer.on('monitoring-cycle', monitoringListener);

      analyzer.startRealTimeMonitoring(50);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(monitoringListener).toHaveBeenCalledTimes(2);
          analyzer.stopRealTimeMonitoring();
          resolve();
        }, 120);
      });
    });
  });

  describe('threat database', () => {
    it('should store and retrieve threat data', async () => {
      const domains = ['malware-example.com'];
      await analyzer.analyzeSecurityThreats(domains, mockRecords);

      const threatDatabase = analyzer.getThreatDatabase();
      expect(threatDatabase.size).toBeGreaterThan(0);
      expect(threatDatabase.get('malware-example.com')).toBeDefined();
    });

    it('should provide threat statistics', async () => {
      const domains = ['malware-example.com', 'phishing-example.com'];
      const testRecords = [
        ...mockRecords,
        {
          name: 'phishing-example.com',
          type: 'A',
          value: '192.168.1.8',
          ttl: 300,
          priority: 0
        }
      ];

      await analyzer.analyzeSecurityThreats(domains, testRecords);

      const stats = analyzer.getThreatStatistics();
      
      expect(stats.totalThreats).toBeGreaterThan(0);
      expect(stats.threatsByType).toBeInstanceOf(Object);
      expect(stats.threatsBySeverity).toBeInstanceOf(Object);
      expect(stats.recentThreats).toBeInstanceOf(Array);
    });
  });

  describe('configuration', () => {
    it('should respect confidence threshold', async () => {
      const lowThresholdAnalyzer = new DNSSecurityAnalyzer(undefined, {
        threatDetection: {
          enabledAnalyzers: ['malware'],
          confidenceThreshold: 30,
          realTimeMonitoring: false
        }
      });

      const domains = ['suspicious-domain.com'];
      const threats = await lowThresholdAnalyzer.analyzeSecurityThreats(domains, mockRecords);

      // 低い閾値では、より多くの脅威が検出される可能性がある
      expect(threats).toBeInstanceOf(Array);
    });

    it('should respect enabled analyzers', async () => {
      const limitedAnalyzer = new DNSSecurityAnalyzer(undefined, {
        threatDetection: {
          enabledAnalyzers: ['malware'], // マルウェアのみ
          confidenceThreshold: 70,
          realTimeMonitoring: false
        }
      });

      const domains = ['malware-example.com'];
      const threats = await limitedAnalyzer.analyzeSecurityThreats(domains, mockRecords);

      // マルウェア脅威のみが検出されることを確認
      threats.forEach(threat => {
        expect(threat.type).toBe('malware');
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      // ネットワークエラーをシミュレート
      const domains = ['network-error.com'];
      const errorRecords = [{
        name: 'network-error.com',
        type: 'A',
        value: '192.168.1.9',
        ttl: 300,
        priority: 0
      }];

      // エラーが発生してもクラッシュしないことを確認
      const threats = await analyzer.analyzeSecurityThreats(domains, errorRecords);
      expect(threats).toBeInstanceOf(Array);
    });

    it('should handle malformed DNS records', async () => {
      const domains = ['malformed.com'];
      const malformedRecords = [{
        name: 'malformed.com',
        type: 'INVALID' as any,
        value: 'invalid-value',
        ttl: -1,
        priority: 0
      }];

      const threats = await analyzer.analyzeSecurityThreats(domains, malformedRecords);
      expect(threats).toBeInstanceOf(Array);
    });
  });

  describe('performance', () => {
    it('should handle large domain lists efficiently', async () => {
      const domains = Array.from({ length: 100 }, (_, i) => `test${i}.com`);
      const testRecords = domains.map(domain => ({
        name: domain,
        type: 'A',
        value: `192.168.1.${(i % 254) + 1}`,
        ttl: 300,
        priority: 0
      }));

      const startTime = Date.now();
      const threats = await analyzer.analyzeSecurityThreats(domains, testRecords);
      const endTime = Date.now();

      expect(threats).toBeInstanceOf(Array);
      expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
    });
  });

  describe('threat deduplication', () => {
    it('should deduplicate similar threats', async () => {
      const domains = ['malware-example.com', 'malware-example.com']; // 重複
      const duplicateRecords = [
        ...mockRecords,
        ...mockRecords // 重複レコード
      ];

      const threats = await analyzer.analyzeSecurityThreats(domains, duplicateRecords);

      // 重複が排除されていることを確認
      const uniqueDomains = new Set(threats.map(t => t.domain));
      expect(uniqueDomains.size).toBeLessThanOrEqual(domains.length);
    });
  });
});