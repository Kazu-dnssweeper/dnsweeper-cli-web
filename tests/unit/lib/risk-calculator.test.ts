import { describe, it, expect, beforeEach } from 'vitest';
import { RiskCalculator } from '../../../src/lib/risk-calculator.js';
import type { IDNSRecord } from '../../../src/types/index.js';

describe('RiskCalculator', () => {
  let calculator: RiskCalculator;
  let mockRecord: IDNSRecord;

  beforeEach(() => {
    calculator = new RiskCalculator();
    mockRecord = {
      id: 'test-1',
      name: 'example.com',
      type: 'A',
      value: '192.168.1.1',
      ttl: 3600,
      created: new Date('2023-01-01'),
      updated: new Date('2023-01-01'),
    };
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const calc = new RiskCalculator();
      expect(calc).toBeInstanceOf(RiskCalculator);
    });

    it('should create instance with custom options', () => {
      const calc = new RiskCalculator({
        suspiciousPatterns: ['custom', 'pattern'],
        highRiskTTLThreshold: 600,
        unusedDaysThreshold: 90,
      });
      expect(calc).toBeInstanceOf(RiskCalculator);
    });
  });

  describe('calculateRisk', () => {
    it('should calculate low risk for normal record', () => {
      const result = calculator.calculateRisk(mockRecord, new Date());

      expect(result.level).toBe('low');
      expect(result.total).toBeLessThan(30);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should calculate high risk for old unused record', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 365); // 1 year ago

      const result = calculator.calculateRisk(mockRecord, oldDate);

      expect(result.level).toMatch(/high|critical/);
      expect(result.total).toBeGreaterThan(40);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toContain('unused for');
    });

    it('should detect suspicious patterns', () => {
      const suspiciousRecord: IDNSRecord = {
        ...mockRecord,
        name: 'test-old-backup.example.com',
      };

      const result = calculator.calculateRisk(suspiciousRecord, new Date());

      expect(result.factors.hasSuspiciousPattern).toBe(true);
      expect(result.recommendations).toContain(
        'Domain name contains suspicious pattern. Verify if this is a temporary or test record.',
      );
    });

    it('should score high risk for very short TTL', () => {
      const shortTTLRecord: IDNSRecord = {
        ...mockRecord,
        ttl: 60, // 1 minute
      };

      const result = calculator.calculateRisk(shortTTLRecord, new Date());

      expect(result.factors.ttlScore).toBe(30);
      expect(result.recommendations).toContain(
        `Very short TTL (${shortTTLRecord.ttl}s) detected. Consider increasing TTL if record is stable.`,
      );
    });

    it('should consider record type in risk calculation', () => {
      const srvRecord: IDNSRecord = {
        ...mockRecord,
        type: 'SRV',
      };

      const result = calculator.calculateRisk(srvRecord, new Date());

      expect(result.factors.recordTypeRisk).toBe(20);
      expect(result.total).toBeGreaterThan(20);
    });

    it('should calculate risk for deep subdomains', () => {
      const deepSubdomain: IDNSRecord = {
        ...mockRecord,
        name: 'level3.level2.level1.example.com',
      };

      const result = calculator.calculateRisk(deepSubdomain, new Date());

      expect(result.factors.domainDepth).toBe(10);
      expect(result.recommendations).toContain(
        'Deep subdomain detected. Review if this level of nesting is necessary.',
      );
    });

    it('should handle unknown last seen date', () => {
      const result = calculator.calculateRisk(mockRecord);

      expect(result.factors.lastSeenDays).toBe(999);
      expect(result.level).toMatch(/critical|high/);
    });
  });

  describe('calculateBatchRisk', () => {
    it('should calculate risk for multiple records', () => {
      const records: IDNSRecord[] = [
        mockRecord,
        { ...mockRecord, id: 'test-2', name: 'test.example.com' },
        { ...mockRecord, id: 'test-3', type: 'CNAME' },
      ];

      const lastSeenDates = new Map([
        ['test-1', new Date()],
        ['test-2', new Date()],
        ['test-3', new Date('2023-01-01')],
      ]);

      const results = calculator.calculateBatchRisk(records, lastSeenDates);

      expect(results.size).toBe(3);
      expect(results.get('test-1')?.level).toBe('low');
      expect(results.get('test-2')?.factors.hasSuspiciousPattern).toBe(true);
      expect(results.get('test-3')?.level).toMatch(/high|critical/);
    });
  });

  describe('filterByRiskLevel', () => {
    it('should filter records by minimum risk level', () => {
      const records: IDNSRecord[] = [
        mockRecord, // low risk
        { ...mockRecord, id: 'test-2', name: 'test.example.com' }, // medium risk
        { ...mockRecord, id: 'test-3', ttl: 60 }, // high risk
      ];

      const highRiskRecords = calculator.filterByRiskLevel(records, 'high');

      expect(highRiskRecords).toHaveLength(1);
      expect(highRiskRecords[0]!.id).toBe('test-3');
    });

    it('should include all records when filtering by low', () => {
      const records: IDNSRecord[] = [
        mockRecord,
        { ...mockRecord, id: 'test-2', name: 'test.example.com' },
      ];

      const filtered = calculator.filterByRiskLevel(records, 'low');

      expect(filtered).toHaveLength(2);
    });
  });

  describe('getRiskSummary', () => {
    it('should generate risk summary statistics', () => {
      const records: IDNSRecord[] = [
        mockRecord, // low risk
        { ...mockRecord, id: 'test-2', name: 'test.example.com' }, // medium risk
        { ...mockRecord, id: 'test-3', ttl: 60 }, // high risk
        { ...mockRecord, id: 'test-4', name: 'old-backup.example.com', ttl: 30 }, // critical
      ];

      const summary = calculator.getRiskSummary(records);

      expect(summary.total).toBe(4);
      expect(summary.byLevel.low).toBeGreaterThan(0);
      expect(summary.byLevel.medium).toBeGreaterThan(0);
      expect(summary.byLevel.high + summary.byLevel.critical).toBeGreaterThan(0);
      expect(summary.averageScore).toBeGreaterThan(0);
      expect(summary.recommendations).toBeGreaterThan(0);
    });

    it('should handle empty record list', () => {
      const summary = calculator.getRiskSummary([]);

      expect(summary.total).toBe(0);
      expect(summary.averageScore).toBe(0);
      expect(summary.recommendations).toBe(0);
    });
  });

  describe('risk level determination', () => {
    it('should classify scores correctly', () => {
      const testCases = [
        { score: 10, expected: 'low' },
        { score: 25, expected: 'low' },
        { score: 35, expected: 'medium' },
        { score: 45, expected: 'medium' },
        { score: 55, expected: 'high' },
        { score: 65, expected: 'high' },
        { score: 75, expected: 'critical' },
        { score: 90, expected: 'critical' },
      ];

      for (const testCase of testCases) {
        const testRecord: IDNSRecord = {
          ...mockRecord,
          ttl: testCase.score === 75 || testCase.score === 90 ? 30 : 3600,
          name:
            testCase.score >= 35
              ? 'test-old-backup-temp.level3.level2.example.com'
              : 'example.com',
        };

        const oldDate = new Date();
        if (testCase.score >= 55) {
          oldDate.setDate(oldDate.getDate() - 365);
        } else if (testCase.score >= 35) {
          oldDate.setDate(oldDate.getDate() - 100);
        }

        const result = calculator.calculateRisk(testRecord, testCase.score >= 35 ? oldDate : new Date());

        expect(result.level).toBe(testCase.expected);
      }
    });
  });

  describe('recommendations', () => {
    it('should generate CNAME-specific recommendations', () => {
      const cnameRecord: IDNSRecord = {
        ...mockRecord,
        type: 'CNAME',
      };

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const result = calculator.calculateRisk(cnameRecord, oldDate);

      expect(result.recommendations).toContain('Unused CNAME record. Verify target still exists.');
    });

    it('should generate TXT-specific recommendations', () => {
      const txtRecord: IDNSRecord = {
        ...mockRecord,
        type: 'TXT',
        name: 'test-verification.example.com',
      };

      const result = calculator.calculateRisk(txtRecord, new Date());

      expect(result.recommendations).toContain(
        'TXT record with suspicious name. May be old verification record.',
      );
    });

    it('should add critical warning for critical risk', () => {
      const criticalRecord: IDNSRecord = {
        ...mockRecord,
        name: 'old-test-backup.example.com',
        ttl: 30,
      };

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 365);

      const result = calculator.calculateRisk(criticalRecord, oldDate);

      expect(result.level).toBe('critical');
      expect(result.recommendations).toContain(
        'CRITICAL: This record should be reviewed immediately.',
      );
    });
  });
});