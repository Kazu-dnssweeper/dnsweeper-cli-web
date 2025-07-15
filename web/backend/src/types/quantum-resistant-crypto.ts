/**
 * DNSweeper 量子耐性暗号システム型定義
 * ポスト量子暗号・格子暗号・ハッシュベース署名・多変数暗号・同種写像暗号
 */

/**
 * 量子耐性暗号アルゴリズム
 */
export type QuantumResistantAlgorithm = 
  | 'kyber'        // 格子ベース鍵交換
  | 'dilithium'    // 格子ベースデジタル署名
  | 'falcon'       // NTRU格子ベース署名
  | 'sphincs'      // ハッシュベース署名
  | 'rainbow'      // 多変数暗号署名
  | 'sike'         // 同種写像鍵交換
  | 'mceliece'     // 符号ベース暗号
  | 'frodo'        // 格子ベース鍵交換
  | 'ntru'         // NTRU格子暗号
  | 'newhope';     // 格子ベース鍵交換

/**
 * 暗号化レベル
 */
export type SecurityLevel = 'level1' | 'level3' | 'level5'; // NIST標準レベル

/**
 * 鍵タイプ
 */
export type KeyType = 'public' | 'private' | 'symmetric' | 'master' | 'derived';

/**
 * 暗号化用途
 */
export type CryptoUsage = 'signing' | 'encryption' | 'key_exchange' | 'authentication' | 'data_protection';

/**
 * 量子耐性鍵ペア
 */
export interface QuantumResistantKeyPair {
  id: string;
  algorithm: QuantumResistantAlgorithm;
  securityLevel: SecurityLevel;
  usage: CryptoUsage;
  publicKey: QuantumPublicKey;
  privateKey: QuantumPrivateKey;
  metadata: KeyMetadata;
  created: Date;
  expires?: Date;
  revoked?: Date;
  status: 'active' | 'expired' | 'revoked' | 'compromised';
}

/**
 * 量子耐性公開鍵
 */
export interface QuantumPublicKey {
  keyData: Uint8Array;
  format: 'raw' | 'der' | 'pem' | 'jwk';
  parameters: AlgorithmParameters;
  fingerprint: string;
  size: number; // bytes
}

/**
 * 量子耐性秘密鍵
 */
export interface QuantumPrivateKey {
  keyData: Uint8Array;
  format: 'raw' | 'der' | 'pem' | 'jwk';
  parameters: AlgorithmParameters;
  encrypted: boolean;
  encryptionKey?: string;
  fingerprint: string;
  size: number; // bytes
}

/**
 * アルゴリズムパラメータ
 */
export interface AlgorithmParameters {
  [key: string]: any;
  
  // Kyber/Frodo パラメータ
  n?: number;        // 多項式次数
  q?: number;        // モジュラス
  k?: number;        // ランク
  
  // Dilithium/Falcon パラメータ  
  d?: number;        // ドロップビット数
  gamma1?: number;   // 係数境界
  gamma2?: number;   // 係数境界
  
  // SPHINCS+ パラメータ
  h?: number;        // 高さ
  w?: number;        // Winternitzパラメータ
  
  // Rainbow パラメータ
  v?: number;        // 変数数
  o?: number;        // 方程式数
  
  // SIKE パラメータ
  p?: string;        // 素数
  strategy?: number[]; // 同種写像戦略
}

/**
 * 鍵メタデータ
 */
export interface KeyMetadata {
  owner: string;
  purpose: string;
  tags: string[];
  createdBy: string;
  rotationPolicy: KeyRotationPolicy;
  backupPolicy: KeyBackupPolicy;
  auditLog: KeyAuditEntry[];
  compliance: ComplianceInfo;
  quantumSafe: boolean;
  estimatedLifetime: number; // years
}

/**
 * 鍵ローテーション ポリシー
 */
export interface KeyRotationPolicy {
  enabled: boolean;
  intervalDays: number;
  warningDays: number;
  autoRotate: boolean;
  retainOldKeys: boolean;
  maxKeyHistory: number;
}

/**
 * 鍵バックアップ ポリシー
 */
export interface KeyBackupPolicy {
  enabled: boolean;
  locations: string[];
  encryption: boolean;
  redundancy: number;
  verificationRequired: boolean;
  accessControlRequired: boolean;
}

/**
 * 鍵監査エントリ
 */
export interface KeyAuditEntry {
  timestamp: Date;
  action: 'created' | 'used' | 'rotated' | 'revoked' | 'backed_up' | 'restored';
  actor: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * コンプライアンス情報
 */
export interface ComplianceInfo {
  standards: ('FIPS-140' | 'Common-Criteria' | 'NIST-PQC' | 'ISO-27001')[];
  certifications: string[];
  auditTrail: boolean;
  keyEscrow: boolean;
  geographicRestrictions: string[];
}

/**
 * 暗号化コンテキスト
 */
export interface CryptographicContext {
  sessionId: string;
  algorithm: QuantumResistantAlgorithm;
  securityLevel: SecurityLevel;
  keyIds: string[];
  parameters: ContextParameters;
  nonce?: Uint8Array;
  aad?: Uint8Array; // Associated Authenticated Data
  created: Date;
  expires: Date;
}

/**
 * コンテキストパラメータ
 */
export interface ContextParameters {
  mode: 'encrypt' | 'decrypt' | 'sign' | 'verify' | 'key_exchange';
  padding?: string;
  hashFunction?: 'sha256' | 'sha384' | 'sha512' | 'shake128' | 'shake256';
  kdf?: 'hkdf' | 'pbkdf2' | 'scrypt' | 'argon2';
  derivationInfo?: Uint8Array;
  iterations?: number;
  memoryCost?: number;
  parallelism?: number;
}

/**
 * 暗号化オペレーション
 */
export interface CryptographicOperation {
  id: string;
  type: 'encryption' | 'decryption' | 'signing' | 'verification' | 'key_generation' | 'key_exchange';
  algorithm: QuantumResistantAlgorithm;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: CryptoInput;
  output?: CryptoOutput;
  context: CryptographicContext;
  performance: OperationPerformance;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

/**
 * 暗号化入力
 */
export interface CryptoInput {
  data: Uint8Array;
  size: number;
  format: 'raw' | 'base64' | 'hex' | 'pem';
  metadata?: Record<string, any>;
}

/**
 * 暗号化出力
 */
export interface CryptoOutput {
  data: Uint8Array;
  size: number;
  format: 'raw' | 'base64' | 'hex' | 'pem';
  signature?: Uint8Array;
  metadata?: Record<string, any>;
  verified?: boolean;
}

/**
 * オペレーション パフォーマンス
 */
export interface OperationPerformance {
  duration: number; // milliseconds
  cpuTime: number;  // milliseconds
  memoryUsage: number; // bytes
  keySize: number;  // bytes
  signatureSize?: number; // bytes
  ciphertextSize?: number; // bytes
  throughput?: number; // bytes/second
  operationsPerSecond?: number;
}

/**
 * ハイブリッド暗号化設定
 */
export interface HybridCryptoConfig {
  classicalAlgorithm: 'aes-256-gcm' | 'chacha20-poly1305' | 'rsa-oaep';
  quantumResistantAlgorithm: QuantumResistantAlgorithm;
  keyDerivation: {
    function: 'hkdf' | 'pbkdf2' | 'scrypt';
    iterations?: number;
    memory?: number;
    parallelism?: number;
    salt: Uint8Array;
  };
  combiningStrategy: 'concat' | 'xor' | 'kdf_combine' | 'secure_combine';
  transitionPeriod: {
    start: Date;
    end: Date;
    allowClassicalOnly: boolean;
    requireQuantumResistant: boolean;
  };
}

/**
 * 暗号化マイグレーション計画
 */
export interface CryptoMigrationPlan {
  id: string;
  name: string;
  description: string;
  fromAlgorithms: string[];
  toAlgorithms: QuantumResistantAlgorithm[];
  phases: MigrationPhase[];
  rollbackPlan: RollbackPlan;
  testing: TestingPlan;
  timeline: {
    start: Date;
    phases: PhaseTimeline[];
    completion: Date;
  };
  riskAssessment: RiskAssessment;
  approvals: ApprovalRecord[];
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
}

/**
 * マイグレーション フェーズ
 */
export interface MigrationPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  dependencies: string[];
  tasks: MigrationTask[];
  criteria: SuccessCriteria;
  rollbackProcedure: string;
  estimatedDuration: number; // days
  resources: string[];
}

/**
 * マイグレーション タスク
 */
export interface MigrationTask {
  id: string;
  name: string;
  type: 'key_generation' | 'algorithm_upgrade' | 'data_re_encryption' | 'testing' | 'validation';
  description: string;
  automated: boolean;
  script?: string;
  validation: string;
  rollback: string;
  estimatedTime: number; // hours
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * 成功基準
 */
export interface SuccessCriteria {
  performanceThreshold: {
    maxLatencyIncrease: number; // percentage
    minThroughputMaintained: number; // percentage
  };
  securityRequirements: string[];
  compatibilityTests: string[];
  userAcceptanceTests: string[];
  monitoringMetrics: string[];
}

/**
 * フェーズ タイムライン
 */
export interface PhaseTimeline {
  phaseId: string;
  startDate: Date;
  endDate: Date;
  milestones: {
    name: string;
    date: Date;
    completed: boolean;
  }[];
}

/**
 * リスク評価
 */
export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  risks: RiskItem[];
  mitigations: MitigationStrategy[];
  contingencyPlans: ContingencyPlan[];
}

/**
 * リスク項目
 */
export interface RiskItem {
  id: string;
  category: 'technical' | 'operational' | 'security' | 'business';
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  owner: string;
}

/**
 * 軽減戦略
 */
export interface MitigationStrategy {
  riskId: string;
  strategy: string;
  implementation: string;
  responsible: string;
  timeline: Date;
  cost: number;
  effectiveness: number; // percentage
}

/**
 * 非常時計画
 */
export interface ContingencyPlan {
  trigger: string;
  actions: string[];
  responsible: string[];
  resources: string[];
  timeline: number; // hours
}

/**
 * ロールバック計画
 */
export interface RollbackPlan {
  triggers: string[];
  procedures: RollbackProcedure[];
  dataBackup: BackupStrategy;
  testing: string[];
  timeline: number; // hours
  approvals: string[];
}

/**
 * ロールバック手順
 */
export interface RollbackProcedure {
  step: number;
  action: string;
  validation: string;
  timeout: number; // minutes
  fallback: string;
}

/**
 * バックアップ戦略
 */
export interface BackupStrategy {
  frequency: 'real_time' | 'hourly' | 'daily';
  retention: number; // days
  encryption: boolean;
  verification: boolean;
  locations: string[];
}

/**
 * テスト計画
 */
export interface TestingPlan {
  phases: TestPhase[];
  environments: TestEnvironment[];
  criteria: TestCriteria;
  automation: TestAutomation;
}

/**
 * テスト フェーズ
 */
export interface TestPhase {
  name: string;
  type: 'unit' | 'integration' | 'performance' | 'security' | 'compatibility';
  tests: TestCase[];
  environment: string;
  schedule: Date;
  duration: number; // hours
}

/**
 * テスト ケース
 */
export interface TestCase {
  id: string;
  name: string;
  description: string;
  type: 'functional' | 'performance' | 'security' | 'compatibility';
  input: any;
  expectedOutput: any;
  automated: boolean;
  script?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  result?: any;
  duration?: number;
}

/**
 * テスト環境
 */
export interface TestEnvironment {
  name: string;
  type: 'development' | 'staging' | 'production_like' | 'isolated';
  configuration: Record<string, any>;
  resources: string[];
  restrictions: string[];
}

/**
 * テスト基準
 */
export interface TestCriteria {
  passingThreshold: number; // percentage
  performanceBaseline: Record<string, number>;
  securityRequirements: string[];
  compatibilityMatrix: CompatibilityMatrix;
}

/**
 * 互換性マトリックス
 */
export interface CompatibilityMatrix {
  algorithms: Record<QuantumResistantAlgorithm, boolean>;
  platforms: Record<string, boolean>;
  libraries: Record<string, string>; // library -> version
  protocols: Record<string, boolean>;
}

/**
 * テスト自動化
 */
export interface TestAutomation {
  framework: string;
  ciIntegration: boolean;
  reportGeneration: boolean;
  alerting: {
    enabled: boolean;
    channels: string[];
    thresholds: Record<string, number>;
  };
}

/**
 * 承認記録
 */
export interface ApprovalRecord {
  approver: string;
  role: string;
  timestamp: Date;
  decision: 'approved' | 'rejected' | 'conditional';
  conditions?: string[];
  comments?: string;
  signature?: string;
}

/**
 * 量子耐性証明書
 */
export interface QuantumResistantCertificate {
  id: string;
  version: number;
  serialNumber: string;
  issuer: CertificateIssuer;
  subject: CertificateSubject;
  publicKey: QuantumPublicKey;
  signature: QuantumSignature;
  validity: {
    notBefore: Date;
    notAfter: Date;
  };
  extensions: CertificateExtension[];
  revocationInfo?: RevocationInfo;
  created: Date;
  status: 'valid' | 'expired' | 'revoked' | 'suspended';
}

/**
 * 証明書発行者
 */
export interface CertificateIssuer {
  commonName: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  keyId: string;
}

/**
 * 証明書主体
 */
export interface CertificateSubject {
  commonName: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
  email?: string;
  alternativeNames?: string[];
}

/**
 * 量子耐性署名
 */
export interface QuantumSignature {
  algorithm: QuantumResistantAlgorithm;
  value: Uint8Array;
  parameters: AlgorithmParameters;
  timestamp: Date;
  nonce?: Uint8Array;
}

/**
 * 証明書拡張
 */
export interface CertificateExtension {
  oid: string;
  critical: boolean;
  value: Uint8Array;
  description?: string;
}

/**
 * 失効情報
 */
export interface RevocationInfo {
  reason: 'unspecified' | 'key_compromise' | 'ca_compromise' | 'affiliation_changed' | 'superseded' | 'cessation_of_operation';
  revocationDate: Date;
  invalidityDate?: Date;
  crlEntry?: string;
  ocspResponse?: string;
}

/**
 * PKI 設定
 */
export interface QuantumPkiConfig {
  rootCa: {
    algorithm: QuantumResistantAlgorithm;
    keySize: number;
    validityPeriod: number; // years
    hashFunction: string;
  };
  intermediateCa: {
    algorithm: QuantumResistantAlgorithm;
    keySize: number;
    validityPeriod: number; // years
    pathLength: number;
  };
  endEntity: {
    algorithms: QuantumResistantAlgorithm[];
    defaultValidityPeriod: number; // years
    autoRenewal: boolean;
    renewalThreshold: number; // days before expiry
  };
  crl: {
    enabled: boolean;
    updateInterval: number; // hours
    nextUpdateGracePeriod: number; // hours
  };
  ocsp: {
    enabled: boolean;
    responderUrl: string;
    responseLifetime: number; // hours
  };
}

/**
 * 量子脅威評価
 */
export interface QuantumThreatAssessment {
  assessmentDate: Date;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  timeToQuantumThreat: number; // years (estimated)
  vulnerableAlgorithms: string[];
  mitigationStatus: Record<string, MitigationStatus>;
  recommendations: ThreatRecommendation[];
  nextAssessment: Date;
}

/**
 * 軽減状況
 */
export interface MitigationStatus {
  algorithm: string;
  status: 'not_started' | 'planning' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeline: {
    start?: Date;
    target: Date;
    completion?: Date;
  };
  progress: number; // percentage
  blockers: string[];
}

/**
 * 脅威推奨事項
 */
export interface ThreatRecommendation {
  id: string;
  category: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  justification: string;
  implementation: string;
  cost: number;
  timeline: number; // months
  responsible: string;
  status: 'open' | 'in_progress' | 'completed' | 'deferred';
}