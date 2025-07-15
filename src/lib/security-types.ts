/**
 * DNSセキュリティシステムの型定義
 */

import type { IDNSRecord as DNSRecord } from '../types/index.js';

export interface SecurityThreat {
  id: string;
  type:
    | 'malware'
    | 'phishing'
    | 'typosquatting'
    | 'dga'
    | 'fastflux'
    | 'dns_hijacking'
    | 'cache_poisoning'
    | 'subdomain_takeover';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  domain: string;
  record?: DNSRecord;
  timestamp: number;
  title: string;
  description: string;
  detectedAt?: string;
  references?: string[];
  indicators: {
    technicalIndicators: string[];
    behavioralIndicators: string[];
    reputationIndicators: string[];
  };
  mitigation: {
    immediateActions: string[];
    longTermActions: string[];
    preventionMeasures: string[];
  };
  evidence: {
    dnsRecords: DNSRecord[];
    networkAnalysis: NetworkAnalysis;
    reputationData: ReputationData;
    algorithmicAnalysis: AlgorithmicAnalysis;
  };
}

export interface NetworkAnalysis {
  ipReputationScore: number;
  geoLocationRisk: number;
  domainAge: number;
  certificateStatus: 'valid' | 'invalid' | 'expired' | 'self_signed' | 'none';
  portScanResults: PortScanResult[];
}

export interface ReputationData {
  blacklistStatus: BlacklistStatus[];
  threatIntelligence: ThreatIntelligence[];
  historicalIncidents: HistoricalIncident[];
  communityReports: CommunityReport[];
}

export interface AlgorithmicAnalysis {
  domain?: string;
  timestamp?: Date;
  domainGenerationScore: number;
  typosquattingScore: number;
  homographScore: number;
  entropyScore: number;
  randomnessScore?: number;
  ngramAnalysis: NgramAnalysis;
  lexicalAnalysis: LexicalAnalysis;
}

export interface BlacklistStatus {
  source: string;
  status: 'blacklisted' | 'suspicious' | 'clean';
  lastChecked: number;
  reason?: string;
}

export interface ThreatIntelligence {
  source: string;
  threatType: string;
  confidence: number;
  lastSeen: number;
  details: string;
}

export interface HistoricalIncident {
  timestamp: number;
  type: string;
  description: string;
  severity: string;
}

export interface CommunityReport {
  source: string;
  reportType: string;
  confidence: number;
  timestamp: number;
  details: string;
}

export interface PortScanResult {
  port: number;
  protocol: 'tcp' | 'udp';
  status: 'open' | 'closed' | 'filtered';
  service?: string;
  version?: string;
}

export interface NgramAnalysis {
  bigramScore: number;
  trigramScore: number;
  characterFrequency: Record<string, number>;
  suspiciousNgrams: string[];
}

export interface LexicalAnalysis {
  dictionaryScore: number;
  randomnessScore: number;
  pronounceabilityScore: number;
  languageDetection: string;
  suspiciousTokens: string[];
}

export interface SecurityConfig {
  threatDetection: {
    enabledAnalyzers: string[];
    confidenceThreshold: number;
    realTimeMonitoring: boolean;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    alertThresholds: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  response: {
    autoBlock: boolean;
    autoQuarantine: boolean;
    notificationEnabled: boolean;
    logLevel: string;
  };
  reputationChecking: {
    enabledSources: string[];
    cacheTimeout: number;
    parallelChecks: number;
  };
  alerting: {
    enabledChannels: string[];
    severityThreshold: string;
    rateLimiting: boolean;
    cooldownPeriod?: number;
  };
  mitigation: {
    autoBlocking: boolean;
    quarantineEnabled: boolean;
    alertingEnabled: boolean;
  };
}

export interface ThreatDetectionResult {
  threats: SecurityThreat[];
  analysisTime: number;
  totalDomains: number;
  threatsFound: number;
  criticalThreats: number;
}

export interface ThreatStatistics {
  totalThreats: number;
  threatsByType: Record<string, number>;
  threatsBySeverity: Record<string, number>;
  recentThreats: SecurityThreat[];
}

export type ThreatDetectorFunction = (
  domain: string,
  records: DNSRecord[]
) => Promise<SecurityThreat[]>;

export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low';

export type ThreatType =
  | 'malware'
  | 'phishing'
  | 'typosquatting'
  | 'dga'
  | 'fastflux'
  | 'dns_hijacking'
  | 'cache_poisoning'
  | 'subdomain_takeover';
