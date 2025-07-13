/**
 * DNSweeper マルチアカウント認証・認可システム型定義
 * 
 * 副業開発体制を想定した効率的なマルチテナント対応
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: 'ja' | 'en';
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  emailNotifications: boolean;
  dashboardLayout: 'compact' | 'expanded';
}

export interface Account {
  id: string;
  name: string;
  slug: string; // URL用の短縮名 (例: "example-corp")
  description?: string;
  plan: AccountPlan;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
  billingEmail: string;
  settings: AccountSettings;
  quotas: AccountQuotas;
  usage: AccountUsage;
}

export type AccountPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export type AccountStatus = 'active' | 'suspended' | 'trial' | 'expired';

export interface AccountSettings {
  // DNS設定
  defaultTtl: number;
  allowedRecordTypes: DnsRecordType[];
  maxZones: number;
  
  // セキュリティ設定
  enforceSSO: boolean;
  ipWhitelist: string[];
  apiAccessEnabled: boolean;
  
  // 統合設定
  integrations: {
    cloudflare?: CloudflareIntegration;
    route53?: Route53Integration;
    webhook?: WebhookIntegration;
  };
}

export interface AccountQuotas {
  maxDnsRecords: number;
  maxApiRequestsPerHour: number;
  maxFileUploads: number;
  maxChangeHistoryRetentionDays: number;
  maxUsers: number;
}

export interface AccountUsage {
  currentDnsRecords: number;
  apiRequestsLastHour: number;
  storageUsedBytes: number;
  lastCalculatedAt: Date;
}

export interface CloudflareIntegration {
  apiToken: string; // 暗号化保存
  accountId: string;
  enabled: boolean;
  lastSyncAt?: Date;
}

export interface Route53Integration {
  accessKeyId: string; // 暗号化保存
  secretAccessKey: string; // 暗号化保存
  region: string;
  enabled: boolean;
  lastSyncAt?: Date;
}

export interface WebhookIntegration {
  url: string;
  secret: string; // 暗号化保存
  events: WebhookEvent[];
  enabled: boolean;
}

export type WebhookEvent = 'dns_record_created' | 'dns_record_updated' | 'dns_record_deleted' | 'analysis_completed';

export interface AccountMember {
  id: string;
  accountId: string;
  userId: string;
  role: MemberRole;
  permissions: Permission[];
  invitedAt: Date;
  joinedAt?: Date;
  invitedBy: string; // User ID
  status: MemberStatus;
}

export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer';

export type MemberStatus = 'invited' | 'active' | 'suspended';

export interface Permission {
  resource: PermissionResource;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
}

export type PermissionResource = 'dns_records' | 'account_settings' | 'members' | 'billing' | 'integrations' | 'exports' | 'history';

export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'manage';

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with';
  value: string;
}

export interface DnsRecordType {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'PTR' | 'SRV' | 'CAA';
  enabled: boolean;
}

// セッション・トークン管理
export interface Session {
  id: string;
  userId: string;
  accountId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface ApiKey {
  id: string;
  accountId: string;
  userId: string;
  name: string;
  keyHash: string; // ハッシュ化されたキー
  permissions: Permission[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  isActive: boolean;
}

// 認証リクエスト・レスポンス
export interface LoginRequest {
  email: string;
  password: string;
  accountSlug?: string; // 特定アカウントへのログイン
}

export interface LoginResponse {
  user: User;
  account: Account;
  session: {
    token: string;
    refreshToken: string;
    expiresAt: Date;
  };
  permissions: Permission[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  accountName?: string; // 新規アカウント作成時
}

export interface InviteUserRequest {
  email: string;
  role: MemberRole;
  permissions?: Permission[];
  message?: string;
}

export interface SwitchAccountRequest {
  accountId: string;
}

export interface SwitchAccountResponse {
  account: Account;
  permissions: Permission[];
  session: {
    token: string;
    expiresAt: Date;
  };
}

// 監査ログ
export interface AuditLog {
  id: string;
  accountId: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export type AuditAction = 
  | 'user_login' | 'user_logout' | 'user_invited' | 'user_removed'
  | 'dns_record_created' | 'dns_record_updated' | 'dns_record_deleted'
  | 'account_settings_updated' | 'integration_configured'
  | 'export_created' | 'api_key_created' | 'api_key_revoked';

// エラー定義
export interface AuthError extends Error {
  code: AuthErrorCode;
  details?: Record<string, any>;
}

export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_SUSPENDED'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'SESSION_EXPIRED'
  | 'QUOTA_EXCEEDED'
  | 'USER_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'EMAIL_NOT_VERIFIED';