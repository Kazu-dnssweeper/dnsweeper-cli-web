/**
 * EnterpriseTenantManager テストスイート
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnterpriseTenantManager } from '../../../src/lib/enterprise-tenant-manager.js';
import { Logger } from '../../../src/lib/logger.js';

describe('EnterpriseTenantManager', () => {
  let tenantManager: EnterpriseTenantManager;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ logLevel: 'error' }); // テスト中はエラーのみログ出力
    tenantManager = new EnterpriseTenantManager(logger, {
      resourceQuotas: true,
      auditLogging: false, // テスト中は監査ログを無効化
    });
  });

  describe('createTenant', () => {
    it('新しいテナントを作成できる', async () => {
      const tenantData = {
        name: 'Test Tenant',
        organizationId: 'org-123',
        domain: 'test.example.com',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: true,
            confidenceThreshold: 80,
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 1000,
              errorRate: 5,
              throughput: 100,
            },
          },
          integrationsEnabled: ['cloudflare'],
          customDomains: ['test.example.com'],
        },
        resources: {
          maxDomains: 10,
          maxRecords: 1000,
          maxQueries: 100000,
          maxUsers: 20,
          storageLimit: 1073741824,
          computeLimit: 500,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0,
          },
        },
        permissions: {
          adminUsers: ['admin@example.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {},
        },
        status: 'active' as const,
      };

      const tenant = await tenantManager.createTenant(tenantData);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('Test Tenant');
      expect(tenant.organizationId).toBe('org-123');
      expect(tenant.domain).toBe('test.example.com');
      expect(tenant.status).toBe('active');
      expect(tenant.createdAt).toBeInstanceOf(Date);
      expect(tenant.updatedAt).toBeInstanceOf(Date);
    });

    it('デフォルトリソース制限を適用する', async () => {
      const tenantData = {
        name: 'Test Tenant',
        organizationId: 'org-123',
        domain: 'test.example.com',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: true,
            confidenceThreshold: 80,
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 1000,
              errorRate: 5,
              throughput: 100,
            },
          },
          integrationsEnabled: [],
          customDomains: [],
        },
        resources: {
          maxDomains: 5, // デフォルトより小さい値
          maxRecords: 5000,
          maxQueries: 50000,
          maxUsers: 10,
          storageLimit: 536870912,
          computeLimit: 250,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0,
          },
        },
        permissions: {
          adminUsers: [],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {},
        },
        status: 'active' as const,
      };

      const tenant = await tenantManager.createTenant(tenantData);

      // デフォルト値よりも指定した値が優先される
      expect(tenant.resources.maxDomains).toBe(5);
      expect(tenant.resources.currentUsage.domains).toBe(0);
    });

    it('テナント作成イベントを発行する', async () => {
      const eventSpy = vi.fn();
      tenantManager.on('tenant-created', eventSpy);

      const tenantData = {
        name: 'Event Test Tenant',
        organizationId: 'org-456',
        domain: 'event.example.com',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 50,
          },
          performanceSettings: {
            monitoringEnabled: false,
            alertThresholds: {
              responseTime: 2000,
              errorRate: 10,
              throughput: 50,
            },
          },
          integrationsEnabled: [],
          customDomains: [],
        },
        resources: {
          maxDomains: 1,
          maxRecords: 100,
          maxQueries: 10000,
          maxUsers: 5,
          storageLimit: 104857600,
          computeLimit: 100,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0,
          },
        },
        permissions: {
          adminUsers: [],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {},
        },
        status: 'active' as const,
      };

      const tenant = await tenantManager.createTenant(tenantData);

      expect(eventSpy).toHaveBeenCalledWith(tenant);
    });
  });

  describe('getTenant', () => {
    it('存在するテナントを取得できる', async () => {
      const tenantData = {
        name: 'Get Test Tenant',
        organizationId: 'org-789',
        domain: 'get.example.com',
        settings: {
          dnsResolvers: ['1.1.1.1'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: true,
            aiOptimization: false,
            confidenceThreshold: 90,
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 500,
              errorRate: 2,
              throughput: 200,
            },
          },
          integrationsEnabled: ['route53'],
          customDomains: ['get.example.com'],
        },
        resources: {
          maxDomains: 20,
          maxRecords: 2000,
          maxQueries: 200000,
          maxUsers: 40,
          storageLimit: 2147483648,
          computeLimit: 1000,
          currentUsage: {
            domains: 1,
            records: 50,
            queries: 1000,
            users: 3,
            storage: 52428800,
            compute: 25,
          },
        },
        permissions: {
          adminUsers: ['admin@get.example.com'],
          readOnlyUsers: ['user@get.example.com'],
          customRoles: {
            'dns-manager': {
              permissions: ['dns:read', 'dns:write'],
              users: ['manager@get.example.com'],
            },
          },
          apiKeys: {},
        },
        status: 'active' as const,
      };

      const createdTenant = await tenantManager.createTenant(tenantData);
      const retrievedTenant = tenantManager.getTenant(createdTenant.id);

      expect(retrievedTenant).toBeDefined();
      expect(retrievedTenant?.id).toBe(createdTenant.id);
      expect(retrievedTenant?.name).toBe('Get Test Tenant');
    });

    it('存在しないテナントに対してundefinedを返す', () => {
      const result = tenantManager.getTenant('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('updateTenant', () => {
    it('テナントを更新できる', async () => {
      const tenantData = {
        name: 'Update Test Tenant',
        organizationId: 'org-update',
        domain: 'update.example.com',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 60,
          },
          performanceSettings: {
            monitoringEnabled: false,
            alertThresholds: {
              responseTime: 3000,
              errorRate: 15,
              throughput: 30,
            },
          },
          integrationsEnabled: [],
          customDomains: [],
        },
        resources: {
          maxDomains: 5,
          maxRecords: 500,
          maxQueries: 50000,
          maxUsers: 10,
          storageLimit: 536870912,
          computeLimit: 250,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0,
          },
        },
        permissions: {
          adminUsers: [],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {},
        },
        status: 'active' as const,
      };

      const originalTenant = await tenantManager.createTenant(tenantData);

      const updates = {
        name: 'Updated Tenant Name',
        status: 'suspended' as const,
      };

      const updatedTenant = await tenantManager.updateTenant(originalTenant.id, updates);

      expect(updatedTenant.name).toBe('Updated Tenant Name');
      expect(updatedTenant.status).toBe('suspended');
      expect(updatedTenant.id).toBe(originalTenant.id);
      expect(updatedTenant.createdAt).toEqual(originalTenant.createdAt);
      expect(updatedTenant.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTenant.updatedAt.getTime());
    });

    it('存在しないテナントの更新でエラーを投げる', async () => {
      await expect(
        tenantManager.updateTenant('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow('テナント non-existent-id が見つかりません');
    });

    it('テナント更新イベントを発行する', async () => {
      const eventSpy = vi.fn();
      tenantManager.on('tenant-updated', eventSpy);

      const tenantData = {
        name: 'Event Update Tenant',
        organizationId: 'org-event-update',
        domain: 'event-update.example.com',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 50,
          },
          performanceSettings: {
            monitoringEnabled: false,
            alertThresholds: {
              responseTime: 2000,
              errorRate: 10,
              throughput: 50,
            },
          },
          integrationsEnabled: [],
          customDomains: [],
        },
        resources: {
          maxDomains: 1,
          maxRecords: 100,
          maxQueries: 10000,
          maxUsers: 5,
          storageLimit: 104857600,
          computeLimit: 100,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0,
          },
        },
        permissions: {
          adminUsers: [],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {},
        },
        status: 'active' as const,
      };

      const tenant = await tenantManager.createTenant(tenantData);
      const updatedTenant = await tenantManager.updateTenant(tenant.id, { name: 'Updated Name' });

      expect(eventSpy).toHaveBeenCalledWith(updatedTenant);
    });
  });

  describe('deleteTenant', () => {
    it('テナントを削除できる', async () => {
      const tenantData = {
        name: 'Delete Test Tenant',
        organizationId: 'org-delete',
        domain: 'delete.example.com',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 50,
          },
          performanceSettings: {
            monitoringEnabled: false,
            alertThresholds: {
              responseTime: 2000,
              errorRate: 10,
              throughput: 50,
            },
          },
          integrationsEnabled: [],
          customDomains: [],
        },
        resources: {
          maxDomains: 1,
          maxRecords: 100,
          maxQueries: 10000,
          maxUsers: 5,
          storageLimit: 104857600,
          computeLimit: 100,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0,
          },
        },
        permissions: {
          adminUsers: [],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {},
        },
        status: 'active' as const,
      };

      const tenant = await tenantManager.createTenant(tenantData);

      await tenantManager.deleteTenant(tenant.id);

      const retrievedTenant = tenantManager.getTenant(tenant.id);
      expect(retrievedTenant).toBeUndefined();
    });

    it('存在しないテナントの削除でエラーを投げる', async () => {
      await expect(
        tenantManager.deleteTenant('non-existent-id')
      ).rejects.toThrow('テナント non-existent-id が見つかりません');
    });

    it('テナント削除イベントを発行する', async () => {
      const eventSpy = vi.fn();
      tenantManager.on('tenant-deleted', eventSpy);

      const tenantData = {
        name: 'Event Delete Tenant',
        organizationId: 'org-event-delete',
        domain: 'event-delete.example.com',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 50,
          },
          performanceSettings: {
            monitoringEnabled: false,
            alertThresholds: {
              responseTime: 2000,
              errorRate: 10,
              throughput: 50,
            },
          },
          integrationsEnabled: [],
          customDomains: [],
        },
        resources: {
          maxDomains: 1,
          maxRecords: 100,
          maxQueries: 10000,
          maxUsers: 5,
          storageLimit: 104857600,
          computeLimit: 100,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0,
          },
        },
        permissions: {
          adminUsers: [],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {},
        },
        status: 'active' as const,
      };

      const tenant = await tenantManager.createTenant(tenantData);
      await tenantManager.deleteTenant(tenant.id);

      expect(eventSpy).toHaveBeenCalledWith({
        tenantId: tenant.id,
        tenant,
      });
    });
  });

  describe('updateResourceUsage', () => {
    it('リソース使用量を更新できる', async () => {
      const tenantData = {
        name: 'Resource Test Tenant',
        organizationId: 'org-resource',
        domain: 'resource.example.com',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 50,
          },
          performanceSettings: {
            monitoringEnabled: false,
            alertThresholds: {
              responseTime: 2000,
              errorRate: 10,
              throughput: 50,
            },
          },
          integrationsEnabled: [],
          customDomains: [],
        },
        resources: {
          maxDomains: 10,
          maxRecords: 1000,
          maxQueries: 100000,
          maxUsers: 20,
          storageLimit: 1073741824,
          computeLimit: 500,
          currentUsage: {
            domains: 1,
            records: 10,
            queries: 100,
            users: 2,
            storage: 1048576,
            compute: 5,
          },
        },
        permissions: {
          adminUsers: [],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {},
        },
        status: 'active' as const,
      };

      const tenant = await tenantManager.createTenant(tenantData);

      await tenantManager.updateResourceUsage(tenant.id, {
        domains: 3,
        queries: 500,
      });

      const updatedTenant = tenantManager.getTenant(tenant.id);
      expect(updatedTenant?.resources.currentUsage.domains).toBe(3);
      expect(updatedTenant?.resources.currentUsage.queries).toBe(500);
      expect(updatedTenant?.resources.currentUsage.records).toBe(10); // 元の値が保持される
    });

    it('クォータ超過でエラーを投げる', async () => {
      const tenantData = {
        name: 'Quota Test Tenant',
        organizationId: 'org-quota',
        domain: 'quota.example.com',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 50,
          },
          performanceSettings: {
            monitoringEnabled: false,
            alertThresholds: {
              responseTime: 2000,
              errorRate: 10,
              throughput: 50,
            },
          },
          integrationsEnabled: [],
          customDomains: [],
        },
        resources: {
          maxDomains: 5,
          maxRecords: 100,
          maxQueries: 1000,
          maxUsers: 10,
          storageLimit: 10485760,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0,
          },
        },
        permissions: {
          adminUsers: [],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {},
        },
        status: 'active' as const,
      };

      const tenant = await tenantManager.createTenant(tenantData);

      await expect(
        tenantManager.updateResourceUsage(tenant.id, {
          domains: 10, // maxDomains (5) を超過
        })
      ).rejects.toThrow('ドメイン数がクォータを超過しています');
    });
  });

  describe('getTenantStatistics', () => {
    it('テナント統計を取得できる', async () => {
      // テスト用に複数のテナントを作成
      const baseData = {
        organizationId: 'org-stats',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 50,
          },
          performanceSettings: {
            monitoringEnabled: false,
            alertThresholds: {
              responseTime: 2000,
              errorRate: 10,
              throughput: 50,
            },
          },
          integrationsEnabled: [],
          customDomains: [],
        },
        resources: {
          maxDomains: 5,
          maxRecords: 500,
          maxQueries: 50000,
          maxUsers: 10,
          storageLimit: 536870912,
          computeLimit: 250,
          currentUsage: {
            domains: 2,
            records: 50,
            queries: 1000,
            users: 3,
            storage: 52428800,
            compute: 25,
          },
        },
        permissions: {
          adminUsers: [],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {},
        },
      };

      await tenantManager.createTenant({
        ...baseData,
        name: 'Stats Tenant 1',
        domain: 'stats1.example.com',
        status: 'active' as const,
      });

      await tenantManager.createTenant({
        ...baseData,
        name: 'Stats Tenant 2',
        domain: 'stats2.example.com',
        status: 'suspended' as const,
      });

      await tenantManager.createTenant({
        ...baseData,
        name: 'Stats Tenant 3',
        domain: 'stats3.example.com',
        status: 'active' as const,
      });

      const stats = tenantManager.getTenantStatistics();

      expect(stats.totalTenants).toBe(3);
      expect(stats.activeTenants).toBe(2);
      expect(stats.suspendedTenants).toBe(1);
      expect(stats.resourceUtilization.totalDomains).toBe(6); // 2 * 3
      expect(stats.resourceUtilization.totalRecords).toBe(150); // 50 * 3
      expect(stats.resourceUtilization.totalQueries).toBe(3000); // 1000 * 3
    });
  });
});