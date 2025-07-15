/**
 * DNSweeper 組織階層ベースアクセス制御サービス
 * Active Directory統合・組織単位・セキュリティグループ・権限継承管理
 */

import {
  OrganizationUnit,
  SecurityGroup,
  EnterpriseUser,
  Permission,
  PermissionResource,
  PermissionAction,
  PermissionCondition,
  GroupPermission,
  SecurityGroupType,
  SecurityGroupScope,
  GroupMember,
  GroupMemberType
} from '../types/enterprise-auth';

/**
 * 組織アクセス制御サービス
 */
export class OrganizationAccessControlService {

  /**
   * 組織単位の作成
   */
  async createOrganizationUnit(ouData: Partial<OrganizationUnit>): Promise<OrganizationUnit> {
    // 親OUの存在確認
    if (ouData.parentOuId) {
      const parentOu = await this.getOrganizationUnitById(ouData.parentOuId);
      if (!parentOu) {
        throw new Error('親組織単位が見つかりません');
      }
    }

    const ou: OrganizationUnit = {
      id: this.generateOuId(),
      name: ouData.name!,
      description: ouData.description,
      distinguishedName: this.generateDistinguishedName(ouData.name!, ouData.parentOuId),
      parentOuId: ouData.parentOuId,
      depth: await this.calculateOuDepth(ouData.parentOuId),
      children: [],
      policies: ouData.policies || [],
      memberCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // データベースに保存
    await this.saveOrganizationUnit(ou);

    // 親OUの子リストを更新
    if (ou.parentOuId) {
      await this.addChildToParentOu(ou.parentOuId, ou);
    }

    return ou;
  }

  /**
   * セキュリティグループの作成
   */
  async createSecurityGroup(groupData: Partial<SecurityGroup>): Promise<SecurityGroup> {
    // OU存在確認
    const ou = await this.getOrganizationUnitById(groupData.ouId!);
    if (!ou) {
      throw new Error('組織単位が見つかりません');
    }

    const group: SecurityGroup = {
      id: this.generateGroupId(),
      name: groupData.name!,
      description: groupData.description,
      distinguishedName: this.generateGroupDistinguishedName(groupData.name!, ou.distinguishedName),
      groupType: groupData.groupType || 'security',
      scope: groupData.scope || 'domain_local',
      ouId: groupData.ouId!,
      members: [],
      permissions: groupData.permissions || [],
      policies: groupData.policies || [],
      isBuiltIn: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // データベースに保存
    await this.saveSecurityGroup(group);

    return group;
  }

  /**
   * ユーザーをセキュリティグループに追加
   */
  async addUserToSecurityGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.getSecurityGroupById(groupId);
    const user = await this.getUserById(userId);

    if (!group) {
      throw new Error('セキュリティグループが見つかりません');
    }
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    // 既にメンバーかどうかチェック
    const existingMember = group.members.find(m => m.userId === userId);
    if (existingMember) {
      return; // 既にメンバー
    }

    const member: GroupMember = {
      userId,
      userPrincipalName: user.userPrincipalName || user.email,
      displayName: `${user.firstName} ${user.lastName}`,
      memberType: 'user',
      joinedAt: new Date()
    };

    group.members.push(member);
    await this.saveSecurityGroup(group);

    // ユーザーのセキュリティグループリストを更新
    await this.updateUserSecurityGroups(userId);

    // 権限の再計算
    await this.recalculateUserPermissions(userId);
  }

  /**
   * ユーザーをセキュリティグループから削除
   */
  async removeUserFromSecurityGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.getSecurityGroupById(groupId);
    
    if (!group) {
      throw new Error('セキュリティグループが見つかりません');
    }

    group.members = group.members.filter(m => m.userId !== userId);
    await this.saveSecurityGroup(group);

    // ユーザーのセキュリティグループリストを更新
    await this.updateUserSecurityGroups(userId);

    // 権限の再計算
    await this.recalculateUserPermissions(userId);
  }

  /**
   * ユーザーの有効な権限を計算
   */
  async calculateUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    const allPermissions: Permission[] = [];

    // 1. 直接権限（ユーザーに直接割り当てられた権限）
    const directPermissions = await this.getUserDirectPermissions(userId);
    allPermissions.push(...directPermissions);

    // 2. セキュリティグループからの権限
    for (const group of user.securityGroups) {
      const groupPermissions = await this.getGroupPermissions(group.id);
      allPermissions.push(...groupPermissions);
    }

    // 3. 組織単位からの継承権限
    if (user.organizationUnit) {
      const ouPermissions = await this.getOuInheritedPermissions(user.organizationUnit.id);
      allPermissions.push(...ouPermissions);
    }

    // 4. 権限の統合とマージ
    const consolidatedPermissions = this.consolidatePermissions(allPermissions);

    return consolidatedPermissions;
  }

  /**
   * 権限チェック
   */
  async checkUserPermission(
    userId: string,
    resource: PermissionResource,
    action: PermissionAction,
    conditions?: Record<string, any>
  ): Promise<boolean> {
    const userPermissions = await this.calculateUserPermissions(userId);

    return userPermissions.some(permission => {
      // リソースマッチング
      if (permission.resource !== resource) {
        return false;
      }

      // アクションマッチング
      if (!permission.actions.includes(action)) {
        return false;
      }

      // 条件マッチング
      if (conditions && permission.conditions) {
        return this.evaluatePermissionConditions(permission.conditions, conditions);
      }

      return true;
    });
  }

  /**
   * 組織階層権限継承の計算
   */
  async calculateOuPermissionInheritance(ouId: string): Promise<Permission[]> {
    const inheritedPermissions: Permission[] = [];
    
    // 現在のOUの直接権限
    const directPermissions = await this.getOuDirectPermissions(ouId);
    inheritedPermissions.push(...directPermissions);

    // 親OUからの継承権限
    const ou = await this.getOrganizationUnitById(ouId);
    if (ou?.parentOuId) {
      const parentPermissions = await this.calculateOuPermissionInheritance(ou.parentOuId);
      
      // 継承可能な権限のみを追加
      const inheritablePermissions = parentPermissions.filter(p => 
        this.isPermissionInheritable(p)
      );
      
      inheritedPermissions.push(...inheritablePermissions);
    }

    return this.consolidatePermissions(inheritedPermissions);
  }

  /**
   * アクセス制御リスト（ACL）の生成
   */
  async generateResourceAcl(
    resource: PermissionResource,
    resourceId?: string
  ): Promise<AccessControlEntry[]> {
    const acl: AccessControlEntry[] = [];

    // 全ユーザーの権限をチェック
    const allUsers = await this.getAllUsers();
    
    for (const user of allUsers) {
      const userPermissions = await this.calculateUserPermissions(user.id);
      
      const relevantPermissions = userPermissions.filter(p => 
        p.resource === resource &&
        (!resourceId || this.matchesResourceCondition(p, resourceId))
      );

      if (relevantPermissions.length > 0) {
        acl.push({
          principalType: 'user',
          principalId: user.id,
          principalName: `${user.firstName} ${user.lastName}`,
          permissions: relevantPermissions,
          inheritedFrom: this.determinePermissionSource(user, relevantPermissions)
        });
      }
    }

    // グループ権限も追加
    const allGroups = await this.getAllSecurityGroups();
    
    for (const group of allGroups) {
      const groupPermissions = await this.getGroupPermissions(group.id);
      
      const relevantPermissions = groupPermissions.filter(p => 
        p.resource === resource &&
        (!resourceId || this.matchesResourceCondition(p, resourceId))
      );

      if (relevantPermissions.length > 0) {
        acl.push({
          principalType: 'group',
          principalId: group.id,
          principalName: group.name,
          permissions: relevantPermissions,
          inheritedFrom: 'direct'
        });
      }
    }

    return acl.sort((a, b) => a.principalName.localeCompare(b.principalName));
  }

  /**
   * 最小権限原則の監査
   */
  async auditLeastPrivilege(userId: string): Promise<PrivilegeAuditResult> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }

    const userPermissions = await this.calculateUserPermissions(userId);
    const accessHistory = await this.getUserAccessHistory(userId, 90); // 過去90日
    
    // 使用されていない権限を特定
    const unusedPermissions = userPermissions.filter(permission => {
      return !accessHistory.some(access => 
        access.resource === permission.resource &&
        permission.actions.includes(access.action)
      );
    });

    // 過度な権限を特定
    const excessivePermissions = userPermissions.filter(permission => {
      return this.isPermissionExcessive(permission, user);
    });

    // 権限の重複を特定
    const duplicatePermissions = this.findDuplicatePermissions(userPermissions);

    return {
      userId,
      totalPermissions: userPermissions.length,
      unusedPermissions,
      excessivePermissions,
      duplicatePermissions,
      riskScore: this.calculatePrivilegeRiskScore(userPermissions, unusedPermissions, excessivePermissions),
      recommendations: this.generatePrivilegeRecommendations(unusedPermissions, excessivePermissions)
    };
  }

  /**
   * ロールベースアクセス制御（RBAC）の実装
   */
  async createRole(roleData: {
    name: string;
    description?: string;
    permissions: Permission[];
    ouId?: string;
  }): Promise<SecurityGroup> {
    // ロールをセキュリティグループとして実装
    const roleGroup = await this.createSecurityGroup({
      name: `Role: ${roleData.name}`,
      description: roleData.description,
      groupType: 'security',
      scope: 'domain_local',
      ouId: roleData.ouId || await this.getDefaultOuId(),
      permissions: roleData.permissions.map(p => ({
        resource: p.resource,
        actions: p.actions,
        inherited: false,
        conditions: p.conditions
      }))
    });

    return roleGroup;
  }

  /**
   * ユーザーをロールに割り当て
   */
  async assignUserToRole(userId: string, roleId: string): Promise<void> {
    await this.addUserToSecurityGroup(roleId, userId);
  }

  /**
   * 時間ベースアクセス制御（TBAC）
   */
  async checkTimeBasedAccess(
    userId: string,
    resource: PermissionResource,
    action: PermissionAction
  ): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    // 適用されるポリシーから時間制限を取得
    const appliedPolicies = await this.getUserAppliedPolicies(userId);
    
    for (const policy of appliedPolicies) {
      if (policy.type === 'access_control' && policy.settings.accessPolicy) {
        const timeRanges = policy.settings.accessPolicy.allowedTimeRanges;
        
        if (timeRanges && timeRanges.length > 0) {
          const currentTime = new Date();
          const isInAllowedTime = timeRanges.some(range => 
            this.isTimeInRange(currentTime, range)
          );
          
          if (!isInAllowedTime) {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * 場所ベースアクセス制御（LBAC）
   */
  async checkLocationBasedAccess(
    userId: string,
    resource: PermissionResource,
    action: PermissionAction,
    clientIp: string
  ): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    // 適用されるポリシーからIP制限を取得
    const appliedPolicies = await this.getUserAppliedPolicies(userId);
    
    for (const policy of appliedPolicies) {
      if (policy.type === 'access_control' && policy.settings.accessPolicy) {
        const { ipWhitelist, ipBlacklist } = policy.settings.accessPolicy;
        
        // ブラックリストチェック
        if (ipBlacklist && ipBlacklist.some(ip => this.ipMatches(clientIp, ip))) {
          return false;
        }
        
        // ホワイトリストチェック
        if (ipWhitelist && ipWhitelist.length > 0) {
          if (!ipWhitelist.some(ip => this.ipMatches(clientIp, ip))) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // ヘルパーメソッド

  private consolidatePermissions(permissions: Permission[]): Permission[] {
    const permissionMap = new Map<string, Permission>();

    for (const permission of permissions) {
      const key = permission.resource;
      const existing = permissionMap.get(key);

      if (existing) {
        // アクションをマージ
        const mergedActions = Array.from(new Set([...existing.actions, ...permission.actions]));
        
        // 条件をマージ
        const mergedConditions = this.mergeConditions(existing.conditions, permission.conditions);

        permissionMap.set(key, {
          resource: permission.resource,
          actions: mergedActions,
          conditions: mergedConditions
        });
      } else {
        permissionMap.set(key, permission);
      }
    }

    return Array.from(permissionMap.values());
  }

  private mergeConditions(
    conditions1?: PermissionCondition[],
    conditions2?: PermissionCondition[]
  ): PermissionCondition[] | undefined {
    if (!conditions1 && !conditions2) return undefined;
    if (!conditions1) return conditions2;
    if (!conditions2) return conditions1;

    // 条件の論理和を取る（より制限的でない方向）
    const merged = [...conditions1];
    
    for (const condition2 of conditions2) {
      const existing = merged.find(c => 
        c.field === condition2.field && c.operator === condition2.operator
      );
      
      if (!existing) {
        merged.push(condition2);
      }
    }

    return merged;
  }

  private evaluatePermissionConditions(
    conditions: PermissionCondition[],
    context: Record<string, any>
  ): boolean {
    return conditions.every(condition => {
      const contextValue = context[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          return contextValue === condition.value;
        case 'contains':
          return String(contextValue).includes(String(condition.value));
        case 'starts_with':
          return String(contextValue).startsWith(String(condition.value));
        case 'not_equals':
          return contextValue !== condition.value;
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(contextValue);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(contextValue);
        default:
          return false;
      }
    });
  }

  private isPermissionInheritable(permission: Permission): boolean {
    // 特定の権限タイプは継承しない
    const nonInheritableResources: PermissionResource[] = ['billing', 'members'];
    return !nonInheritableResources.includes(permission.resource);
  }

  private matchesResourceCondition(permission: Permission, resourceId: string): boolean {
    if (!permission.conditions) return true;
    
    return permission.conditions.some(condition => {
      if (condition.field === 'resourceId') {
        return this.evaluateCondition(condition, resourceId);
      }
      return true;
    });
  }

  private evaluateCondition(condition: PermissionCondition, value: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'starts_with':
        return String(value).startsWith(String(condition.value));
      default:
        return false;
    }
  }

  private determinePermissionSource(user: EnterpriseUser, permissions: Permission[]): string {
    // 権限がどこから来ているかを判定
    return 'mixed'; // 簡略化
  }

  private isPermissionExcessive(permission: Permission, user: EnterpriseUser): boolean {
    // 権限が過度かどうかを判定するロジック
    // ユーザーの役職、部署、責任範囲などを考慮
    return false; // 簡略化
  }

  private findDuplicatePermissions(permissions: Permission[]): Permission[] {
    const seen = new Set<string>();
    const duplicates: Permission[] = [];

    for (const permission of permissions) {
      const key = `${permission.resource}:${permission.actions.join(',')}`;
      
      if (seen.has(key)) {
        duplicates.push(permission);
      } else {
        seen.add(key);
      }
    }

    return duplicates;
  }

  private calculatePrivilegeRiskScore(
    totalPermissions: Permission[],
    unusedPermissions: Permission[],
    excessivePermissions: Permission[]
  ): number {
    const baseScore = totalPermissions.length * 2;
    const unusedPenalty = unusedPermissions.length * 5;
    const excessivePenalty = excessivePermissions.length * 10;
    
    return Math.min(baseScore + unusedPenalty + excessivePenalty, 100);
  }

  private generatePrivilegeRecommendations(
    unusedPermissions: Permission[],
    excessivePermissions: Permission[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (unusedPermissions.length > 0) {
      recommendations.push(`${unusedPermissions.length}個の未使用権限を削除することを検討してください`);
    }
    
    if (excessivePermissions.length > 0) {
      recommendations.push(`${excessivePermissions.length}個の過度な権限を見直してください`);
    }
    
    return recommendations;
  }

  private isTimeInRange(currentTime: Date, timeRange: any): boolean {
    // 時間範囲チェックのロジック
    return true; // 簡略化
  }

  private ipMatches(clientIp: string, allowedIp: string): boolean {
    // IP範囲マッチングのロジック
    return clientIp === allowedIp; // 簡略化
  }

  // データベース操作メソッド（プレースホルダー）
  private generateOuId(): string {
    return `ou_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateDistinguishedName(name: string, parentOuId?: string): string {
    // Active Directory形式のDN生成
    return `OU=${name},DC=example,DC=com`;
  }

  private generateGroupDistinguishedName(name: string, ouDn: string): string {
    return `CN=${name},${ouDn}`;
  }

  private async calculateOuDepth(parentOuId?: string): Promise<number> {
    if (!parentOuId) return 0;
    
    const parentOu = await this.getOrganizationUnitById(parentOuId);
    return parentOu ? parentOu.depth + 1 : 0;
  }

  // プレースホルダーメソッド
  private async saveOrganizationUnit(ou: OrganizationUnit): Promise<void> {}
  private async saveSecurityGroup(group: SecurityGroup): Promise<void> {}
  private async getOrganizationUnitById(ouId: string): Promise<OrganizationUnit | null> { return null; }
  private async getSecurityGroupById(groupId: string): Promise<SecurityGroup | null> { return null; }
  private async getUserById(userId: string): Promise<EnterpriseUser | null> { return null; }
  private async addChildToParentOu(parentOuId: string, childOu: OrganizationUnit): Promise<void> {}
  private async updateUserSecurityGroups(userId: string): Promise<void> {}
  private async recalculateUserPermissions(userId: string): Promise<void> {}
  private async getUserDirectPermissions(userId: string): Promise<Permission[]> { return []; }
  private async getGroupPermissions(groupId: string): Promise<Permission[]> { return []; }
  private async getOuInheritedPermissions(ouId: string): Promise<Permission[]> { return []; }
  private async getOuDirectPermissions(ouId: string): Promise<Permission[]> { return []; }
  private async getAllUsers(): Promise<EnterpriseUser[]> { return []; }
  private async getAllSecurityGroups(): Promise<SecurityGroup[]> { return []; }
  private async getUserAccessHistory(userId: string, days: number): Promise<AccessHistoryEntry[]> { return []; }
  private async getUserAppliedPolicies(userId: string): Promise<any[]> { return []; }
  private async getDefaultOuId(): Promise<string> { return 'default'; }
}

/**
 * アクセス制御エントリ
 */
export interface AccessControlEntry {
  principalType: 'user' | 'group';
  principalId: string;
  principalName: string;
  permissions: Permission[];
  inheritedFrom: string;
}

/**
 * 権限監査結果
 */
export interface PrivilegeAuditResult {
  userId: string;
  totalPermissions: number;
  unusedPermissions: Permission[];
  excessivePermissions: Permission[];
  duplicatePermissions: Permission[];
  riskScore: number;
  recommendations: string[];
}

/**
 * アクセス履歴エントリ
 */
export interface AccessHistoryEntry {
  resource: PermissionResource;
  action: PermissionAction;
  timestamp: Date;
  success: boolean;
}

/**
 * グローバルサービスインスタンス
 */
export const organizationAccessControlService = new OrganizationAccessControlService();