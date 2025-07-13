import type { IDNSRecord, DNSRecordType } from '../types/index.js';

export interface IRiskFactors {
  lastSeenDays: number;
  hasSuspiciousPattern: boolean;
  ttlScore: number;
  recordTypeRisk: number;
  domainDepth: number;
}

export interface IRiskScore {
  total: number;
  factors: IRiskFactors;
  level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface IRiskCalculatorOptions {
  suspiciousPatterns?: string[];
  highRiskTTLThreshold?: number;
  unusedDaysThreshold?: number;
}

export class RiskCalculator {
  private readonly suspiciousPatterns: RegExp[];
  private readonly highRiskTTLThreshold: number;
  private readonly unusedDaysThreshold: number;

  constructor(options: IRiskCalculatorOptions = {}) {
    const defaultPatterns = [
      'test',
      'temp',
      'tmp',
      'old',
      'backup',
      'bak',
      'dev',
      'staging',
      'demo',
      'sample',
      'example',
      'unused',
      'deprecated',
      '_',
      '-old',
      '-temp',
      '-test',
      '-bak',
    ];

    this.suspiciousPatterns = (options.suspiciousPatterns || defaultPatterns).map(
      (pattern) => new RegExp(pattern, 'i'),
    );

    this.highRiskTTLThreshold = options.highRiskTTLThreshold || 300; // 5 minutes
    this.unusedDaysThreshold = options.unusedDaysThreshold || 180; // 6 months
  }

  /**
   * Calculate risk score for a DNS record
   */
  calculateRisk(record: IDNSRecord, lastSeenDate?: Date): IRiskScore {
    const factors = this.analyzeRiskFactors(record, lastSeenDate);
    const total = this.computeTotalScore(factors);
    const level = this.determineRiskLevel(total);
    const recommendations = this.generateRecommendations(record, factors, level);

    return {
      total,
      factors,
      level,
      recommendations,
    };
  }

  /**
   * Batch calculate risk scores for multiple records
   */
  calculateBatchRisk(
    records: IDNSRecord[],
    lastSeenDates?: Map<string, Date>,
  ): Map<string, IRiskScore> {
    const results = new Map<string, IRiskScore>();

    for (const record of records) {
      const lastSeen = lastSeenDates?.get(record.id);
      results.set(record.id, this.calculateRisk(record, lastSeen));
    }

    return results;
  }

  /**
   * Analyze individual risk factors
   */
  private analyzeRiskFactors(record: IDNSRecord, lastSeenDate?: Date): IRiskFactors {
    const lastSeenDays = this.calculateDaysSinceLastSeen(lastSeenDate);
    const hasSuspiciousPattern = this.checkSuspiciousPatterns(record.name);
    const ttlScore = this.calculateTTLRiskScore(record.ttl);
    const recordTypeRisk = this.getRecordTypeRiskScore(record.type);
    const domainDepth = this.calculateDomainDepth(record.name);

    return {
      lastSeenDays,
      hasSuspiciousPattern,
      ttlScore,
      recordTypeRisk,
      domainDepth,
    };
  }

  /**
   * Calculate days since last seen
   */
  private calculateDaysSinceLastSeen(lastSeenDate?: Date): number {
    if (!lastSeenDate) {
      return 999; // Unknown = high risk
    }

    const now = new Date();
    const diffMs = now.getTime() - lastSeenDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Check for suspicious naming patterns
   */
  private checkSuspiciousPatterns(domain: string): boolean {
    return this.suspiciousPatterns.some((pattern) => pattern.test(domain));
  }

  /**
   * Calculate risk score based on TTL value
   */
  private calculateTTLRiskScore(ttl: number): number {
    if (ttl <= this.highRiskTTLThreshold) {
      return 30; // Very short TTL = high risk
    } else if (ttl <= 3600) {
      return 20; // Short TTL = medium risk
    } else if (ttl <= 86400) {
      return 10; // Normal TTL = low risk
    } else {
      return 5; // Long TTL = very low risk
    }
  }

  /**
   * Get risk score based on record type
   */
  private getRecordTypeRiskScore(type: DNSRecordType): number {
    const riskMap: Partial<Record<DNSRecordType, number>> = {
      CNAME: 15, // Can be chained, potential for abuse
      TXT: 10, // Often used for verification, can be forgotten
      SRV: 20, // Service records often forgotten
      PTR: 15, // Reverse DNS often overlooked
      MX: 5, // Mail records usually maintained
      A: 5, // Basic records, usually maintained
      AAAA: 5, // Basic records, usually maintained
      NS: 0, // Nameserver records critical
      SOA: 0, // Start of Authority critical
      CAA: 10, // Certificate authority, medium risk
    };

    return riskMap[type] || 10;
  }

  /**
   * Calculate domain depth (subdomain levels)
   */
  private calculateDomainDepth(domain: string): number {
    const parts = domain.split('.');
    const depth = Math.max(0, parts.length - 2); // Subtract TLD and SLD

    if (depth === 0) return 0;
    if (depth === 1) return 5;
    if (depth === 2) return 10;
    return 15; // Deep subdomains = higher risk
  }

  /**
   * Compute total risk score
   */
  private computeTotalScore(factors: IRiskFactors): number {
    let score = 0;

    // Unused time factor (0-40 points)
    if (factors.lastSeenDays >= this.unusedDaysThreshold) {
      score += 40;
    } else if (factors.lastSeenDays >= 90) {
      score += 25;
    } else if (factors.lastSeenDays >= 30) {
      score += 15;
    } else if (factors.lastSeenDays >= 7) {
      score += 5;
    }

    // Suspicious pattern factor (0-20 points)
    if (factors.hasSuspiciousPattern) {
      score += 20;
    }

    // TTL factor (0-30 points)
    score += factors.ttlScore;

    // Record type factor (0-20 points)
    score += factors.recordTypeRisk;

    // Domain depth factor (0-15 points)
    score += factors.domainDepth;

    return Math.min(100, score); // Cap at 100
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(score: number): IRiskScore['level'] {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Generate recommendations based on risk analysis
   */
  private generateRecommendations(
    record: IDNSRecord,
    factors: IRiskFactors,
    level: IRiskScore['level'],
  ): string[] {
    const recommendations: string[] = [];

    if (factors.lastSeenDays >= this.unusedDaysThreshold) {
      recommendations.push(
        `Record unused for ${factors.lastSeenDays} days. Consider removal if no longer needed.`,
      );
    }

    if (factors.hasSuspiciousPattern) {
      recommendations.push(
        'Domain name contains suspicious pattern. Verify if this is a temporary or test record.',
      );
    }

    if (factors.ttlScore >= 20) {
      recommendations.push(
        `Very short TTL (${record.ttl}s) detected. Consider increasing TTL if record is stable.`,
      );
    }

    if (factors.domainDepth >= 10) {
      recommendations.push(
        'Deep subdomain detected. Review if this level of nesting is necessary.',
      );
    }

    if (level === 'critical') {
      recommendations.push('CRITICAL: This record should be reviewed immediately.');
    } else if (level === 'high') {
      recommendations.push('HIGH RISK: Schedule review of this record within 30 days.');
    }

    if (record.type === 'CNAME' && factors.lastSeenDays > 90) {
      recommendations.push('Unused CNAME record. Verify target still exists.');
    }

    if (record.type === 'TXT' && factors.hasSuspiciousPattern) {
      recommendations.push('TXT record with suspicious name. May be old verification record.');
    }

    return recommendations;
  }

  /**
   * Filter records by risk level
   */
  filterByRiskLevel(
    records: IDNSRecord[],
    minLevel: IRiskScore['level'],
    lastSeenDates?: Map<string, Date>,
  ): IDNSRecord[] {
    const levelValues = { low: 0, medium: 1, high: 2, critical: 3 };
    const minValue = levelValues[minLevel];

    return records.filter((record) => {
      const risk = this.calculateRisk(record, lastSeenDates?.get(record.id));
      return levelValues[risk.level] >= minValue;
    });
  }

  /**
   * Get risk summary statistics
   */
  getRiskSummary(
    records: IDNSRecord[],
    lastSeenDates?: Map<string, Date>,
  ): {
    total: number;
    byLevel: Record<IRiskScore['level'], number>;
    averageScore: number;
    recommendations: number;
  } {
    const summary = {
      total: records.length,
      byLevel: { low: 0, medium: 0, high: 0, critical: 0 },
      averageScore: 0,
      recommendations: 0,
    };

    let totalScore = 0;

    for (const record of records) {
      const risk = this.calculateRisk(record, lastSeenDates?.get(record.id));
      summary.byLevel[risk.level]++;
      totalScore += risk.total;
      summary.recommendations += risk.recommendations.length;
    }

    summary.averageScore = records.length > 0 ? totalScore / records.length : 0;

    return summary;
  }
}