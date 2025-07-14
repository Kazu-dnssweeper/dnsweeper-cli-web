/**
 * Route53 API 型定義
 */

import type { DNSRecordType, ICSVRecord } from '../../types/index.js';

/**
 * Route53認証設定
 */
export interface Route53Config {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
}

/**
 * Route53 レコード
 */
export interface Route53Record {
  Name: string;
  Type: DNSRecordType;
  TTL?: number;
  ResourceRecords?: Array<{ Value: string }>;
  AliasTarget?: {
    DNSName: string;
    EvaluateTargetHealth: boolean;
    HostedZoneId: string;
  };
  SetIdentifier?: string;
  Weight?: number;
  Region?: string;
  Failover?: 'PRIMARY' | 'SECONDARY';
  GeoLocation?: {
    ContinentCode?: string;
    CountryCode?: string;
    SubdivisionCode?: string;
  };
  HealthCheckId?: string;
}

/**
 * Route53 ホステッドゾーン
 */
export interface Route53HostedZone {
  Id: string;
  Name: string;
  Config: {
    Comment?: string;
    PrivateZone: boolean;
  };
  ResourceRecordSetCount: number;
  CallerReference: string;
}

/**
 * Route53 レコードセット変更
 */
export interface Route53Change {
  Action: 'CREATE' | 'DELETE' | 'UPSERT';
  ResourceRecordSet: Route53Record;
}

/**
 * Route53 レコードセット変更バッチ
 */
export interface Route53ChangeBatch {
  Comment?: string;
  Changes: Route53Change[];
}

/**
 * Route53 変更情報
 */
export interface Route53ChangeInfo {
  Id: string;
  Status: 'PENDING' | 'INSYNC';
  SubmittedAt: string;
  Comment?: string;
}

/**
 * Route53 API応答
 */
export interface Route53Response<T = unknown> {
  data?: T;
  error?: string;
  statusCode?: number;
  requestId?: string;
}

/**
 * Route53 バッチ処理オプション
 */
export interface Route53BatchOptions {
  batchSize?: number;
  maxConcurrency?: number;
  retryCount?: number;
  retryDelay?: number;
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Route53 バッチ処理結果
 */
export interface Route53BatchResult {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    record: ICSVRecord;
    error: string;
  }>;
  changeInfos: Route53ChangeInfo[];
}