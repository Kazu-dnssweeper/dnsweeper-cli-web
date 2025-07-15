/**
 * DNSweeper IoT・エッジ統合型定義
 * IoTデバイス・エッジコンピューティング・センサー・オートメーション・スマートシティ
 */

/**
 * IoTデバイスタイプ
 */
export type IoTDeviceType = 
  | 'router'                 // ルーター
  | 'switch'                 // スイッチ
  | 'access_point'           // アクセスポイント
  | 'gateway'                // ゲートウェイ
  | 'sensor'                 // センサー
  | 'camera'                 // カメラ
  | 'speaker'                // スピーカー
  | 'display'                // ディスプレイ
  | 'smart_tv'               // スマートTV
  | 'smart_light'            // スマートライト
  | 'smart_lock'             // スマートロック
  | 'smart_thermostat'       // スマートサーモスタット
  | 'smart_plug'             // スマートプラグ
  | 'security_system'        // セキュリティシステム
  | 'hvac'                   // 空調システム
  | 'industrial_controller'  // 産業用コントローラー
  | 'vehicle'                // 車両
  | 'drone'                  // ドローン
  | 'robot'                  // ロボット
  | 'wearable'               // ウェアラブル
  | 'medical_device'         // 医療機器
  | 'environmental_monitor'  // 環境モニター
  | 'smart_meter'            // スマートメーター
  | 'tracking_device'        // 追跡デバイス
  | 'beacon'                 // ビーコン
  | 'edge_server'            // エッジサーバー
  | 'edge_gateway'           // エッジゲートウェイ
  | 'fog_node'               // フォグノード
  | 'micro_data_center'      // マイクロデータセンター
  | 'custom';                // カスタム

/**
 * 通信プロトコル
 */
export type CommunicationProtocol = 
  | 'wifi'                   // Wi-Fi
  | 'ethernet'               // イーサネット
  | 'bluetooth'              // Bluetooth
  | 'zigbee'                 // ZigBee
  | 'z_wave'                 // Z-Wave
  | 'lora'                   // LoRa
  | 'lorawan'                // LoRaWAN
  | 'sigfox'                 // Sigfox
  | 'nb_iot'                 // NB-IoT
  | 'lte_m'                  // LTE-M
  | 'cellular_2g'            // 2G
  | 'cellular_3g'            // 3G
  | 'cellular_4g'            // 4G
  | 'cellular_5g'            // 5G
  | 'satellite'              // 衛星通信
  | 'mesh'                   // メッシュネットワーク
  | 'thread'                 // Thread
  | 'matter'                 // Matter
  | 'modbus'                 // Modbus
  | 'can_bus'                // CANバス
  | 'profinet'               // PROFINET
  | 'opcua'                  // OPC UA
  | 'mqtt'                   // MQTT
  | 'coap'                   // CoAP
  | 'http'                   // HTTP/HTTPS
  | 'websocket'              // WebSocket
  | 'serial'                 // シリアル通信
  | 'i2c'                    // I2C
  | 'spi'                    // SPI
  | 'uart'                   // UART
  | 'usb'                    // USB
  | 'nfc'                    // NFC
  | 'rfid';                  // RFID

/**
 * センサータイプ
 */
export type SensorType = 
  | 'temperature'            // 温度
  | 'humidity'               // 湿度
  | 'pressure'               // 気圧
  | 'light'                  // 照度
  | 'motion'                 // モーション
  | 'proximity'              // 近接
  | 'accelerometer'          // 加速度
  | 'gyroscope'              // ジャイロスコープ
  | 'magnetometer'           // 磁力
  | 'gps'                    // GPS
  | 'air_quality'            // 空気品質
  | 'sound'                  // 音
  | 'vibration'              // 振動
  | 'smoke'                  // 煙
  | 'gas'                    // ガス
  | 'ph'                     // pH
  | 'conductivity'           // 電気伝導度
  | 'turbidity'              // 濁度
  | 'flow'                   // 流量
  | 'level'                  // 液面
  | 'strain'                 // ひずみ
  | 'force'                  // 力
  | 'torque'                 // トルク
  | 'voltage'                // 電圧
  | 'current'                // 電流
  | 'power'                  // 電力
  | 'frequency'              // 周波数
  | 'radiation'              // 放射線
  | 'camera'                 // カメラ
  | 'microphone'             // マイクロフォン
  | 'lidar'                  // LiDAR
  | 'radar'                  // レーダー
  | 'ultrasonic'             // 超音波
  | 'infrared'               // 赤外線
  | 'weight'                 // 重量
  | 'custom';                // カスタム

/**
 * エッジコンピューティングタイプ
 */
export type EdgeComputingType = 
  | 'edge_server'            // エッジサーバー
  | 'edge_gateway'           // エッジゲートウェイ
  | 'fog_node'               // フォグノード
  | 'cloudlet'               // クラウドレット
  | 'micro_data_center'      // マイクロデータセンター
  | 'mobile_edge'            // モバイルエッジ
  | 'cdn_edge'               // CDNエッジ
  | 'industrial_edge'        // 産業用エッジ
  | 'automotive_edge'        // 自動車エッジ
  | 'smart_city_edge'        // スマートシティエッジ
  | 'home_edge'              // ホームエッジ
  | 'retail_edge'            // 小売エッジ
  | 'healthcare_edge'        // ヘルスケアエッジ
  | 'agricultural_edge'      // 農業エッジ
  | 'energy_edge'            // エネルギーエッジ
  | 'telecommunications_edge'; // 通信エッジ

/**
 * データ処理タイプ
 */
export type DataProcessingType = 
  | 'real_time'              // リアルタイム
  | 'near_real_time'         // ニアリアルタイム
  | 'batch'                  // バッチ
  | 'stream'                 // ストリーム
  | 'event_driven'           // イベント駆動
  | 'scheduled'              // スケジュール
  | 'on_demand'              // オンデマンド
  | 'continuous'             // 継続的
  | 'periodic'               // 定期的
  | 'threshold_based'        // 閾値ベース
  | 'ml_inference'           // 機械学習推論
  | 'complex_event';         // 複合イベント

/**
 * IoTデバイス
 */
export interface IoTDevice {
  id: string;
  name: string;
  type: IoTDeviceType;
  manufacturer: string;
  model: string;
  version: string;
  serialNumber: string;
  macAddress?: string;
  
  // ネットワーク設定
  network: {
    ipAddress?: string;
    subnetMask?: string;
    gateway?: string;
    dnsServers: string[];
    hostname: string;
    domainName?: string;
    protocols: CommunicationProtocol[];
    primaryProtocol: CommunicationProtocol;
    portMappings: PortMapping[];
  };
  
  // 物理的特性
  physical: {
    location: DeviceLocation;
    powerSource: 'battery' | 'wired' | 'solar' | 'hybrid';
    batteryLevel?: number;    // 0-100
    signalStrength?: number;  // -100 to 0 dBm
    temperature?: number;     // Celsius
    humidity?: number;        // 0-100%
    operatingConditions: OperatingConditions;
  };
  
  // センサー設定
  sensors: DeviceSensor[];
  
  // アクチュエータ設定
  actuators: DeviceActuator[];
  
  // 設定
  configuration: {
    samplingRate: number;     // Hz
    reportingInterval: number; // seconds
    dataRetention: number;    // days
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
    authenticationRequired: boolean;
    certificateAuthentication: boolean;
    firmwareAutoUpdate: boolean;
    remoteManagementEnabled: boolean;
  };
  
  // セキュリティ
  security: {
    encryptionMethod: 'none' | 'aes128' | 'aes256' | 'rsa' | 'ecc';
    certificateId?: string;
    lastSecurityScan?: Date;
    vulnerabilities: SecurityVulnerability[];
    securityLevel: 'low' | 'medium' | 'high' | 'critical';
    accessControlList: string[];
    firewallRules: FirewallRule[];
  };
  
  // 監視・統計
  monitoring: {
    status: 'online' | 'offline' | 'error' | 'maintenance' | 'sleep';
    lastSeen: Date;
    uptime: number;           // seconds
    dataTransmitted: number;  // bytes
    dataReceived: number;     // bytes
    errorCount: number;
    performanceMetrics: PerformanceMetrics;
    healthScore: number;      // 0-100
  };
  
  // エッジコンピューティング
  edge: {
    computingCapability: boolean;
    processingPower: number;  // GHz
    memory: number;           // MB
    storage: number;          // GB
    aiAcceleration: boolean;
    containerSupport: boolean;
    kubernetesSupport: boolean;
    edgeApplications: EdgeApplication[];
  };
  
  // 管理情報
  management: {
    owner: string;
    adminContact: string;
    installationDate: Date;
    warrantyExpiration?: Date;
    maintenanceSchedule: MaintenanceSchedule[];
    supportContract?: string;
    complianceStandards: string[];
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * デバイス位置
 */
export interface DeviceLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  address?: string;
  building?: string;
  floor?: string;
  room?: string;
  zone?: string;
  geoHash?: string;
  timezone: string;
}

/**
 * 動作条件
 */
export interface OperatingConditions {
  temperatureRange: {
    min: number;              // Celsius
    max: number;              // Celsius
  };
  humidityRange: {
    min: number;              // percentage
    max: number;              // percentage
  };
  ipRating?: string;          // IP65, IP67, etc.
  dustResistance: boolean;
  waterResistance: boolean;
  shockResistance: boolean;
  vibrationResistance: boolean;
}

/**
 * ポートマッピング
 */
export interface PortMapping {
  protocol: 'tcp' | 'udp';
  internalPort: number;
  externalPort: number;
  description?: string;
  enabled: boolean;
}

/**
 * デバイスセンサー
 */
export interface DeviceSensor {
  id: string;
  type: SensorType;
  name: string;
  unit: string;
  range: {
    min: number;
    max: number;
  };
  accuracy: number;
  resolution: number;
  samplingRate: number;     // Hz
  calibrationDate?: Date;
  enabled: boolean;
  configuration: Record<string, any>;
}

/**
 * デバイスアクチュエータ
 */
export interface DeviceActuator {
  id: string;
  type: 'motor' | 'valve' | 'relay' | 'servo' | 'led' | 'speaker' | 'heater' | 'cooler' | 'pump' | 'custom';
  name: string;
  controlType: 'digital' | 'analog' | 'pwm';
  range?: {
    min: number;
    max: number;
  };
  enabled: boolean;
  currentState: any;
  configuration: Record<string, any>;
}

/**
 * セキュリティ脆弱性
 */
export interface SecurityVulnerability {
  id: string;
  type: 'firmware' | 'configuration' | 'network' | 'authentication' | 'encryption' | 'privilege';
  severity: 'low' | 'medium' | 'high' | 'critical';
  cveId?: string;
  description: string;
  discoveredDate: Date;
  fixAvailable: boolean;
  fixVersion?: string;
  mitigations: string[];
  status: 'open' | 'mitigated' | 'fixed' | 'accepted_risk';
}

/**
 * ファイアウォールルール
 */
export interface FirewallRule {
  id: string;
  name: string;
  action: 'allow' | 'deny' | 'drop';
  direction: 'inbound' | 'outbound' | 'both';
  protocol: 'tcp' | 'udp' | 'icmp' | 'any';
  sourceAddress?: string;
  sourcePort?: number;
  destinationAddress?: string;
  destinationPort?: number;
  enabled: boolean;
  priority: number;
  description?: string;
}

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  cpuUsage: number;         // percentage
  memoryUsage: number;      // percentage
  storageUsage: number;     // percentage
  networkLatency: number;   // milliseconds
  throughput: number;       // bytes/second
  errorRate: number;        // percentage
  responseTime: number;     // milliseconds
  availability: number;     // percentage
  powerConsumption: number; // watts
}

/**
 * エッジアプリケーション
 */
export interface EdgeApplication {
  id: string;
  name: string;
  type: 'container' | 'vm' | 'function' | 'microservice' | 'native';
  version: string;
  status: 'running' | 'stopped' | 'error' | 'updating';
  
  // リソース要件
  resources: {
    cpu: number;            // cores
    memory: number;         // MB
    storage: number;        // GB
    gpu?: boolean;
    networkBandwidth: number; // Mbps
  };
  
  // 設定
  configuration: {
    environmentVariables: Record<string, string>;
    ports: PortMapping[];
    volumes: VolumeMount[];
    networks: string[];
    autoRestart: boolean;
    healthCheck: HealthCheck;
  };
  
  // 監視
  monitoring: {
    logs: LogConfiguration;
    metrics: MetricConfiguration;
    alerts: AlertConfiguration;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ボリュームマウント
 */
export interface VolumeMount {
  source: string;
  target: string;
  type: 'bind' | 'volume' | 'tmpfs';
  readOnly: boolean;
}

/**
 * ヘルスチェック
 */
export interface HealthCheck {
  enabled: boolean;
  endpoint?: string;
  interval: number;         // seconds
  timeout: number;          // seconds
  retries: number;
  command?: string[];
}

/**
 * ログ設定
 */
export interface LogConfiguration {
  enabled: boolean;
  level: 'debug' | 'info' | 'warning' | 'error';
  maxSize: number;          // MB
  maxFiles: number;
  format: 'json' | 'text';
  destination: 'local' | 'remote' | 'both';
  remoteEndpoint?: string;
}

/**
 * メトリクス設定
 */
export interface MetricConfiguration {
  enabled: boolean;
  interval: number;         // seconds
  metrics: string[];
  destination: 'local' | 'remote' | 'both';
  remoteEndpoint?: string;
}

/**
 * アラート設定
 */
export interface AlertConfiguration {
  enabled: boolean;
  rules: AlertRule[];
  channels: string[];
}

/**
 * アラートルール
 */
export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  duration: number;         // seconds
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
}

/**
 * メンテナンススケジュール
 */
export interface MaintenanceSchedule {
  id: string;
  type: 'firmware_update' | 'security_patch' | 'calibration' | 'cleaning' | 'inspection' | 'replacement';
  name: string;
  description?: string;
  scheduledDate: Date;
  estimatedDuration: number; // minutes
  responsible: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  completedDate?: Date;
  notes?: string;
}

/**
 * IoTネットワーク
 */
export interface IoTNetwork {
  id: string;
  name: string;
  type: 'mesh' | 'star' | 'tree' | 'ring' | 'hybrid';
  protocol: CommunicationProtocol;
  
  // ネットワーク設定
  configuration: {
    networkId: string;
    frequency: number;        // MHz
    channel: number;
    transmissionPower: number; // dBm
    dataRate: number;         // bps
    range: number;            // meters
    encryptionKey?: string;
    meshRouting: boolean;
    autoScaling: boolean;
  };
  
  // 接続デバイス
  devices: string[];          // device IDs
  
  // ネットワーク統計
  statistics: {
    totalDevices: number;
    activeDevices: number;
    offlineDevices: number;
    totalTraffic: number;     // bytes
    averageLatency: number;   // milliseconds
    packetLoss: number;       // percentage
    networkUtilization: number; // percentage
    lastUpdate: Date;
  };
  
  // ネットワーク品質
  quality: {
    signalQuality: number;    // percentage
    connectionStability: number; // percentage
    throughputConsistency: number; // percentage
    coverageArea: number;     // square meters
    interferenceLevel: number; // percentage
  };
  
  // セキュリティ
  security: {
    encryptionEnabled: boolean;
    authenticationMethod: 'none' | 'psk' | 'certificate' | 'wpa2' | 'wpa3';
    accessControlEnabled: boolean;
    intrusionDetectionEnabled: boolean;
    lastSecurityAudit?: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * エッジコンピューティングノード
 */
export interface EdgeComputingNode {
  id: string;
  name: string;
  type: EdgeComputingType;
  location: DeviceLocation;
  
  // ハードウェア仕様
  hardware: {
    cpu: {
      model: string;
      cores: number;
      frequency: number;      // GHz
      architecture: 'x86_64' | 'arm64' | 'armv7';
    };
    memory: {
      total: number;          // GB
      type: 'DDR4' | 'DDR5' | 'LPDDR4' | 'LPDDR5';
      speed: number;          // MHz
    };
    storage: {
      total: number;          // GB
      type: 'hdd' | 'ssd' | 'nvme' | 'emmc';
      interface: 'sata' | 'nvme' | 'usb' | 'emmc';
    };
    gpu?: {
      model: string;
      memory: number;         // GB
      computeUnits: number;
    };
    accelerators: HardwareAccelerator[];
    network: NetworkInterface[];
    power: {
      consumption: number;    // watts
      efficiency: number;     // performance/watt
      ups: boolean;
      backup: boolean;
    };
  };
  
  // ソフトウェア環境
  software: {
    operatingSystem: {
      name: string;
      version: string;
      kernel: string;
      architecture: string;
    };
    runtime: {
      docker: boolean;
      kubernetes: boolean;
      containerd: boolean;
      podman: boolean;
    };
    frameworks: {
      tensorflow: boolean;
      pytorch: boolean;
      opencv: boolean;
      ros: boolean;
      nodejs: boolean;
      python: boolean;
    };
  };
  
  // サービス
  services: EdgeService[];
  
  // 接続デバイス
  connectedDevices: string[]; // device IDs
  
  // 負荷分散
  loadBalancing: {
    enabled: boolean;
    algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'ip_hash';
    healthChecks: boolean;
    sticky: boolean;
  };
  
  // 監視
  monitoring: {
    status: 'online' | 'offline' | 'degraded' | 'maintenance';
    lastHeartbeat: Date;
    uptime: number;           // seconds
    resourceUsage: PerformanceMetrics;
    alerts: EdgeAlert[];
    logs: EdgeLog[];
  };
  
  // データ処理
  dataProcessing: {
    capabilities: DataProcessingType[];
    throughput: number;       // operations/second
    latency: number;          // milliseconds
    batchSize: number;
    streamingSupport: boolean;
    mlInferenceSupport: boolean;
    realTimeProcessing: boolean;
  };
  
  // 接続性
  connectivity: {
    cloudConnection: CloudConnection;
    peerConnections: PeerConnection[];
    bandwidthUsage: BandwidthUsage;
    redundancy: boolean;
    failover: FailoverConfiguration;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ハードウェアアクセラレータ
 */
export interface HardwareAccelerator {
  type: 'fpga' | 'asic' | 'npu' | 'vpu' | 'tpu' | 'gpu' | 'dsp';
  model: string;
  computeUnits: number;
  memory: number;           // MB
  powerConsumption: number; // watts
  supportedFrameworks: string[];
}

/**
 * ネットワークインターフェース
 */
export interface NetworkInterface {
  name: string;
  type: 'ethernet' | 'wifi' | 'cellular' | 'bluetooth' | 'zigbee' | 'lora';
  speed: number;            // Mbps
  duplex: 'half' | 'full';
  status: 'up' | 'down' | 'error';
  macAddress: string;
  ipAddress?: string;
  gateway?: string;
  dnsServers: string[];
}

/**
 * エッジサービス
 */
export interface EdgeService {
  id: string;
  name: string;
  type: 'data_processing' | 'ai_inference' | 'storage' | 'networking' | 'security' | 'monitoring';
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  
  // 設定
  configuration: {
    port: number;
    protocol: 'http' | 'https' | 'tcp' | 'udp' | 'mqtt' | 'coap';
    autoStart: boolean;
    restartPolicy: 'always' | 'on_failure' | 'unless_stopped' | 'no';
    dependencies: string[];
    environmentVariables: Record<string, string>;
  };
  
  // リソース
  resources: {
    cpuLimit: number;         // percentage
    memoryLimit: number;      // MB
    storageLimit: number;     // GB
    priority: 'low' | 'normal' | 'high' | 'critical';
  };
  
  // 統計
  statistics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number; // milliseconds
    throughput: number;       // requests/second
    dataProcessed: number;    // bytes
    uptime: number;           // seconds
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * エッジアラート
 */
export interface EdgeAlert {
  id: string;
  type: 'hardware' | 'software' | 'network' | 'security' | 'performance' | 'data';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: Record<string, any>;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
}

/**
 * エッジログ
 */
export interface EdgeLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * クラウド接続
 */
export interface CloudConnection {
  enabled: boolean;
  provider: 'aws' | 'azure' | 'gcp' | 'ibm' | 'alibaba' | 'custom';
  region: string;
  endpoint: string;
  authentication: {
    method: 'api_key' | 'certificate' | 'oauth' | 'iam_role';
    credentials: Record<string, any>;
  };
  encryption: {
    enabled: boolean;
    protocol: 'tls12' | 'tls13';
    certificateValidation: boolean;
  };
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastConnected?: Date;
  connectionQuality: number; // 0-100
}

/**
 * ピア接続
 */
export interface PeerConnection {
  nodeId: string;
  address: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'websocket';
  status: 'connected' | 'disconnected' | 'error';
  latency: number;          // milliseconds
  bandwidth: number;        // Mbps
  lastSeen: Date;
}

/**
 * 帯域幅使用量
 */
export interface BandwidthUsage {
  upload: number;           // bytes
  download: number;         // bytes
  total: number;            // bytes
  period: 'hour' | 'day' | 'week' | 'month';
  limit?: number;           // bytes
  utilizationPercentage: number;
}

/**
 * フェイルオーバー設定
 */
export interface FailoverConfiguration {
  enabled: boolean;
  primaryNode?: string;
  backupNodes: string[];
  healthCheckInterval: number; // seconds
  failoverThreshold: number;   // failed checks
  recoveryThreshold: number;   // successful checks
  automaticFailback: boolean;
  notificationEnabled: boolean;
}

/**
 * IoTデータストリーム
 */
export interface IoTDataStream {
  id: string;
  deviceId: string;
  sensorId: string;
  name: string;
  dataType: 'number' | 'string' | 'boolean' | 'object' | 'array';
  unit?: string;
  
  // ストリーム設定
  configuration: {
    samplingRate: number;     // Hz
    bufferSize: number;       // samples
    compression: 'none' | 'gzip' | 'lz4' | 'snappy';
    format: 'json' | 'csv' | 'avro' | 'protobuf' | 'messagepack';
    retention: number;        // days
    aggregation: AggregationConfiguration;
  };
  
  // 品質管理
  quality: {
    reliability: number;      // percentage
    completeness: number;     // percentage
    accuracy: number;         // percentage
    timeliness: number;       // percentage
    consistency: number;      // percentage
    outlierDetection: boolean;
    validationRules: ValidationRule[];
  };
  
  // 統計
  statistics: {
    totalSamples: number;
    averageValue?: number;
    minValue?: number;
    maxValue?: number;
    standardDeviation?: number;
    lastValue: any;
    lastUpdated: Date;
    trend: 'increasing' | 'decreasing' | 'stable' | 'oscillating';
  };
  
  // アラート
  alerts: DataAlert[];
  
  // 処理
  processing: {
    realTimeAnalysis: boolean;
    anomalyDetection: boolean;
    predictiveAnalysis: boolean;
    edgeProcessing: boolean;
    cloudProcessing: boolean;
    mlModels: string[];       // model IDs
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 集約設定
 */
export interface AggregationConfiguration {
  enabled: boolean;
  functions: ('avg' | 'sum' | 'min' | 'max' | 'count' | 'std' | 'median')[];
  windowSize: number;       // seconds
  windowType: 'sliding' | 'tumbling' | 'session';
  outputRate: number;       // Hz
}

/**
 * バリデーションルール
 */
export interface ValidationRule {
  type: 'range' | 'pattern' | 'enum' | 'custom';
  parameters: Record<string, any>;
  action: 'log' | 'discard' | 'flag' | 'alert';
  enabled: boolean;
}

/**
 * データアラート
 */
export interface DataAlert {
  id: string;
  type: 'threshold' | 'anomaly' | 'missing_data' | 'quality' | 'pattern';
  condition: string;
  threshold?: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  triggered: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

/**
 * IoTオートメーションルール
 */
export interface IoTAutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  
  // トリガー
  triggers: AutomationTrigger[];
  
  // 条件
  conditions: AutomationCondition[];
  
  // アクション
  actions: AutomationAction[];
  
  // スケジュール
  schedule?: {
    type: 'cron' | 'interval' | 'once';
    expression: string;
    timezone: string;
    enabled: boolean;
  };
  
  // 実行履歴
  execution: {
    lastRun?: Date;
    nextRun?: Date;
    runCount: number;
    successCount: number;
    failureCount: number;
    averageExecutionTime: number; // milliseconds
  };
  
  // 設定
  configuration: {
    concurrent: boolean;
    timeout: number;          // seconds
    retryAttempts: number;
    retryDelay: number;       // seconds
    priority: 'low' | 'normal' | 'high' | 'critical';
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * オートメーショントリガー
 */
export interface AutomationTrigger {
  type: 'device_event' | 'sensor_value' | 'time_based' | 'external_api' | 'manual';
  deviceId?: string;
  sensorId?: string;
  eventType?: string;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
  value?: any;
  parameters?: Record<string, any>;
}

/**
 * オートメーション条件
 */
export interface AutomationCondition {
  type: 'device_status' | 'sensor_value' | 'time_range' | 'location' | 'custom';
  deviceId?: string;
  sensorId?: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
  value: any;
  parameters?: Record<string, any>;
}

/**
 * オートメーションアクション
 */
export interface AutomationAction {
  type: 'device_control' | 'notification' | 'data_logging' | 'external_api' | 'script_execution';
  deviceId?: string;
  actuatorId?: string;
  command?: string;
  parameters?: Record<string, any>;
  delay?: number;           // seconds
}

/**
 * スマートシティサービス
 */
export interface SmartCityService {
  id: string;
  name: string;
  category: 'transportation' | 'energy' | 'water' | 'waste' | 'safety' | 'environment' | 'governance' | 'healthcare';
  description?: string;
  
  // サービス設定
  configuration: {
    coverage: GeographicArea;
    serviceLevel: 'basic' | 'standard' | 'premium' | 'enterprise';
    availability: number;     // percentage
    responseTime: number;     // milliseconds
    scalability: 'low' | 'medium' | 'high' | 'auto';
  };
  
  // 接続デバイス・センサー
  infrastructure: {
    devices: string[];        // device IDs
    sensors: string[];        // sensor IDs
    networks: string[];       // network IDs
    edgeNodes: string[];      // edge node IDs
    dataStreams: string[];    // data stream IDs
  };
  
  // データ分析
  analytics: {
    realTimeAnalytics: boolean;
    predictiveAnalytics: boolean;
    anomalyDetection: boolean;
    patternRecognition: boolean;
    aiEnabled: boolean;
    dashboards: ServiceDashboard[];
    reports: ServiceReport[];
  };
  
  // 市民サービス
  citizenServices: {
    mobileApp: boolean;
    webPortal: boolean;
    notifications: boolean;
    feedbackSystem: boolean;
    emergencyServices: boolean;
    publicApi: boolean;
  };
  
  // 統計
  statistics: {
    totalUsers: number;
    activeUsers: number;
    serviceRequests: number;
    averageResponseTime: number; // milliseconds
    satisfactionScore: number;   // 0-100
    costEfficiency: number;      // cost per service unit
  };
  
  // パートナーシップ
  partnerships: {
    publicAgencies: string[];
    privateCompanies: string[];
    universities: string[];
    ngos: string[];
    internationalOrganizations: string[];
  };
  
  status: 'active' | 'inactive' | 'maintenance' | 'pilot' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 地理的エリア
 */
export interface GeographicArea {
  type: 'city' | 'district' | 'neighborhood' | 'block' | 'building' | 'custom';
  name: string;
  boundaries: {
    north: number;          // latitude
    south: number;          // latitude
    east: number;           // longitude
    west: number;           // longitude
  };
  area: number;             // square kilometers
  population?: number;
  density?: number;         // people per square kilometer
}

/**
 * サービスダッシュボード
 */
export interface ServiceDashboard {
  id: string;
  name: string;
  type: 'operational' | 'executive' | 'citizen' | 'maintenance';
  widgets: DashboardWidget[];
  access: 'public' | 'internal' | 'restricted';
  refreshInterval: number;  // seconds
  enabled: boolean;
}

/**
 * ダッシュボードウィジェット
 */
export interface DashboardWidget {
  id: string;
  type: 'chart' | 'map' | 'table' | 'metric' | 'alert' | 'gauge' | 'heatmap';
  title: string;
  dataSource: string;
  configuration: Record<string, any>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  refreshInterval: number;  // seconds
}

/**
 * サービスレポート
 */
export interface ServiceReport {
  id: string;
  name: string;
  type: 'performance' | 'usage' | 'compliance' | 'financial' | 'environmental';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  recipients: string[];
  format: 'pdf' | 'html' | 'csv' | 'json';
  template: string;
  enabled: boolean;
  lastGenerated?: Date;
  nextGeneration?: Date;
}

/**
 * エッジAI推論
 */
export interface EdgeAiInference {
  id: string;
  name: string;
  modelId: string;
  nodeId: string;
  
  // モデル設定
  model: {
    framework: 'tensorflow' | 'pytorch' | 'onnx' | 'tensorrt' | 'openvino' | 'custom';
    version: string;
    inputShape: number[];
    outputShape: number[];
    precision: 'fp32' | 'fp16' | 'int8' | 'int4';
    quantized: boolean;
    optimized: boolean;
  };
  
  // 推論設定
  inference: {
    batchSize: number;
    timeout: number;          // milliseconds
    priority: 'low' | 'normal' | 'high' | 'critical';
    preprocessing: PreprocessingStep[];
    postprocessing: PostprocessingStep[];
  };
  
  // パフォーマンス
  performance: {
    averageLatency: number;   // milliseconds
    throughput: number;       // inferences/second
    accuracy: number;         // percentage
    resourceUtilization: {
      cpu: number;            // percentage
      memory: number;         // percentage
      gpu?: number;           // percentage
    };
  };
  
  // 監視
  monitoring: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number; // milliseconds
    modelDrift: boolean;
    performanceDrift: boolean;
    lastUpdate: Date;
  };
  
  status: 'running' | 'stopped' | 'error' | 'updating';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 前処理ステップ
 */
export interface PreprocessingStep {
  type: 'resize' | 'normalize' | 'standardize' | 'augment' | 'filter' | 'transform';
  parameters: Record<string, any>;
  order: number;
}

/**
 * 後処理ステップ
 */
export interface PostprocessingStep {
  type: 'threshold' | 'nms' | 'softmax' | 'sigmoid' | 'decode' | 'filter';
  parameters: Record<string, any>;
  order: number;
}

/**
 * IoTセキュリティポリシー
 */
export interface IoTSecurityPolicy {
  id: string;
  name: string;
  description?: string;
  version: string;
  
  // 認証・認可
  authentication: {
    required: boolean;
    methods: ('password' | 'certificate' | 'biometric' | 'mfa')[];
    passwordPolicy: PasswordPolicy;
    certificateValidation: boolean;
    sessionTimeout: number;   // minutes
  };
  
  // 暗号化
  encryption: {
    required: boolean;
    algorithms: string[];
    keyManagement: KeyManagementPolicy;
    inTransit: boolean;
    atRest: boolean;
  };
  
  // ネットワークセキュリティ
  network: {
    segmentation: boolean;
    vlan: boolean;
    firewall: boolean;
    intrusionDetection: boolean;
    trafficMonitoring: boolean;
    allowedProtocols: CommunicationProtocol[];
    blockedPorts: number[];
  };
  
  // デバイス管理
  deviceManagement: {
    registrationRequired: boolean;
    whitelistingEnabled: boolean;
    blacklistingEnabled: boolean;
    firmwareUpdatePolicy: FirmwareUpdatePolicy;
    configurationManagement: boolean;
    remotingAccess: RemoteAccessPolicy;
  };
  
  // 監視・監査
  monitoring: {
    enabled: boolean;
    logLevel: 'minimal' | 'standard' | 'verbose' | 'debug';
    realTimeAlerts: boolean;
    anomalyDetection: boolean;
    complianceMonitoring: boolean;
    retentionPeriod: number;  // days
  };
  
  // コンプライアンス
  compliance: {
    standards: string[];      // GDPR, HIPAA, SOX, etc.
    dataGovernance: boolean;
    privacyControls: boolean;
    auditTrail: boolean;
    reportGeneration: boolean;
  };
  
  applicableDevices: string[]; // device type patterns
  enforcementLevel: 'advisory' | 'warning' | 'blocking';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * パスワードポリシー
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  maxAge: number;           // days
  historyCount: number;
  lockoutThreshold: number;
  lockoutDuration: number;  // minutes
}

/**
 * キー管理ポリシー
 */
export interface KeyManagementPolicy {
  keyRotation: boolean;
  rotationInterval: number; // days
  keyEscrow: boolean;
  hardwareSecurityModule: boolean;
  keyDerivation: boolean;
  keyDistribution: 'manual' | 'automatic' | 'certificate_authority';
}

/**
 * ファームウェア更新ポリシー
 */
export interface FirmwareUpdatePolicy {
  automaticUpdates: boolean;
  updateWindow: {
    start: string;          // HH:mm
    end: string;            // HH:mm
    timezone: string;
  };
  stagingEnvironment: boolean;
  rollbackCapability: boolean;
  signatureVerification: boolean;
  approvalRequired: boolean;
}

/**
 * リモートアクセスポリシー
 */
export interface RemoteAccessPolicy {
  enabled: boolean;
  vpnRequired: boolean;
  allowedSources: string[]; // IP addresses/ranges
  sessionTimeOut: number;   // minutes
  sessionRecording: boolean;
  administratorApproval: boolean;
  emergencyAccess: boolean;
}