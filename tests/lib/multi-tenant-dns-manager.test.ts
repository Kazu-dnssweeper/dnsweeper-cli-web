import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  MultiTenantDNSManager,
  Tenant, 
  TenantUser, 
  TenantResource, 
  TenantAuditLog, 
  TenantQuota,
  TenantBilling,
  TenantIsolation
} from '../../src/lib/multi-tenant-dns-manager.js';

// モックの設定
vi.mock('../../src/lib/logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }))
}));

describe('MultiTenantDNSManager', () => {
  let manager: MultiTenantDNSManager;

  beforeEach(() => {
    // デモテナントの初期化を有効にする
    process.env.INITIALIZE_DEMO_TENANTS = 'true';
    manager = new MultiTenantDNSManager();
  });

  afterEach(async () => {
    await manager.shutdown();
    // 環境変数をクリーンアップ
    delete process.env.INITIALIZE_DEMO_TENANTS;
  });

  describe('テナント管理', () => {
    it('デフォルトテナントが正しく初期化されること', async () => {
      // createDemoTenantsは非同期なので、少し待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const tenants = manager.getAllTenants();
      
      // 環境変数によってはデモテナントが作成されない場合がある
      if (process.env.INITIALIZE_DEMO_TENANTS === 'true') {
        expect(tenants.length).toBeGreaterThan(0);
      } else {
        expect(tenants).toHaveLength(0);
      }
    });

    it('新しいテナントが正しく作成されること', async () => {
      const tenantData = {
        name: 'Test Organization',
        domain: 'test.example.com',
        plan: 'professional' as const,
        status: 'active' as const,
        settings: {
          maxDNSRecords: 1000,
          maxQueriesPerMonth: 100000,
          maxUsers: 10,
          apiRateLimit: 500,
          allowedFeatures: ['basic-dns', 'monitoring', 'analytics'],
          retention: {
            logs: 90,
            metrics: 90,
            backups: 30
          }
        },
        subscription: {
          planId: 'professional-plan',
          status: 'active' as const,
          currentPeriodStart: new Date('2024-01-01'),
          currentPeriodEnd: new Date('2024-12-31'),
          usage: {
            dnsRecords: 0,
            queriesThisMonth: 0,
            activeUsers: 0,
            apiCalls: 0
          }
        },
        metadata: {
          industry: 'technology',
          companySize: 'medium',
          region: 'us-west-2',
          contactEmail: 'admin@test.example.com'
        }
      };

      const tenant = await manager.createTenant(tenantData);
      
      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('Test Organization');
      expect(tenant.plan).toBe('professional');
      expect(tenant.createdAt).toBeDefined();
      expect(tenant.updatedAt).toBeDefined();
      
      // テナントが正しく保存されているか確認
      const retrieved = manager.getTenant(tenant.id);
      expect(retrieved).toEqual(tenant);
    });

    it('テナントが正しく更新されること', async () => {
      const tenants = manager.getAllTenants();
      const existingTenant = tenants[0];
      
      const updates = {
        name: 'Updated Organization',
        plan: 'enterprise' as const
      };

      const updatedTenant = await manager.updateTenant(existingTenant.id, updates);
      
      expect(updatedTenant.name).toBe('Updated Organization');
      expect(updatedTenant.plan).toBe('enterprise');
      expect(updatedTenant.updatedAt).not.toEqual(existingTenant.updatedAt);
    });

    it('テナントが正しく削除されること', async () => {
      const tenants = manager.getAllTenants();
      const tenantToDelete = tenants[0];
      
      await manager.deleteTenant(tenantToDelete.id);
      
      const retrievedTenant = manager.getTenant(tenantToDelete.id);
      expect(retrievedTenant).toBeUndefined();
      
      // 関連リソースも削除されているか確認
      const quota = manager.getTenantQuota(tenantToDelete.id);
      expect(quota).toBeUndefined();
    });

    it('存在しないテナントの取得でundefinedが返されること', () => {
      const nonExistentTenant = manager.getTenant('non-existent-id');
      expect(nonExistentTenant).toBeUndefined();
    });

    it('存在しないテナントの更新でエラーが発生すること', async () => {
      await expect(manager.updateTenant('non-existent-id', { name: 'Updated' }))
        .rejects.toThrow('テナントが見つかりません');
    });

    it('存在しないテナントの削除でエラーが発生すること', async () => {
      await expect(manager.deleteTenant('non-existent-id'))
        .rejects.toThrow('テナントが見つかりません');
    });
  });

  describe('ユーザー管理', () => {
    it('新しいユーザーが正しく作成されること', async () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      const userData = {
        email: 'user@test.com',
        role: 'admin' as const,
        permissions: ['dns:read', 'dns:write', 'users:read'],
        status: 'active' as const,
        profile: {
          name: 'Test User',
          timezone: 'UTC',
          language: 'en',
          preferences: {
            notifications: true,
            emailDigest: true,
            theme: 'light' as const
          }
        },
        mfa: {
          enabled: false
        }
      };

      const user = await manager.createUser(tenant.id, userData);
      
      expect(user.id).toBeDefined();
      expect(user.tenantId).toBe(tenant.id);
      expect(user.email).toBe('user@test.com');
      expect(user.role).toBe('admin');
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('テナントのユーザー一覧が正しく取得されること', async () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      // 複数のユーザーを作成
      const users = await Promise.all([
        manager.createUser(tenant.id, {
          email: 'user1@test.com',
          role: 'admin',
          permissions: ['dns:read', 'dns:write'],
          status: 'active',
          profile: {
            name: 'User 1',
            timezone: 'UTC',
            language: 'en',
            preferences: {
              notifications: true,
              emailDigest: true,
              theme: 'light'
            }
          },
          mfa: { enabled: false }
        }),
        manager.createUser(tenant.id, {
          email: 'user2@test.com',
          role: 'viewer',
          permissions: ['dns:read'],
          status: 'active',
          profile: {
            name: 'User 2',
            timezone: 'UTC',
            language: 'en',
            preferences: {
              notifications: true,
              emailDigest: true,
              theme: 'light'
            }
          },
          mfa: { enabled: false }
        })
      ]);

      const tenantUsers = manager.getTenantUsers(tenant.id);
      
      expect(tenantUsers).toHaveLength(2);
      expect(tenantUsers.map(u => u.email)).toContain('user1@test.com');
      expect(tenantUsers.map(u => u.email)).toContain('user2@test.com');
    });

    it('ユーザー数制限が正しく機能すること', async () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0]; // demo-tenant (max 5 users)
      
      // 制限数までユーザーを作成
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(manager.createUser(tenant.id, {
          email: `user${i}@test.com`,
          role: 'viewer',
          permissions: ['dns:read'],
          status: 'active',
          profile: {
            name: `User ${i}`,
            timezone: 'UTC',
            language: 'en',
            preferences: {
              notifications: true,
              emailDigest: true,
              theme: 'light'
            }
          },
          mfa: { enabled: false }
        }));
      }
      
      await Promise.all(promises);
      
      // 制限を超えた場合にエラーが発生するか確認
      await expect(manager.createUser(tenant.id, {
        email: 'user6@test.com',
        role: 'viewer',
        permissions: ['dns:read'],
        status: 'active',
        profile: {
          name: 'User 6',
          timezone: 'UTC',
          language: 'en',
          preferences: {
            notifications: true,
            emailDigest: true,
            theme: 'light'
          }
        },
        mfa: { enabled: false }
      })).rejects.toThrow('ユーザー数の上限に達しています');
    });

    it('存在しないテナントでのユーザー作成でエラーが発生すること', async () => {
      await expect(manager.createUser('non-existent-tenant', {
        email: 'user@test.com',
        role: 'admin',
        permissions: ['dns:read'],
        status: 'active',
        profile: {
          name: 'Test User',
          timezone: 'UTC',
          language: 'en',
          preferences: {
            notifications: true,
            emailDigest: true,
            theme: 'light'
          }
        },
        mfa: { enabled: false }
      })).rejects.toThrow('テナントが見つかりません');
    });
  });

  describe('クォータ管理', () => {
    it('テナントクォータが正しく取得されること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      const quota = manager.getTenantQuota(tenant.id);
      
      expect(quota).toBeDefined();
      expect(quota!.tenantId).toBe(tenant.id);
      expect(quota!.limits.dnsRecords).toBe(tenant.settings.maxDNSRecords);
      expect(quota!.limits.queriesPerMonth).toBe(tenant.settings.maxQueriesPerMonth);
      expect(quota!.limits.users).toBe(tenant.settings.maxUsers);
    });

    it('クォータ使用量が正しく更新されること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      const initialQuota = manager.getTenantQuota(tenant.id);
      const initialQueries = initialQuota!.usage.queriesThisMonth;
      
      manager.updateQuotaUsage(tenant.id, 'queriesThisMonth', 100);
      
      const updatedQuota = manager.getTenantQuota(tenant.id);
      expect(updatedQuota!.usage.queriesThisMonth).toBe(initialQueries + 100);
    });

    it('クォータ上限超過時にイベントが発生すること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      const quota = manager.getTenantQuota(tenant.id);
      const limit = quota!.limits.queriesThisMonth;
      
      let quotaExceededEvent: any = null;
      manager.on('quota:exceeded', (event) => {
        quotaExceededEvent = event;
      });
      
      // 上限を超えるように更新
      manager.updateQuotaUsage(tenant.id, 'queriesThisMonth', limit + 1);
      
      expect(quotaExceededEvent).toBeDefined();
      expect(quotaExceededEvent.tenantId).toBe(tenant.id);
      expect(quotaExceededEvent.usageType).toBe('queriesThisMonth');
      expect(quotaExceededEvent.limit).toBe(limit);
    });

    it('負の値でクォータ使用量が正しく減少すること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      // 最初に使用量を増やす
      manager.updateQuotaUsage(tenant.id, 'queriesThisMonth', 100);
      
      const quotaAfterIncrease = manager.getTenantQuota(tenant.id);
      const usageAfterIncrease = quotaAfterIncrease!.usage.queriesThisMonth;
      
      // 負の値で減少
      manager.updateQuotaUsage(tenant.id, 'queriesThisMonth', -50);
      
      const quotaAfterDecrease = manager.getTenantQuota(tenant.id);
      expect(quotaAfterDecrease!.usage.queriesThisMonth).toBe(usageAfterIncrease - 50);
    });

    it('存在しないテナントのクォータ取得でundefinedが返されること', () => {
      const quota = manager.getTenantQuota('non-existent-tenant');
      expect(quota).toBeUndefined();
    });
  });

  describe('監査ログ', () => {
    it('監査ログが正しく記録されること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      const auditLog = {
        tenantId: tenant.id,
        userId: 'user-123',
        action: 'dns:create',
        resource: {
          type: 'dns-record',
          id: 'record-123',
          name: 'test.example.com'
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        result: 'success' as const,
        details: {
          changes: {
            type: { old: null, new: 'A' },
            value: { old: null, new: '192.168.1.100' }
          }
        },
        risk: 'low' as const
      };

      manager.logAuditEvent(auditLog);
      
      const logs = manager.getAuditLogs(tenant.id);
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('dns:create');
      expect(logs[0].result).toBe('success');
      expect(logs[0].risk).toBe('low');
    });

    it('監査ログが正しくフィルタリングされること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      // 複数のログを追加
      const logs = [
        {
          tenantId: tenant.id,
          userId: 'user-123',
          action: 'dns:create',
          resource: { type: 'dns-record', id: 'record-1', name: 'test1.example.com' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          result: 'success' as const,
          details: {},
          risk: 'low' as const
        },
        {
          tenantId: tenant.id,
          userId: 'user-456',
          action: 'dns:delete',
          resource: { type: 'dns-record', id: 'record-2', name: 'test2.example.com' },
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0...',
          result: 'success' as const,
          details: {},
          risk: 'medium' as const
        }
      ];

      logs.forEach(log => manager.logAuditEvent(log));
      
      // アクションでフィルタリング
      const createLogs = manager.getAuditLogs(tenant.id, { action: 'dns:create' });
      expect(createLogs).toHaveLength(1);
      expect(createLogs[0].action).toBe('dns:create');
      
      // ユーザーでフィルタリング
      const user123Logs = manager.getAuditLogs(tenant.id, { userId: 'user-123' });
      expect(user123Logs).toHaveLength(1);
      expect(user123Logs[0].userId).toBe('user-123');
      
      // リスクレベルでフィルタリング
      const mediumRiskLogs = manager.getAuditLogs(tenant.id, { risk: 'medium' });
      expect(mediumRiskLogs).toHaveLength(1);
      expect(mediumRiskLogs[0].risk).toBe('medium');
    });

    it('監査ログの制限とページネーションが正しく機能すること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      // 複数のログを追加
      for (let i = 0; i < 10; i++) {
        manager.logAuditEvent({
          tenantId: tenant.id,
          userId: 'user-123',
          action: 'dns:create',
          resource: { type: 'dns-record', id: `record-${i}`, name: `test${i}.example.com` },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          result: 'success',
          details: {},
          risk: 'low'
        });
      }
      
      // 制限とオフセットのテスト
      const firstPage = manager.getAuditLogs(tenant.id, { limit: 5, offset: 0 });
      expect(firstPage).toHaveLength(5);
      
      const secondPage = manager.getAuditLogs(tenant.id, { limit: 5, offset: 5 });
      expect(secondPage).toHaveLength(5);
      
      // 重複がないことを確認
      const firstPageIds = firstPage.map(log => log.id);
      const secondPageIds = secondPage.map(log => log.id);
      expect(firstPageIds).not.toEqual(secondPageIds);
    });

    it('存在しないテナントの監査ログが空配列を返すこと', () => {
      const logs = manager.getAuditLogs('non-existent-tenant');
      expect(logs).toEqual([]);
    });
  });

  describe('リソース管理', () => {
    it('テナントリソースが正しく作成されること', async () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      const resourceData = {
        type: 'dns-zone' as const,
        name: 'example.com',
        configuration: {
          ttl: 3600,
          records: 10
        },
        status: 'active' as const,
        createdBy: 'user-123',
        tags: ['production', 'primary'],
        metadata: {
          version: '1.0.0',
          lastModified: new Date(),
          modifiedBy: 'user-123'
        }
      };

      const resource = await manager.createResource(tenant.id, resourceData);
      
      expect(resource.id).toBeDefined();
      expect(resource.tenantId).toBe(tenant.id);
      expect(resource.type).toBe('dns-zone');
      expect(resource.name).toBe('example.com');
      expect(resource.createdAt).toBeDefined();
      expect(resource.updatedAt).toBeDefined();
    });

    it('テナントリソースが正しく取得されること', async () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      // 複数のリソースを作成
      await Promise.all([
        manager.createResource(tenant.id, {
          type: 'dns-zone',
          name: 'example.com',
          configuration: {},
          status: 'active',
          createdBy: 'user-123',
          tags: [],
          metadata: {
            version: '1.0.0',
            lastModified: new Date(),
            modifiedBy: 'user-123'
          }
        }),
        manager.createResource(tenant.id, {
          type: 'dns-record',
          name: 'api.example.com',
          configuration: {},
          status: 'active',
          createdBy: 'user-123',
          tags: [],
          metadata: {
            version: '1.0.0',
            lastModified: new Date(),
            modifiedBy: 'user-123'
          }
        })
      ]);

      const allResources = manager.getTenantResources(tenant.id);
      expect(allResources).toHaveLength(2);
      
      const zoneResources = manager.getTenantResources(tenant.id, 'dns-zone');
      expect(zoneResources).toHaveLength(1);
      expect(zoneResources[0].type).toBe('dns-zone');
    });

    it('存在しないテナントでのリソース作成でエラーが発生すること', async () => {
      await expect(manager.createResource('non-existent-tenant', {
        type: 'dns-zone',
        name: 'example.com',
        configuration: {},
        status: 'active',
        createdBy: 'user-123',
        tags: [],
        metadata: {
          version: '1.0.0',
          lastModified: new Date(),
          modifiedBy: 'user-123'
        }
      })).rejects.toThrow('テナントが見つかりません');
    });
  });

  describe('請求情報', () => {
    it('テナント請求情報が正しく取得されること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      const billing = manager.getTenantBilling(tenant.id);
      
      expect(billing).toBeDefined();
      expect(billing!.tenantId).toBe(tenant.id);
      expect(billing!.subscription.planId).toBe(tenant.subscription.planId);
      expect(billing!.subscription.status).toBe(tenant.subscription.status);
    });

    it('存在しないテナントの請求情報取得でundefinedが返されること', () => {
      const billing = manager.getTenantBilling('non-existent-tenant');
      expect(billing).toBeUndefined();
    });
  });

  describe('分離設定', () => {
    it('テナント分離設定が正しく取得されること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      const isolation = manager.getTenantIsolation(tenant.id);
      
      expect(isolation).toBeDefined();
      expect(isolation!.tenantId).toBe(tenant.id);
      expect(isolation!.isolation.database.schema).toBe(`tenant_${tenant.id}`);
      expect(isolation!.isolation.storage.bucket).toBe(`dnsweeper-${tenant.id}`);
    });

    it('存在しないテナントの分離設定取得でundefinedが返されること', () => {
      const isolation = manager.getTenantIsolation('non-existent-tenant');
      expect(isolation).toBeUndefined();
    });
  });

  describe('統計情報', () => {
    it('テナント統計が正しく取得されること', async () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      // テストデータを作成
      await manager.createUser(tenant.id, {
        email: 'user@test.com',
        role: 'admin',
        permissions: ['dns:read'],
        status: 'active',
        profile: {
          name: 'Test User',
          timezone: 'UTC',
          language: 'en',
          preferences: {
            notifications: true,
            emailDigest: true,
            theme: 'light'
          }
        },
        mfa: { enabled: false }
      });

      await manager.createResource(tenant.id, {
        type: 'dns-zone',
        name: 'example.com',
        configuration: {},
        status: 'active',
        createdBy: 'user-123',
        tags: [],
        metadata: {
          version: '1.0.0',
          lastModified: new Date(),
          modifiedBy: 'user-123'
        }
      });

      const stats = manager.getTenantStats(tenant.id);
      
      expect(stats.overview.totalUsers).toBe(1);
      expect(stats.overview.totalResources).toBe(1);
      expect(stats.quota).toBeDefined();
      expect(stats.recent.auditLogs).toBeDefined();
      expect(stats.recent.resources).toBeDefined();
    });

    it('システム全体の統計が正しく取得されること', () => {
      const systemStats = manager.getSystemStats();
      
      expect(systemStats.totalTenants).toBe(2); // デフォルトの2テナント
      expect(systemStats.activeTenants).toBe(2);
      expect(systemStats.totalUsers).toBe(0);
      expect(systemStats.totalResources).toBe(0);
      expect(systemStats.planDistribution).toBeDefined();
      expect(systemStats.regionDistribution).toBeDefined();
    });
  });

  describe('接続管理', () => {
    it('アクティブ接続の追跡が正しく機能すること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      expect(manager.getActiveConnections(tenant.id)).toBe(0);
      
      manager.trackConnection(tenant.id, 'user-123');
      expect(manager.getActiveConnections(tenant.id)).toBe(1);
      
      manager.trackConnection(tenant.id, 'user-456');
      expect(manager.getActiveConnections(tenant.id)).toBe(2);
    });

    it('接続の削除が正しく機能すること', () => {
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      manager.trackConnection(tenant.id, 'user-123');
      manager.trackConnection(tenant.id, 'user-456');
      
      manager.removeConnection(tenant.id, 'user-123');
      expect(manager.getActiveConnections(tenant.id)).toBe(1);
      
      manager.removeConnection(tenant.id, 'user-456');
      expect(manager.getActiveConnections(tenant.id)).toBe(0);
    });

    it('存在しないテナントの接続数が0を返すこと', () => {
      const connections = manager.getActiveConnections('non-existent-tenant');
      expect(connections).toBe(0);
    });
  });

  describe('システム管理', () => {
    it('システムが正常にシャットダウンされること', async () => {
      const shutdownPromise = manager.shutdown();
      
      await expect(shutdownPromise).resolves.toBeUndefined();
      
      // シャットダウン後は接続がクリアされているはず
      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      manager.trackConnection(tenant.id, 'user-123');
      expect(manager.getActiveConnections(tenant.id)).toBe(0);
    });
  });

  describe('イベント', () => {
    it('テナント作成時にイベントが発生すること', async () => {
      let createdTenant: Tenant | null = null;
      
      manager.on('tenant:created', (tenant) => {
        createdTenant = tenant;
      });

      const tenantData = {
        name: 'Event Test Tenant',
        domain: 'event.test.com',
        plan: 'free' as const,
        status: 'active' as const,
        settings: {
          maxDNSRecords: 50,
          maxQueriesPerMonth: 5000,
          maxUsers: 3,
          apiRateLimit: 50,
          allowedFeatures: ['basic-dns'],
          retention: {
            logs: 30,
            metrics: 30,
            backups: 7
          }
        },
        subscription: {
          planId: 'free-plan',
          status: 'active' as const,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
          usage: {
            dnsRecords: 0,
            queriesThisMonth: 0,
            activeUsers: 0,
            apiCalls: 0
          }
        },
        metadata: {
          contactEmail: 'test@event.test.com'
        }
      };

      await manager.createTenant(tenantData);
      
      expect(createdTenant).toBeDefined();
      expect(createdTenant!.name).toBe('Event Test Tenant');
    });

    it('テナント更新時にイベントが発生すること', async () => {
      let updatedTenant: Tenant | null = null;
      
      manager.on('tenant:updated', (tenant) => {
        updatedTenant = tenant;
      });

      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      await manager.updateTenant(tenant.id, { name: 'Updated Name' });
      
      expect(updatedTenant).toBeDefined();
      expect(updatedTenant!.name).toBe('Updated Name');
    });

    it('テナント削除時にイベントが発生すること', async () => {
      let deletedTenant: Tenant | null = null;
      
      manager.on('tenant:deleted', (tenant) => {
        deletedTenant = tenant;
      });

      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      await manager.deleteTenant(tenant.id);
      
      expect(deletedTenant).toBeDefined();
      expect(deletedTenant!.id).toBe(tenant.id);
    });

    it('監査ログ記録時にイベントが発生すること', () => {
      let loggedAudit: TenantAuditLog | null = null;
      
      manager.on('audit:logged', (auditLog) => {
        loggedAudit = auditLog;
      });

      const tenants = manager.getAllTenants();
      const tenant = tenants[0];
      
      const auditData = {
        tenantId: tenant.id,
        userId: 'user-123',
        action: 'dns:create',
        resource: { type: 'dns-record', id: 'record-123', name: 'test.example.com' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        result: 'success' as const,
        details: {},
        risk: 'low' as const
      };

      manager.logAuditEvent(auditData);
      
      expect(loggedAudit).toBeDefined();
      expect(loggedAudit!.action).toBe('dns:create');
    });
  });
});