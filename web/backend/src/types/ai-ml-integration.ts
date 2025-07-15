/**
 * DNSweeper AI/ML統合型定義
 * GPT-4・機械学習・予測分析・自動化・スマート分析・AI駆動セキュリティ
 */

/**
 * AI モデルタイプ
 */
export type AiModelType = 
  | 'gpt-4'              // GPT-4言語モデル
  | 'gpt-4-turbo'        // GPT-4 Turbo
  | 'claude'             // Claude AI
  | 'bert'               // BERT言語理解
  | 'random_forest'      // ランダムフォレスト
  | 'neural_network'     // ニューラルネットワーク
  | 'lstm'               // LSTM時系列
  | 'transformer'        // Transformer
  | 'decision_tree'      // 決定木
  | 'svm'                // サポートベクターマシン
  | 'clustering'         // クラスタリング
  | 'anomaly_detection'  // 異常検出
  | 'recommendation'     // 推薦システム
  | 'computer_vision'    // コンピュータビジョン
  | 'nlp'                // 自然言語処理
  | 'reinforcement';     // 強化学習

/**
 * AI分析タイプ
 */
export type AiAnalysisType = 
  | 'dns_threat_detection'     // DNS脅威検出
  | 'malware_classification'   // マルウェア分類
  | 'domain_reputation'        // ドメイン評判
  | 'traffic_anomaly'          // トラフィック異常
  | 'security_prediction'      // セキュリティ予測
  | 'performance_optimization' // パフォーマンス最適化
  | 'capacity_planning'        // 容量計画
  | 'user_behavior'            // ユーザー行動分析
  | 'fraud_detection'          // 詐欺検出
  | 'compliance_monitoring'    // コンプライアンス監視
  | 'risk_assessment'          // リスク評価
  | 'trend_analysis'           // トレンド分析
  | 'predictive_maintenance'   // 予知保全
  | 'smart_routing'            // スマートルーティング
  | 'content_classification';  // コンテンツ分類

/**
 * AI信頼度レベル
 */
export type ConfidenceLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

/**
 * AI学習フェーズ
 */
export type LearningPhase = 'training' | 'validation' | 'testing' | 'production' | 'retraining';

/**
 * AI推論モード
 */
export type InferenceMode = 'real_time' | 'batch' | 'streaming' | 'on_demand';

/**
 * AIモデル設定
 */
export interface AiModelConfig {
  id: string;
  name: string;
  type: AiModelType;
  version: string;
  description: string;
  analysisTypes: AiAnalysisType[];
  
  // モデルパラメータ
  parameters: {
    temperature?: number;           // 生成ランダム性 (0.0-2.0)
    maxTokens?: number;            // 最大トークン数
    topP?: number;                 // nucleus sampling (0.0-1.0)
    frequencyPenalty?: number;     // 頻度ペナルティ
    presencePenalty?: number;      // 存在ペナルティ
    learningRate?: number;         // 学習率
    batchSize?: number;            // バッチサイズ
    epochs?: number;               // エポック数
    regularization?: number;       // 正則化パラメータ
    dropout?: number;              // ドロップアウト率
    hiddenLayers?: number;         // 隠れ層数
    neurons?: number;              // ニューロン数
    kernelSize?: number;           // カーネルサイズ
    poolingSize?: number;          // プーリングサイズ
    customParams?: Record<string, any>;
  };
  
  // 入力・出力設定
  input: {
    format: 'text' | 'json' | 'csv' | 'binary' | 'image' | 'audio' | 'structured';
    schema?: any;
    preprocessing?: PreprocessingStep[];
    validation?: ValidationRule[];
    maxSize: number;               // bytes
    encoding?: string;
  };
  
  output: {
    format: 'text' | 'json' | 'classification' | 'probability' | 'embedding' | 'structured';
    schema?: any;
    postprocessing?: PostprocessingStep[];
    confidenceThreshold: number;
    explanation?: boolean;         // 説明可能AI
  };
  
  // 性能設定
  performance: {
    inferenceMode: InferenceMode;
    maxLatency: number;           // milliseconds
    maxThroughput: number;        // requests/second
    memoryLimit: number;          // MB
    cpuLimit: number;             // cores
    gpuRequired: boolean;
    scalingPolicy: ScalingPolicy;
  };
  
  // セキュリティ設定
  security: {
    encryptModel: boolean;
    accessControl: ModelAccessControl;
    auditLogging: boolean;
    dataPrivacy: DataPrivacyConfig;
    federatedLearning: boolean;
  };
  
  // 監視設定
  monitoring: {
    metricsEnabled: boolean;
    alertingEnabled: boolean;
    driftDetection: boolean;
    performanceTracking: boolean;
    biasDetection: boolean;
    explainabilityTracking: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'training' | 'validating' | 'deployed' | 'deprecated';
}

/**
 * 前処理ステップ
 */
export interface PreprocessingStep {
  id: string;
  type: 'tokenization' | 'normalization' | 'vectorization' | 'feature_extraction' | 'data_cleaning' | 'scaling' | 'encoding';
  parameters: Record<string, any>;
  order: number;
  enabled: boolean;
}

/**
 * 後処理ステップ
 */
export interface PostprocessingStep {
  id: string;
  type: 'threshold_application' | 'confidence_scoring' | 'result_formatting' | 'aggregation' | 'ranking' | 'filtering';
  parameters: Record<string, any>;
  order: number;
  enabled: boolean;
}

/**
 * バリデーションルール
 */
export interface ValidationRule {
  field: string;
  type: 'required' | 'type_check' | 'range' | 'pattern' | 'custom';
  parameters: Record<string, any>;
  errorMessage: string;
}

/**
 * スケーリングポリシー
 */
export interface ScalingPolicy {
  autoScaling: boolean;
  minInstances: number;
  maxInstances: number;
  targetUtilization: number;
  scaleUpCooldown: number;    // seconds
  scaleDownCooldown: number;  // seconds
  metrics: ('cpu' | 'memory' | 'requests' | 'latency')[];
}

/**
 * モデルアクセス制御
 */
export interface ModelAccessControl {
  authentication: boolean;
  authorization: boolean;
  allowedUsers: string[];
  allowedRoles: string[];
  allowedIPs: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  quotas: {
    maxRequestsPerUser: number;
    maxDataSizePerRequest: number;
    maxConcurrentRequests: number;
  };
}

/**
 * データプライバシー設定
 */
export interface DataPrivacyConfig {
  anonymization: boolean;
  encryption: boolean;
  dataRetention: number;        // days
  consentRequired: boolean;
  gdprCompliant: boolean;
  dataLocation: string;
  auditTrail: boolean;
  rightToDelete: boolean;
  rightToExplain: boolean;
}

/**
 * AI推論リクエスト
 */
export interface AiInferenceRequest {
  id: string;
  modelId: string;
  analysisType: AiAnalysisType;
  input: {
    data: any;
    format: string;
    metadata?: Record<string, any>;
  };
  options: {
    confidenceThreshold?: number;
    maxResults?: number;
    explain?: boolean;
    async?: boolean;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  };
  context: {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
    environment: 'development' | 'staging' | 'production';
  };
  createdAt: Date;
}

/**
 * AI推論レスポンス
 */
export interface AiInferenceResponse {
  id: string;
  requestId: string;
  modelId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  
  // 結果データ
  results: {
    predictions: Prediction[];
    confidence: ConfidenceLevel;
    explanation?: Explanation;
    metadata: {
      processingTime: number;   // milliseconds
      modelVersion: string;
      timestamp: Date;
      resourceUsage: ResourceUsage;
    };
  };
  
  // エラー情報
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  
  completedAt?: Date;
}

/**
 * 予測結果
 */
export interface Prediction {
  id: string;
  type: AiAnalysisType;
  value: any;
  confidence: number;          // 0.0-1.0
  probability?: number;        // 0.0-1.0
  score?: number;
  rank?: number;
  labels?: string[];
  features?: FeatureImportance[];
  explanation?: string;
  recommendations?: Recommendation[];
}

/**
 * 特徴量重要度
 */
export interface FeatureImportance {
  feature: string;
  importance: number;          // 0.0-1.0
  contribution: number;        // positive/negative
  description?: string;
}

/**
 * 推奨事項
 */
export interface Recommendation {
  id: string;
  type: 'action' | 'configuration' | 'investigation' | 'prevention';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actions: RecommendedAction[];
  confidence: number;
  rationale: string;
  estimatedImpact: ImpactAssessment;
}

/**
 * 推奨アクション
 */
export interface RecommendedAction {
  type: 'block' | 'allow' | 'monitor' | 'investigate' | 'configure' | 'update' | 'notify';
  target: string;
  parameters: Record<string, any>;
  automation: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * インパクト評価
 */
export interface ImpactAssessment {
  security: 'low' | 'medium' | 'high';
  performance: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
  usability: 'low' | 'medium' | 'high';
  compliance: 'low' | 'medium' | 'high';
}

/**
 * 説明情報
 */
export interface Explanation {
  method: 'lime' | 'shap' | 'attention' | 'gradcam' | 'integrated_gradients' | 'rule_based';
  summary: string;
  details: ExplanationDetail[];
  visualizations?: Visualization[];
  confidence: number;
}

/**
 * 説明詳細
 */
export interface ExplanationDetail {
  factor: string;
  contribution: number;        // -1.0 to 1.0
  description: string;
  evidence?: string[];
  references?: string[];
}

/**
 * 可視化
 */
export interface Visualization {
  type: 'chart' | 'heatmap' | 'decision_tree' | 'attention_map' | 'feature_plot';
  title: string;
  data: any;
  format: 'svg' | 'png' | 'json' | 'html';
  interactive: boolean;
}

/**
 * リソース使用量
 */
export interface ResourceUsage {
  cpu: number;                 // percentage
  memory: number;              // MB
  gpu?: number;                // percentage
  networkIO: number;           // MB
  diskIO: number;              // MB
  duration: number;            // milliseconds
}

/**
 * モデル学習ジョブ
 */
export interface ModelTrainingJob {
  id: string;
  modelId: string;
  name: string;
  type: 'initial' | 'retraining' | 'fine_tuning' | 'transfer_learning';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  
  // データ設定
  dataset: {
    trainingData: DataSource;
    validationData?: DataSource;
    testData?: DataSource;
    preprocessing: PreprocessingStep[];
    augmentation?: DataAugmentation[];
  };
  
  // 学習設定
  training: {
    algorithm: string;
    hyperparameters: Record<string, any>;
    earlyStoppingCriteria?: EarlyStoppingCriteria;
    checkpointing: CheckpointingConfig;
    distributedTraining: boolean;
  };
  
  // 進捗情報
  progress: {
    currentEpoch: number;
    totalEpochs: number;
    completionPercentage: number;
    estimatedTimeRemaining: number; // minutes
    metrics: TrainingMetrics;
  };
  
  // 結果
  results?: {
    finalMetrics: ModelMetrics;
    bestMetrics: ModelMetrics;
    modelArtifacts: ModelArtifact[];
    evaluationReport: EvaluationReport;
  };
  
  // リソース
  resources: {
    computeType: 'cpu' | 'gpu' | 'tpu';
    instanceType: string;
    instanceCount: number;
    maxDuration: number;        // hours
    estimatedCost: number;
  };
  
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * データソース
 */
export interface DataSource {
  type: 'file' | 'database' | 'stream' | 'api' | 's3' | 'gcs' | 'azure_blob';
  location: string;
  format: 'csv' | 'json' | 'parquet' | 'avro' | 'tf_record';
  size: number;               // bytes
  recordCount: number;
  schema: any;
  quality: DataQuality;
  encryption?: EncryptionConfig;
}

/**
 * データ品質
 */
export interface DataQuality {
  completeness: number;       // 0.0-1.0
  accuracy: number;           // 0.0-1.0
  consistency: number;        // 0.0-1.0
  uniqueness: number;         // 0.0-1.0
  validity: number;           // 0.0-1.0
  issues: DataQualityIssue[];
}

/**
 * データ品質問題
 */
export interface DataQualityIssue {
  type: 'missing_values' | 'duplicates' | 'outliers' | 'format_errors' | 'inconsistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  percentage: number;
  description: string;
  suggestedFix?: string;
}

/**
 * データ拡張
 */
export interface DataAugmentation {
  type: 'rotation' | 'scaling' | 'noise_injection' | 'synthetic_generation' | 'oversampling' | 'undersampling';
  parameters: Record<string, any>;
  probability: number;        // 0.0-1.0
  enabled: boolean;
}

/**
 * 早期停止基準
 */
export interface EarlyStoppingCriteria {
  metric: string;
  patience: number;           // epochs
  minDelta: number;
  mode: 'min' | 'max';
  enabled: boolean;
}

/**
 * チェックポイント設定
 */
export interface CheckpointingConfig {
  enabled: boolean;
  frequency: number;          // epochs
  saveOptimizer: boolean;
  maxCheckpoints: number;
  cloudStorage: boolean;
}

/**
 * 学習メトリクス
 */
export interface TrainingMetrics {
  loss: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
  mae?: number;              // Mean Absolute Error
  mse?: number;              // Mean Squared Error
  rmse?: number;             // Root Mean Squared Error
  customMetrics?: Record<string, number>;
  validationMetrics?: Record<string, number>;
}

/**
 * モデルメトリクス
 */
export interface ModelMetrics {
  overall: TrainingMetrics;
  perClass?: Record<string, TrainingMetrics>;
  confusionMatrix?: number[][];
  rocCurve?: { fpr: number[]; tpr: number[]; thresholds: number[] };
  prCurve?: { precision: number[]; recall: number[]; thresholds: number[] };
  calibration?: CalibrationMetrics;
  fairness?: FairnessMetrics;
}

/**
 * キャリブレーションメトリクス
 */
export interface CalibrationMetrics {
  reliability: number;        // 0.0-1.0
  calibrationError: number;
  calibrationCurve: { meanPredicted: number[]; meanTrue: number[] };
}

/**
 * 公平性メトリクス
 */
export interface FairnessMetrics {
  demographicParity: number;
  equalizedOdds: number;
  equalOpportunity: number;
  calibrationDifference: number;
  groups: Record<string, TrainingMetrics>;
}

/**
 * モデルアーティファクト
 */
export interface ModelArtifact {
  type: 'model' | 'weights' | 'tokenizer' | 'preprocessor' | 'metadata';
  format: 'pickle' | 'onnx' | 'tensorflow' | 'pytorch' | 'huggingface' | 'json';
  path: string;
  size: number;               // bytes
  checksum: string;
  version: string;
}

/**
 * 評価レポート
 */
export interface EvaluationReport {
  summary: {
    overallScore: number;     // 0.0-1.0
    recommendation: 'deploy' | 'retrain' | 'tune' | 'reject';
    strengths: string[];
    weaknesses: string[];
  };
  
  performance: {
    accuracy: ModelMetrics;
    robustness: RobustnessMetrics;
    efficiency: EfficiencyMetrics;
    interpretability: InterpretabilityMetrics;
  };
  
  quality: {
    dataQuality: DataQuality;
    modelQuality: ModelQualityMetrics;
    deploymentReadiness: DeploymentReadiness;
  };
  
  risks: {
    biasRisk: 'low' | 'medium' | 'high';
    privacyRisk: 'low' | 'medium' | 'high';
    securityRisk: 'low' | 'medium' | 'high';
    operationalRisk: 'low' | 'medium' | 'high';
    mitigations: RiskMitigation[];
  };
  
  recommendations: Recommendation[];
  generatedAt: Date;
}

/**
 * 堅牢性メトリクス
 */
export interface RobustnessMetrics {
  adversarialRobustness: number;  // 0.0-1.0
  noiseRobustness: number;        // 0.0-1.0
  distributionShift: number;      // 0.0-1.0
  outOfDistribution: number;      // 0.0-1.0
}

/**
 * 効率性メトリクス
 */
export interface EfficiencyMetrics {
  inferenceLatency: number;       // milliseconds
  throughput: number;             // requests/second
  memoryUsage: number;            // MB
  energyConsumption: number;      // watts
  modelSize: number;              // MB
  compressionRatio?: number;
}

/**
 * 解釈可能性メトリクス
 */
export interface InterpretabilityMetrics {
  featureImportanceStability: number;  // 0.0-1.0
  explanationConsistency: number;      // 0.0-1.0
  humanAlignmentScore: number;         // 0.0-1.0
  complexityScore: number;             // 0.0-1.0 (lower is better)
}

/**
 * モデル品質メトリクス
 */
export interface ModelQualityMetrics {
  stability: number;              // 0.0-1.0
  reproducibility: number;        // 0.0-1.0
  generalization: number;         // 0.0-1.0
  confidence: number;             // 0.0-1.0
  uncertainty: number;            // 0.0-1.0
}

/**
 * デプロイメント準備状況
 */
export interface DeploymentReadiness {
  technical: number;              // 0.0-1.0
  operational: number;            // 0.0-1.0
  compliance: number;             // 0.0-1.0
  monitoring: number;             // 0.0-1.0
  overall: number;                // 0.0-1.0
  blockers: string[];
}

/**
 * リスク軽減策
 */
export interface RiskMitigation {
  risk: string;
  mitigation: string;
  implementation: string;
  effectiveness: number;         // 0.0-1.0
  cost: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 暗号化設定
 */
export interface EncryptionConfig {
  algorithm: string;
  keyId: string;
  encryptInTransit: boolean;
  encryptAtRest: boolean;
}

/**
 * AIパイプライン
 */
export interface AiPipeline {
  id: string;
  name: string;
  description: string;
  type: 'training' | 'inference' | 'data_processing' | 'model_serving' | 'mlops';
  
  stages: PipelineStage[];
  dependencies: PipelineDependency[];
  
  // 実行設定
  execution: {
    trigger: 'manual' | 'scheduled' | 'event_driven' | 'continuous';
    schedule?: string;          // cron expression
    parallelism: number;
    timeout: number;            // minutes
    retryPolicy: RetryPolicy;
  };
  
  // 監視設定
  monitoring: {
    enabled: boolean;
    alerting: AlertingConfig;
    logging: LoggingConfig;
    metrics: MetricsConfig;
  };
  
  status: 'draft' | 'active' | 'paused' | 'deprecated';
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * パイプラインステージ
 */
export interface PipelineStage {
  id: string;
  name: string;
  type: 'data_ingestion' | 'preprocessing' | 'training' | 'validation' | 'deployment' | 'monitoring';
  component: string;
  configuration: Record<string, any>;
  resources: ResourceRequirement;
  order: number;
  enabled: boolean;
}

/**
 * パイプライン依存関係
 */
export interface PipelineDependency {
  from: string;               // stage id
  to: string;                 // stage id
  condition?: 'success' | 'failure' | 'completion';
  data?: DataFlow[];
}

/**
 * データフロー
 */
export interface DataFlow {
  source: string;
  target: string;
  format: string;
  validation?: ValidationRule[];
}

/**
 * リトライポリシー
 */
export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;       // seconds
  maxDelay: number;           // seconds
  jitter: boolean;
}

/**
 * アラート設定
 */
export interface AlertingConfig {
  enabled: boolean;
  channels: ('email' | 'slack' | 'webhook' | 'sms')[];
  rules: AlertRule[];
  escalation: EscalationPolicy;
}

/**
 * アラートルール
 */
export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
}

/**
 * エスカレーションポリシー
 */
export interface EscalationPolicy {
  levels: EscalationLevel[];
  timeout: number;            // minutes
}

/**
 * エスカレーションレベル
 */
export interface EscalationLevel {
  level: number;
  recipients: string[];
  delay: number;              // minutes
}

/**
 * ログ設定
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warning' | 'error';
  destinations: ('console' | 'file' | 'elasticsearch' | 'cloudwatch')[];
  retention: number;          // days
  structured: boolean;
}

/**
 * メトリクス設定
 */
export interface MetricsConfig {
  enabled: boolean;
  collection: ('system' | 'application' | 'business')[];
  retention: number;          // days
  aggregation: AggregationConfig;
}

/**
 * 集約設定
 */
export interface AggregationConfig {
  intervals: ('1m' | '5m' | '15m' | '1h' | '1d')[];
  functions: ('avg' | 'sum' | 'min' | 'max' | 'count' | 'percentile')[];
}

/**
 * リソース要件
 */
export interface ResourceRequirement {
  cpu: string;                // e.g., "2" or "500m"
  memory: string;             // e.g., "4Gi"
  gpu?: string;               // e.g., "1"
  storage: string;            // e.g., "100Gi"
  networkBandwidth?: string;  // e.g., "1Gbps"
}

/**
 * AI自動化ルール
 */
export interface AiAutomationRule {
  id: string;
  name: string;
  description: string;
  type: 'security' | 'performance' | 'compliance' | 'optimization' | 'maintenance';
  
  // トリガー条件
  trigger: {
    event: string;
    conditions: AutomationCondition[];
    frequency: 'immediate' | 'scheduled' | 'threshold_based';
    schedule?: string;
  };
  
  // アクション
  actions: AutomationAction[];
  
  // AI分析設定
  aiAnalysis: {
    enabled: boolean;
    modelId?: string;
    confidenceThreshold: number;
    explainabilityRequired: boolean;
    humanApprovalRequired: boolean;
  };
  
  // 実行状況
  execution: {
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    runCount: number;
    successCount: number;
    failureCount: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 自動化条件
 */
export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex' | 'ai_prediction';
  value: any;
  aiModelId?: string;
}

/**
 * 自動化アクション
 */
export interface AutomationAction {
  type: 'block_domain' | 'allow_domain' | 'notify_admin' | 'create_ticket' | 'update_config' | 'run_analysis' | 'ai_decision';
  parameters: Record<string, any>;
  order: number;
  conditional: boolean;
  aiAssisted: boolean;
  humanApproval: boolean;
}

/**
 * スマート分析結果
 */
export interface SmartAnalysisResult {
  id: string;
  type: AiAnalysisType;
  input: {
    data: any;
    timestamp: Date;
    source: string;
  };
  
  // AI分析結果
  analysis: {
    predictions: Prediction[];
    insights: Insight[];
    anomalies: Anomaly[];
    patterns: Pattern[];
    trends: Trend[];
  };
  
  // 推奨事項
  recommendations: Recommendation[];
  
  // 自動化
  automation: {
    triggered: AutomationAction[];
    pending: AutomationAction[];
    blocked: AutomationAction[];
  };
  
  // メタデータ
  metadata: {
    modelVersions: Record<string, string>;
    processingTime: number;
    confidence: ConfidenceLevel;
    explanation?: Explanation;
    dataQuality: DataQuality;
  };
  
  createdAt: Date;
}

/**
 * インサイト
 */
export interface Insight {
  id: string;
  type: 'security' | 'performance' | 'cost' | 'usage' | 'trend' | 'anomaly';
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;         // 0.0-1.0
  impact: ImpactAssessment;
  evidence: Evidence[];
  actionable: boolean;
  relatedInsights: string[];  // insight IDs
}

/**
 * 証拠
 */
export interface Evidence {
  type: 'metric' | 'log' | 'pattern' | 'correlation' | 'comparison';
  data: any;
  source: string;
  timestamp: Date;
  relevance: number;          // 0.0-1.0
}

/**
 * 異常
 */
export interface Anomaly {
  id: string;
  type: 'statistical' | 'pattern' | 'behavior' | 'threshold' | 'ai_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  
  // 異常データ
  data: {
    observed: any;
    expected: any;
    deviation: number;
    threshold: number;
    metric: string;
  };
  
  // 検出情報
  detection: {
    method: string;
    modelId?: string;
    confidence: number;
    timestamp: Date;
    duration?: number;        // seconds
  };
  
  // 影響分析
  impact: {
    affectedSystems: string[];
    estimatedLoss?: number;
    userImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
    businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  };
  
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

/**
 * パターン
 */
export interface Pattern {
  id: string;
  type: 'temporal' | 'spatial' | 'frequency' | 'correlation' | 'sequence' | 'cluster';
  name: string;
  description: string;
  
  // パターンデータ
  pattern: {
    signature: any;
    frequency: number;
    strength: number;          // 0.0-1.0
    stability: number;         // 0.0-1.0
    duration: number;          // seconds
  };
  
  // 発見情報
  discovery: {
    method: string;
    modelId?: string;
    firstSeen: Date;
    lastSeen: Date;
    occurrences: number;
  };
  
  // 予測
  prediction: {
    nextOccurrence?: Date;
    confidence: number;
    likelihood: number;        // 0.0-1.0
  };
  
  significance: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * トレンド
 */
export interface Trend {
  id: string;
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'oscillating';
  magnitude: number;          // rate of change
  
  // 統計情報
  statistics: {
    slope: number;
    correlation: number;       // -1.0 to 1.0
    pValue: number;
    confidence: number;        // 0.0-1.0
    duration: number;          // days
  };
  
  // 予測
  forecast: {
    values: number[];
    timestamps: Date[];
    confidence: number[];
    horizon: number;           // days
  };
  
  // 影響分析
  drivers: TrendDriver[];
  implications: string[];
  significance: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * トレンド要因
 */
export interface TrendDriver {
  factor: string;
  correlation: number;        // -1.0 to 1.0
  contribution: number;       // 0.0-1.0
  confidence: number;         // 0.0-1.0
  explanation: string;
}