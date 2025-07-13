/**
 * DNSweeper 権限管理カスタムフック
 * 
 * コンポーネントレベルでの権限チェック・UI制御
 */

import { useAuth } from '../contexts/AuthContext';
import type { PermissionResource, PermissionAction } from '../types/auth';

export interface UsePermissionsResult {
  hasPermission: (resource: PermissionResource, action: PermissionAction) => boolean;
  hasAnyPermission: (permissions: Array<{ resource: PermissionResource; action: PermissionAction }>) => boolean;
  hasAllPermissions: (permissions: Array<{ resource: PermissionResource; action: PermissionAction }>) => boolean;
  canRead: (resource: PermissionResource) => boolean;
  canWrite: (resource: PermissionResource) => boolean;
  canDelete: (resource: PermissionResource) => boolean;
  canManage: (resource: PermissionResource) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  accountPlan: string | null;
  withinQuota: (quotaType: string, currentUsage: number) => boolean;
  account: any;
}

export const usePermissions = (): UsePermissionsResult => {
  const { hasPermission: authHasPermission, account, permissions } = useAuth();

  // 基本的な権限チェック
  const hasPermission = (resource: PermissionResource, action: PermissionAction): boolean => {
    return authHasPermission(resource, action);
  };

  // 複数権限のうち一つでも持っているかチェック
  const hasAnyPermission = (permissionChecks: Array<{ resource: PermissionResource; action: PermissionAction }>): boolean => {
    return permissionChecks.some(({ resource, action }) => hasPermission(resource, action));
  };

  // 複数権限をすべて持っているかチェック
  const hasAllPermissions = (permissionChecks: Array<{ resource: PermissionResource; action: PermissionAction }>): boolean => {
    return permissionChecks.every(({ resource, action }) => hasPermission(resource, action));
  };

  // CRUD操作の便利メソッド
  const canRead = (resource: PermissionResource): boolean => hasPermission(resource, 'read');
  const canWrite = (resource: PermissionResource): boolean => hasPermission(resource, 'create') || hasPermission(resource, 'update');
  const canDelete = (resource: PermissionResource): boolean => hasPermission(resource, 'delete');
  const canManage = (resource: PermissionResource): boolean => hasPermission(resource, 'manage');

  // ロール判定
  const isOwner = hasPermission('account_settings', 'manage') && hasPermission('members', 'manage') && hasPermission('billing', 'manage');
  const isAdmin = hasPermission('account_settings', 'update') && hasPermission('members', 'create');
  const isEditor = hasPermission('dns_records', 'create') && hasPermission('dns_records', 'update') && hasPermission('dns_records', 'delete');
  const isViewer = hasPermission('dns_records', 'read') && !isEditor;

  // プラン情報
  const accountPlan = account?.plan || null;

  // クォータチェック
  const withinQuota = (quotaType: string, currentUsage: number): boolean => {
    if (!account?.quotas) return true;

    const quotaLimits: Record<string, keyof typeof account.quotas> = {
      'dns_records': 'maxDnsRecords',
      'api_requests': 'maxApiRequestsPerHour',
      'file_uploads': 'maxFileUploads',
      'users': 'maxUsers'
    };

    const limitKey = quotaLimits[quotaType];
    if (!limitKey) return true;

    const limit = account.quotas[limitKey];
    return currentUsage < limit;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canRead,
    canWrite,
    canDelete,
    canManage,
    isOwner,
    isAdmin,
    isEditor,
    isViewer,
    accountPlan,
    withinQuota,
    account
  };
};