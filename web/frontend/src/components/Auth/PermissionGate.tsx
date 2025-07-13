/**
 * DNSweeper 権限ゲートコンポーネント
 * 
 * 権限に基づくUI表示制御・条件分岐レンダリング
 */

import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { PermissionResource, PermissionAction } from '../../types/auth';

interface PermissionGateProps {
  children: React.ReactNode;
  resource?: PermissionResource;
  action?: PermissionAction;
  permissions?: Array<{ resource: PermissionResource; action: PermissionAction }>;
  requireAll?: boolean; // true = すべての権限が必要, false = いずれかの権限で十分
  role?: 'owner' | 'admin' | 'editor' | 'viewer';
  plan?: string | string[];
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
  inverse?: boolean; // 権限がない場合に表示
}

/**
 * 権限ベースの表示制御コンポーネント
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  resource,
  action,
  permissions = [],
  requireAll = true,
  role,
  plan,
  fallback = null,
  loading = null,
  inverse = false
}) => {
  const permissionHooks = usePermissions();

  // ロール判定
  const hasRequiredRole = (): boolean => {
    if (!role) return true;

    switch (role) {
      case 'owner': return permissionHooks.isOwner;
      case 'admin': return permissionHooks.isAdmin || permissionHooks.isOwner;
      case 'editor': return permissionHooks.isEditor || permissionHooks.isAdmin || permissionHooks.isOwner;
      case 'viewer': return permissionHooks.isViewer || permissionHooks.isEditor || permissionHooks.isAdmin || permissionHooks.isOwner;
      default: return true;
    }
  };

  // プラン判定
  const hasRequiredPlan = (): boolean => {
    if (!plan) return true;
    if (!permissionHooks.accountPlan) return false;

    const requiredPlans = Array.isArray(plan) ? plan : [plan];
    return requiredPlans.includes(permissionHooks.accountPlan);
  };

  // 個別権限判定
  const hasIndividualPermission = (): boolean => {
    if (!resource || !action) return true;
    return permissionHooks.hasPermission(resource, action);
  };

  // 複数権限判定
  const hasMultiplePermissions = (): boolean => {
    if (permissions.length === 0) return true;

    return requireAll 
      ? permissionHooks.hasAllPermissions(permissions)
      : permissionHooks.hasAnyPermission(permissions);
  };

  // 総合判定
  const hasAccess = (): boolean => {
    const roleCheck = hasRequiredRole();
    const planCheck = hasRequiredPlan();
    const individualCheck = hasIndividualPermission();
    const multipleCheck = hasMultiplePermissions();

    return roleCheck && planCheck && individualCheck && multipleCheck;
  };

  const shouldShow = inverse ? !hasAccess() : hasAccess();

  if (!shouldShow) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * クォータ制限ベースの表示制御コンポーネント
 */
interface QuotaGateProps {
  children: React.ReactNode;
  quotaType: string;
  currentUsage: number;
  fallback?: React.ReactNode;
  warningThreshold?: number; // 使用率の警告しきい値 (0-1)
  onQuotaExceeded?: () => void;
  onQuotaWarning?: (usage: number, limit: number) => void;
}

export const QuotaGate: React.FC<QuotaGateProps> = ({
  children,
  quotaType,
  currentUsage,
  fallback = null,
  warningThreshold = 0.8,
  onQuotaExceeded,
  onQuotaWarning
}) => {
  const { withinQuota, account } = usePermissions();

  const isWithinQuota = withinQuota(quotaType, currentUsage);

  // 警告しきい値チェック
  React.useEffect(() => {
    if (!account?.quotas) return;

    const quotaLimits: Record<string, keyof typeof account.quotas> = {
      'dns_records': 'maxDnsRecords',
      'api_requests': 'maxApiRequestsPerHour',
      'file_uploads': 'maxFileUploads',
      'users': 'maxUsers'
    };

    const limitKey = quotaLimits[quotaType];
    if (!limitKey) return;

    const limit = account.quotas[limitKey];
    const usageRatio = currentUsage / limit;

    if (!isWithinQuota && onQuotaExceeded) {
      onQuotaExceeded();
    } else if (usageRatio >= warningThreshold && onQuotaWarning) {
      onQuotaWarning(currentUsage, limit);
    }
  }, [currentUsage, quotaType, isWithinQuota, warningThreshold, onQuotaExceeded, onQuotaWarning, account]);

  if (!isWithinQuota) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * 機能フラグベースの表示制御コンポーネント
 */
interface FeatureFlagProps {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ReactNode;
}

export const FeatureFlag: React.FC<FeatureFlagProps> = ({
  children,
  feature,
  fallback = null
}) => {
  const { accountPlan } = usePermissions();

  // プラン別機能制限
  const featureAvailability: Record<string, string[]> = {
    'advanced_analytics': ['professional', 'enterprise'],
    'api_access': ['starter', 'professional', 'enterprise'],
    'custom_integrations': ['professional', 'enterprise'],
    'sso': ['enterprise'],
    'priority_support': ['professional', 'enterprise'],
    'white_label': ['enterprise'],
    'multiple_accounts': ['professional', 'enterprise']
  };

  const availablePlans = featureAvailability[feature] || [];
  const isFeatureEnabled = !accountPlan || availablePlans.includes(accountPlan);

  if (!isFeatureEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * 権限ベースのボタンコンポーネント
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  resource: PermissionResource;
  action: PermissionAction;
  children: React.ReactNode;
  disabledText?: string;
  hideWhenDisabled?: boolean;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  resource,
  action,
  children,
  disabledText = '権限がありません',
  hideWhenDisabled = false,
  disabled: propDisabled,
  title: propTitle,
  ...props
}) => {
  const { hasPermission } = usePermissions();

  const hasRequiredPermission = hasPermission(resource, action);
  const isDisabled = propDisabled || !hasRequiredPermission;

  if (hideWhenDisabled && !hasRequiredPermission) {
    return null;
  }

  return (
    <button
      {...props}
      disabled={isDisabled}
      title={propTitle || (!hasRequiredPermission ? disabledText : undefined)}
    >
      {children}
    </button>
  );
};