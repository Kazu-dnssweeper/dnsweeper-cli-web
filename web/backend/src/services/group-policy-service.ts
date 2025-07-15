/**
 * DNSweeper グループポリシー管理サービス
 * エンタープライズ組織階層・セキュリティポリシー・アクセス制御管理
 */

import {
  GroupPolicy,
  GroupPolicyType,
  GroupPolicyScope,
  GroupPolicySettings,
  PasswordPolicySettings,
  SessionPolicySettings,
  AccessPolicySettings,
  AuditPolicySettings,
  ApplicationPolicySettings,
  NetworkPolicySettings,
  OrganizationUnit,
  SecurityGroup,
  EnterpriseUser,
  Permission,
  PermissionResource,
  PermissionAction
} from '../types/enterprise-auth';

/**
 * グループポリシー管理サービス
 */
export class GroupPolicyService {
  
  /**
   * ポリシーの作成
   */
  async createPolicy(policyData: Partial<GroupPolicy>): Promise<GroupPolicy> {
    // ポリシー設定の検証
    this.validatePolicySettings(policyData.type!, policyData.settings!);
    
    const policy: GroupPolicy = {
      id: this.generatePolicyId(),
      name: policyData.name!,
      description: policyData.description,
      type: policyData.type!,
      scope: policyData.scope!,
      targetOus: policyData.targetOus || [],
      targetGroups: policyData.targetGroups || [],
      settings: policyData.settings!,
      enforced: policyData.enforced || false,
      enabled: policyData.enabled !== undefined ? policyData.enabled : true,
      order: policyData.order || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // データベースに保存
    await this.savePolicyToDatabase(policy);
    
    // 影響を受けるユーザーに適用
    await this.applyPolicyToTargets(policy);
    
    return policy;
  }

  /**
   * ポリシーの更新
   */
  async updatePolicy(policyId: string, updates: Partial<GroupPolicy>): Promise<GroupPolicy> {
    const existingPolicy = await this.getPolicyById(policyId);
    
    if (!existingPolicy) {
      throw new Error('ポリシーが見つかりません');
    }

    // 設定の検証
    if (updates.settings) {
      this.validatePolicySettings(updates.type || existingPolicy.type, updates.settings);
    }

    const updatedPolicy: GroupPolicy = {
      ...existingPolicy,
      ...updates,
      updatedAt: new Date()
    };

    // データベースを更新
    await this.savePolicyToDatabase(updatedPolicy);
    
    // 変更を反映
    await this.applyPolicyToTargets(updatedPolicy);
    
    return updatedPolicy;
  }

  /**
   * ポリシーの削除
   */
  async deletePolicy(policyId: string): Promise<void> {
    const policy = await this.getPolicyById(policyId);
    
    if (!policy) {
      throw new Error('ポリシーが見つかりません');
    }

    // ポリシーを無効化
    await this.removePolicyFromTargets(policy);
    
    // データベースから削除
    await this.deletePolicyFromDatabase(policyId);
  }

  /**
   * ユーザーに適用されるポリシーの取得
   */
  async getUserAppliedPolicies(userId: string): Promise<GroupPolicy[]> {
    const user = await this.getUserById(userId);
    
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    const appliedPolicies: GroupPolicy[] = [];
    
    // ユーザーのOUから継承されるポリシー
    if (user.organizationUnit) {
      const ouPolicies = await this.getOuPolicies(user.organizationUnit.id);
      appliedPolicies.push(...ouPolicies);
    }

    // ユーザーのセキュリティグループから適用されるポリシー
    for (const group of user.securityGroups) {
      const groupPolicies = await this.getGroupPolicies(group.id);
      appliedPolicies.push(...groupPolicies);
    }

    // ポリシーの優先順位でソート（order値の昇順）
    return appliedPolicies
      .filter(policy => policy.enabled)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * 特定ポリシータイプの設定値を取得
   */
  async getPolicyValue(
    userId: string, 
    policyType: GroupPolicyType, 
    settingPath: string
  ): Promise<any> {
    const appliedPolicies = await this.getUserAppliedPolicies(userId);
    
    // ポリシータイプでフィルタ
    const relevantPolicies = appliedPolicies.filter(p => p.type === policyType);
    
    // enforced ポリシーを優先、次に order の順序
    const prioritizedPolicies = relevantPolicies.sort((a, b) => {
      if (a.enforced && !b.enforced) return -1;
      if (!a.enforced && b.enforced) return 1;
      return a.order - b.order;
    });

    // 設定値を検索
    for (const policy of prioritizedPolicies) {
      const value = this.getNestedValue(policy.settings, settingPath);
      if (value !== undefined) {
        return value;
      }
    }

    return null;
  }

  /**
   * ポリシー競合の検出
   */
  async detectPolicyConflicts(userId: string): Promise<PolicyConflict[]> {
    const appliedPolicies = await this.getUserAppliedPolicies(userId);
    const conflicts: PolicyConflict[] = [];

    // 同じタイプのポリシー間で設定値の競合をチェック
    const policiesByType = this.groupPoliciesByType(appliedPolicies);

    for (const [type, policies] of Object.entries(policiesByType)) {
      if (policies.length > 1) {
        const typeConflicts = this.detectTypeSpecificConflicts(type as GroupPolicyType, policies);
        conflicts.push(...typeConflicts);
      }
    }

    return conflicts;
  }

  /**
   * ポリシー設定の検証
   */
  validatePolicySettings(type: GroupPolicyType, settings: GroupPolicySettings): void {
    switch (type) {
      case 'password':
        this.validatePasswordPolicy(settings.passwordPolicy);
        break;
      case 'session':
        this.validateSessionPolicy(settings.sessionPolicy);
        break;
      case 'access_control':
        this.validateAccessPolicy(settings.accessPolicy);
        break;
      case 'audit':
        this.validateAuditPolicy(settings.auditPolicy);
        break;
      case 'application':
        this.validateApplicationPolicy(settings.applicationPolicy);
        break;
      case 'network':
        this.validateNetworkPolicy(settings.networkPolicy);
        break;
      default:
        throw new Error(`未対応のポリシータイプ: ${type}`);
    }
  }

  /**
   * パスワードポリシーの検証
   */
  private validatePasswordPolicy(policy?: PasswordPolicySettings): void {
    if (!policy) return;

    if (policy.minimumLength < 1 || policy.minimumLength > 128) {
      throw new Error('パスワード最小長は1-128文字である必要があります');
    }

    if (policy.maxAge < 1 || policy.maxAge > 365) {
      throw new Error('パスワード有効期限は1-365日である必要があります');
    }

    if (policy.historyCount < 0 || policy.historyCount > 24) {
      throw new Error('パスワード履歴数は0-24個である必要があります');
    }

    if (policy.lockoutThreshold < 0 || policy.lockoutThreshold > 50) {
      throw new Error('アカウントロックアウト閾値は0-50回である必要があります');
    }
  }

  /**
   * セッションポリシーの検証
   */
  private validateSessionPolicy(policy?: SessionPolicySettings): void {
    if (!policy) return;

    if (policy.maxSessionDuration < 300 || policy.maxSessionDuration > 86400) {
      throw new Error('最大セッション時間は5分-24時間である必要があります');
    }

    if (policy.idleTimeout < 60 || policy.idleTimeout > 7200) {
      throw new Error('アイドルタイムアウトは1分-2時間である必要があります');
    }

    if (policy.concurrentSessionLimit < 1 || policy.concurrentSessionLimit > 10) {
      throw new Error('同時セッション数は1-10個である必要があります');
    }
  }

  /**
   * アクセスポリシーの検証
   */
  private validateAccessPolicy(policy?: AccessPolicySettings): void {
    if (!policy) return;

    // IPアドレスの形式検証
    if (policy.ipWhitelist) {
      for (const ip of policy.ipWhitelist) {
        if (!this.isValidIpAddress(ip)) {
          throw new Error(`無効なIPアドレス: ${ip}`);
        }
      }
    }

    if (policy.ipBlacklist) {
      for (const ip of policy.ipBlacklist) {
        if (!this.isValidIpAddress(ip)) {
          throw new Error(`無効なIPアドレス: ${ip}`);
        }
      }
    }

    // 時間範囲の検証
    if (policy.allowedTimeRanges) {
      for (const timeRange of policy.allowedTimeRanges) {
        if (!this.isValidTimeRange(timeRange)) {
          throw new Error('無効な時間範囲設定です');
        }
      }
    }
  }

  /**
   * 監査ポリシーの検証
   */
  private validateAuditPolicy(policy?: AuditPolicySettings): void {
    if (!policy) return;

    if (policy.retentionDays < 1 || policy.retentionDays > 2555) {
      throw new Error('監査ログ保持期間は1-2555日である必要があります');
    }

    // アラート閾値の検証
    if (policy.alertThresholds) {
      for (const threshold of policy.alertThresholds) {
        if (threshold.count < 1 || threshold.count > 1000) {
          throw new Error('アラート閾値は1-1000回である必要があります');
        }
        if (threshold.timeWindow < 60 || threshold.timeWindow > 86400) {
          throw new Error('アラート時間窓は1分-24時間である必要があります');
        }
      }
    }
  }

  /**
   * アプリケーションポリシーの検証
   */
  private validateApplicationPolicy(policy?: ApplicationPolicySettings): void {
    if (!policy) return;

    // アプリケーション権限の検証
    if (policy.applicationPermissions) {
      for (const appPerm of policy.applicationPermissions) {
        if (!appPerm.applicationId || appPerm.applicationId.trim() === '') {
          throw new Error('アプリケーションIDが必要です');
        }
        if (!appPerm.permissions || appPerm.permissions.length === 0) {
          throw new Error('アプリケーション権限が必要です');
        }
      }
    }

    // DLP設定の検証
    if (policy.dataLossPrevention && policy.dataLossPrevention.enabled) {
      // DLP固有の検証ロジック
    }
  }

  /**
   * ネットワークポリシーの検証
   */
  private validateNetworkPolicy(policy?: NetworkPolicySettings): void {
    if (!policy) return;

    // ネットワーク範囲の検証
    if (policy.allowedNetworks) {
      for (const network of policy.allowedNetworks) {
        if (!this.isValidNetworkCidr(network)) {
          throw new Error(`無効なネットワーク範囲: ${network}`);
        }
      }
    }

    if (policy.blockedNetworks) {
      for (const network of policy.blockedNetworks) {
        if (!this.isValidNetworkCidr(network)) {
          throw new Error(`無効なネットワーク範囲: ${network}`);
        }
      }
    }

    // ファイアウォールルールの検証
    if (policy.firewallRules) {
      for (const rule of policy.firewallRules) {
        if (!rule.name || rule.name.trim() === '') {
          throw new Error('ファイアウォールルール名が必要です');
        }
        if (rule.priority < 1 || rule.priority > 1000) {
          throw new Error('ファイアウォールルール優先度は1-1000である必要があります');
        }
      }
    }
  }

  /**
   * ポリシーのターゲットへの適用
   */
  private async applyPolicyToTargets(policy: GroupPolicy): Promise<void> {
    // 組織単位への適用
    for (const ouId of policy.targetOus) {
      await this.applyPolicyToOu(policy, ouId);
    }

    // セキュリティグループへの適用
    for (const groupId of policy.targetGroups) {
      await this.applyPolicyToGroup(policy, groupId);
    }

    // 適用ログを記録
    await this.logPolicyApplication(policy);
  }

  /**
   * 組織単位へのポリシー適用
   */
  private async applyPolicyToOu(policy: GroupPolicy, ouId: string): Promise<void> {
    const ou = await this.getOrganizationUnitById(ouId);
    
    if (!ou) {
      throw new Error(`組織単位が見つかりません: ${ouId}`);
    }

    // OUの全ユーザーにポリシーを適用
    const users = await this.getUsersByOu(ouId);
    
    for (const user of users) {
      await this.applyPolicyToUser(policy, user.id);
    }

    // 子OUにも再帰的に適用（継承が有効な場合）
    if (policy.enforced) {
      const childOus = await this.getChildOrganizationUnits(ouId);
      for (const childOu of childOus) {
        await this.applyPolicyToOu(policy, childOu.id);
      }
    }
  }

  /**
   * セキュリティグループへのポリシー適用
   */
  private async applyPolicyToGroup(policy: GroupPolicy, groupId: string): Promise<void> {
    const group = await this.getSecurityGroupById(groupId);
    
    if (!group) {
      throw new Error(`セキュリティグループが見つかりません: ${groupId}`);
    }

    // グループメンバーにポリシーを適用
    for (const member of group.members) {
      if (member.memberType === 'user') {
        await this.applyPolicyToUser(policy, member.userId);
      }
    }
  }

  /**
   * ユーザーへのポリシー適用
   */
  private async applyPolicyToUser(policy: GroupPolicy, userId: string): Promise<void> {
    // ユーザーの現在のポリシー設定を取得
    const userPolicies = await this.getUserPolicies(userId);
    
    // 新しいポリシーを追加または更新
    const existingIndex = userPolicies.findIndex(p => p.id === policy.id);
    
    if (existingIndex >= 0) {
      userPolicies[existingIndex] = policy;
    } else {
      userPolicies.push(policy);
    }

    // 効果的なポリシー設定を計算
    const effectiveSettings = this.calculateEffectiveSettings(userPolicies);
    
    // ユーザーの設定を更新
    await this.updateUserPolicySettings(userId, effectiveSettings);
  }

  /**
   * 効果的なポリシー設定の計算
   */
  private calculateEffectiveSettings(policies: GroupPolicy[]): Record<string, any> {
    const effectiveSettings: Record<string, any> = {};
    
    // ポリシーを優先順位でソート
    const sortedPolicies = policies
      .filter(p => p.enabled)
      .sort((a, b) => {
        // enforced ポリシーを最優先
        if (a.enforced && !b.enforced) return -1;
        if (!a.enforced && b.enforced) return 1;
        // 次に order 値
        return a.order - b.order;
      });

    // 各ポリシータイプごとに設定をマージ
    for (const policy of sortedPolicies) {
      const typeKey = `${policy.type}Policy`;
      const typeSettings = policy.settings[typeKey as keyof GroupPolicySettings];
      
      if (typeSettings) {
        effectiveSettings[typeKey] = this.mergeSettings(
          effectiveSettings[typeKey] || {},
          typeSettings,
          policy.enforced
        );
      }
    }

    return effectiveSettings;
  }

  /**
   * 設定のマージ
   */
  private mergeSettings(existing: any, incoming: any, enforced: boolean): any {
    if (enforced) {
      // 強制ポリシーは既存設定を上書き
      return { ...existing, ...incoming };
    } else {
      // 非強制ポリシーは既存設定がない場合のみ適用
      const merged = { ...existing };
      for (const [key, value] of Object.entries(incoming)) {
        if (!(key in merged)) {
          merged[key] = value;
        }
      }
      return merged;
    }
  }

  /**
   * ポリシー競合の検出（タイプ別）
   */
  private detectTypeSpecificConflicts(type: GroupPolicyType, policies: GroupPolicy[]): PolicyConflict[] {
    const conflicts: PolicyConflict[] = [];

    switch (type) {
      case 'password':
        conflicts.push(...this.detectPasswordPolicyConflicts(policies));
        break;
      case 'session':
        conflicts.push(...this.detectSessionPolicyConflicts(policies));
        break;
      case 'access_control':
        conflicts.push(...this.detectAccessPolicyConflicts(policies));
        break;
      // 他のポリシータイプの競合検出...
    }

    return conflicts;
  }

  /**
   * パスワードポリシー競合の検出
   */
  private detectPasswordPolicyConflicts(policies: GroupPolicy[]): PolicyConflict[] {
    const conflicts: PolicyConflict[] = [];
    
    // 最小長の競合チェック
    const minLengths = policies
      .map(p => p.settings.passwordPolicy?.minimumLength)
      .filter(len => len !== undefined);
    
    if (minLengths.length > 1) {
      const min = Math.min(...minLengths);
      const max = Math.max(...minLengths);
      
      if (min !== max) {
        conflicts.push({
          type: 'setting_conflict',
          policyType: 'password',
          setting: 'minimumLength',
          conflictingValues: minLengths,
          resolution: 'max_value',
          severity: 'medium'
        });
      }
    }

    return conflicts;
  }

  /**
   * セッションポリシー競合の検出
   */
  private detectSessionPolicyConflicts(policies: GroupPolicy[]): PolicyConflict[] {
    const conflicts: PolicyConflict[] = [];
    
    // セッション時間の競合チェック
    const sessionDurations = policies
      .map(p => p.settings.sessionPolicy?.maxSessionDuration)
      .filter(duration => duration !== undefined);
    
    if (sessionDurations.length > 1) {
      const min = Math.min(...sessionDurations);
      const max = Math.max(...sessionDurations);
      
      if (min !== max) {
        conflicts.push({
          type: 'setting_conflict',
          policyType: 'session',
          setting: 'maxSessionDuration',
          conflictingValues: sessionDurations,
          resolution: 'min_value',
          severity: 'high'
        });
      }
    }

    return conflicts;
  }

  /**
   * アクセスポリシー競合の検出
   */
  private detectAccessPolicyConflicts(policies: GroupPolicy[]): PolicyConflict[] {
    const conflicts: PolicyConflict[] = [];
    
    // IP制限の競合チェック
    const whitelists = policies
      .map(p => p.settings.accessPolicy?.ipWhitelist)
      .filter(list => list && list.length > 0);
    
    if (whitelists.length > 1) {
      // 複数のホワイトリストがある場合、共通部分を取る必要がある
      conflicts.push({
        type: 'list_conflict',
        policyType: 'access_control',
        setting: 'ipWhitelist',
        conflictingValues: whitelists,
        resolution: 'intersection',
        severity: 'high'
      });
    }

    return conflicts;
  }

  // ヘルパーメソッド

  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private groupPoliciesByType(policies: GroupPolicy[]): Record<string, GroupPolicy[]> {
    return policies.reduce((groups, policy) => {
      const type = policy.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(policy);
      return groups;
    }, {} as Record<string, GroupPolicy[]>);
  }

  private isValidIpAddress(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^[0-9a-fA-F:]+$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private isValidNetworkCidr(cidr: string): boolean {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    return cidrRegex.test(cidr);
  }

  private isValidTimeRange(timeRange: any): boolean {
    // 時間形式の検証ロジック
    return true; // 簡略化
  }

  // データベース操作メソッド（プレースホルダー）
  private async savePolicyToDatabase(policy: GroupPolicy): Promise<void> {
    // 実際の実装ではデータベースに保存
  }

  private async getPolicyById(policyId: string): Promise<GroupPolicy | null> {
    // 実際の実装ではデータベースから取得
    return null;
  }

  private async deletePolicyFromDatabase(policyId: string): Promise<void> {
    // 実際の実装ではデータベースから削除
  }

  private async getUserById(userId: string): Promise<EnterpriseUser | null> {
    // 実際の実装ではデータベースから取得
    return null;
  }

  private async getOuPolicies(ouId: string): Promise<GroupPolicy[]> {
    // 実際の実装ではデータベースから取得
    return [];
  }

  private async getGroupPolicies(groupId: string): Promise<GroupPolicy[]> {
    // 実際の実装ではデータベースから取得
    return [];
  }

  private async removePolicyFromTargets(policy: GroupPolicy): Promise<void> {
    // ポリシーの適用を解除
  }

  private async logPolicyApplication(policy: GroupPolicy): Promise<void> {
    // ポリシー適用のログを記録
  }

  private async getOrganizationUnitById(ouId: string): Promise<OrganizationUnit | null> {
    return null;
  }

  private async getUsersByOu(ouId: string): Promise<EnterpriseUser[]> {
    return [];
  }

  private async getChildOrganizationUnits(ouId: string): Promise<OrganizationUnit[]> {
    return [];
  }

  private async getSecurityGroupById(groupId: string): Promise<SecurityGroup | null> {
    return null;
  }

  private async getUserPolicies(userId: string): Promise<GroupPolicy[]> {
    return [];
  }

  private async updateUserPolicySettings(userId: string, settings: Record<string, any>): Promise<void> {
    // ユーザーの効果的なポリシー設定を更新
  }
}

/**
 * ポリシー競合情報
 */
export interface PolicyConflict {
  type: 'setting_conflict' | 'list_conflict' | 'logical_conflict';
  policyType: GroupPolicyType;
  setting: string;
  conflictingValues: any[];
  resolution: 'min_value' | 'max_value' | 'intersection' | 'union' | 'manual';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  recommendation?: string;
}

/**
 * グローバルサービスインスタンス
 */
export const groupPolicyService = new GroupPolicyService();