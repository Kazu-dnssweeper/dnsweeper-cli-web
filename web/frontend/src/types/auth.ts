/**
 * DNSweeper フロントエンド認証型定義
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
  slug: string;
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
  defaultTtl: number;
  allowedRecordTypes: DnsRecordType[];
  maxZones: number;
  enforceSSO: boolean;
  ipWhitelist: string[];
  apiAccessEnabled: boolean;
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
  accountId: string;
  enabled: boolean;
  lastSyncAt?: Date;
}

export interface Route53Integration {
  region: string;
  enabled: boolean;
  lastSyncAt?: Date;
}

export interface WebhookIntegration {
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
}

export type WebhookEvent = 'dns_record_created' | 'dns_record_updated' | 'dns_record_deleted' | 'analysis_completed';

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

// API Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
  accountSlug?: string;
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

export interface AuthContextType {
  user: User | null;
  account: Account | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  getAccounts: () => Promise<Account[]>;
  hasPermission: (resource: PermissionResource, action: PermissionAction) => boolean;
  updateToken: (token: string) => void;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}