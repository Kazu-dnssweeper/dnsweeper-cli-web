/**
 * エンタープライズ・オーケストレーター統合テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnterpriseOrchestrator, Tenant, OrchestrationJob } from '../../src/lib/enterprise-orchestrator.js';
import { Logger } from '../../src/lib/logger.js';

describe('EnterpriseOrchestrator', () => {
  let orchestrator: EnterpriseOrchestrator;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = new Logger({ level: 'error' }); // テスト中はエラーのみ
    orchestrator = new EnterpriseOrchestrator(mockLogger, {
      maxConcurrentJobs: 3,
      jobTimeoutMs: 10000,
      resourceLimits: {
        maxMemoryMB: 512,
        maxCpuPercent: 50,
        maxNetworkBandwidth: 50
      },
      tenantIsolation: {
        enabled: true,
        sandboxMode: true,
        resourceQuotas: true
      },
      monitoring: {
        metricsEnabled: true,
        alertingEnabled: true,
        auditLogging: true
      }
    });
  });

  afterEach(async () => {
    await orchestrator.shutdown();
  });

  describe('テナント管理', () => {
    it('テナントを作成できること', async () => {
      const tenantData = {
        name: 'テストテナント',
        organizationId: 'org-1',
        domain: 'test.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: ['cloudflare'],
          customDomains: ['test.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      const tenant = await orchestrator.createTenant(tenantData);

      expect(tenant.id).toBeDefined();
      expect(tenant.name).toBe('テストテナント');
      expect(tenant.organizationId).toBe('org-1');
      expect(tenant.domain).toBe('test.com');
      expect(tenant.status).toBe('active');
      expect(tenant.createdAt).toBeInstanceOf(Date);
      expect(tenant.updatedAt).toBeInstanceOf(Date);
    });

    it('テナントを取得できること', async () => {
      const tenantData = {
        name: 'テストテナント',
        organizationId: 'org-1',
        domain: 'test.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: ['cloudflare'],
          customDomains: ['test.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      const createdTenant = await orchestrator.createTenant(tenantData);
      const retrievedTenant = orchestrator.getTenant(createdTenant.id);

      expect(retrievedTenant).toBeDefined();
      expect(retrievedTenant!.id).toBe(createdTenant.id);
      expect(retrievedTenant!.name).toBe('テストテナント');
    });

    it('組織でテナントをフィルタリングできること', async () => {
      const tenant1Data = {
        name: 'テナント1',
        organizationId: 'org-1',
        domain: 'test1.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: ['test1.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test1.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      const tenant2Data = {
        name: 'テナント2',
        organizationId: 'org-2',
        domain: 'test2.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: ['test2.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test2.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      await orchestrator.createTenant(tenant1Data);
      await orchestrator.createTenant(tenant2Data);

      const org1Tenants = orchestrator.getTenants('org-1');
      const org2Tenants = orchestrator.getTenants('org-2');

      expect(org1Tenants).toHaveLength(1);
      expect(org1Tenants[0].name).toBe('テナント1');
      expect(org2Tenants).toHaveLength(1);
      expect(org2Tenants[0].name).toBe('テナント2');
    });

    it('テナント設定を更新できること', async () => {
      const tenantData = {
        name: 'テストテナント',
        organizationId: 'org-1',
        domain: 'test.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: ['test.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      const tenant = await orchestrator.createTenant(tenantData);
      const originalUpdatedAt = tenant.updatedAt;

      await orchestrator.updateTenantSettings(tenant.id, {
        securityPolicies: {
          threatDetection: true,
          realTimeMonitoring: true,
          aiOptimization: true,
          confidenceThreshold: 80
        }
      });

      const updatedTenant = orchestrator.getTenant(tenant.id);

      expect(updatedTenant!.settings.securityPolicies.threatDetection).toBe(true);
      expect(updatedTenant!.settings.securityPolicies.realTimeMonitoring).toBe(true);
      expect(updatedTenant!.settings.securityPolicies.aiOptimization).toBe(true);
      expect(updatedTenant!.settings.securityPolicies.confidenceThreshold).toBe(80);
      expect(updatedTenant!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('ジョブ管理', () => {
    let tenant: Tenant;

    beforeEach(async () => {
      const tenantData = {
        name: 'テストテナント',
        organizationId: 'org-1',
        domain: 'test.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: ['test.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      tenant = await orchestrator.createTenant(tenantData);
    });

    it('DNS分析ジョブを作成できること', async () => {
      const job = await orchestrator.createJob(
        tenant.id,
        'dns-analysis',
        {
          domains: ['test.com', 'example.com'],
          recordTypes: ['A', 'CNAME', 'MX']
        },
        'high'
      );

      expect(job.id).toBeDefined();
      expect(job.tenantId).toBe(tenant.id);
      expect(job.type).toBe('dns-analysis');
      expect(job.status).toBe('pending');
      expect(job.priority).toBe('high');
      expect(job.progress).toBe(0);
      expect(job.estimatedDuration).toBeGreaterThan(0);
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('セキュリティスキャンジョブを作成できること', async () => {
      const job = await orchestrator.createJob(
        tenant.id,
        'security-scan',
        {
          domains: ['test.com'],
          records: []
        },
        'critical'
      );

      expect(job.id).toBeDefined();
      expect(job.tenantId).toBe(tenant.id);
      expect(job.type).toBe('security-scan');
      expect(job.status).toBe('pending');
      expect(job.priority).toBe('critical');
    });

    it('AI最適化ジョブを作成できること', async () => {
      const job = await orchestrator.createJob(
        tenant.id,
        'optimization',
        {
          domains: ['test.com'],
          industry: 'technology',
          size: 'small',
          budget: 'medium'
        },
        'medium'
      );

      expect(job.id).toBeDefined();
      expect(job.tenantId).toBe(tenant.id);
      expect(job.type).toBe('optimization');
      expect(job.status).toBe('pending');
      expect(job.priority).toBe('medium');
    });

    it('バルクオペレーションジョブを作成できること', async () => {
      const job = await orchestrator.createJob(
        tenant.id,
        'bulk-operation',
        {
          operation: 'add-record',
          targets: [
            { domain: 'test.com', type: 'A', value: '1.2.3.4' },
            { domain: 'test.com', type: 'CNAME', value: 'www.test.com' }
          ]
        },
        'low'
      );

      expect(job.id).toBeDefined();
      expect(job.tenantId).toBe(tenant.id);
      expect(job.type).toBe('bulk-operation');
      expect(job.status).toBe('pending');
      expect(job.priority).toBe('low');
    });

    it('レポート生成ジョブを作成できること', async () => {
      const job = await orchestrator.createJob(
        tenant.id,
        'report-generation',
        {
          reportType: 'security',
          dateRange: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          },
          format: 'pdf'
        },
        'medium'
      );

      expect(job.id).toBeDefined();
      expect(job.tenantId).toBe(tenant.id);
      expect(job.type).toBe('report-generation');
      expect(job.status).toBe('pending');
      expect(job.priority).toBe('medium');
    });

    it('ジョブを取得できること', async () => {
      const createdJob = await orchestrator.createJob(
        tenant.id,
        'dns-analysis',
        {
          domains: ['test.com']
        }
      );

      const retrievedJob = orchestrator.getJob(createdJob.id);

      expect(retrievedJob).toBeDefined();
      expect(retrievedJob!.id).toBe(createdJob.id);
      expect(retrievedJob!.tenantId).toBe(tenant.id);
      expect(retrievedJob!.type).toBe('dns-analysis');
    });

    it('テナントのジョブ一覧を取得できること', async () => {
      await orchestrator.createJob(tenant.id, 'dns-analysis', { domains: ['test1.com'] });
      await orchestrator.createJob(tenant.id, 'security-scan', { domains: ['test2.com'] });

      const jobs = orchestrator.getTenantJobs(tenant.id);

      expect(jobs).toHaveLength(2);
      expect(jobs.every(job => job.tenantId === tenant.id)).toBe(true);
    });

    it('存在しないテナントでジョブ作成時にエラーが発生すること', async () => {
      await expect(
        orchestrator.createJob(
          'non-existent-tenant',
          'dns-analysis',
          { domains: ['test.com'] }
        )
      ).rejects.toThrow('テナントが見つかりません');
    });
  });

  describe('イベント処理', () => {
    it('テナント作成イベントを発行すること', async () => {
      const eventListener = vi.fn();
      orchestrator.on('tenant-created', eventListener);

      const tenantData = {
        name: 'テストテナント',
        organizationId: 'org-1',
        domain: 'test.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: ['test.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      await orchestrator.createTenant(tenantData);

      expect(eventListener).toHaveBeenCalledTimes(1);
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'テストテナント',
          organizationId: 'org-1',
          domain: 'test.com'
        })
      );
    });

    it('テナント設定更新イベントを発行すること', async () => {
      const eventListener = vi.fn();
      orchestrator.on('tenant-settings-updated', eventListener);

      const tenantData = {
        name: 'テストテナント',
        organizationId: 'org-1',
        domain: 'test.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: ['test.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      const tenant = await orchestrator.createTenant(tenantData);

      await orchestrator.updateTenantSettings(tenant.id, {
        securityPolicies: {
          threatDetection: true,
          realTimeMonitoring: true,
          aiOptimization: true,
          confidenceThreshold: 80
        }
      });

      expect(eventListener).toHaveBeenCalledTimes(1);
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tenant.id,
          settings: expect.objectContaining({
            securityPolicies: expect.objectContaining({
              threatDetection: true,
              realTimeMonitoring: true,
              aiOptimization: true
            })
          })
        })
      );
    });

    it('ジョブ作成イベントを発行すること', async () => {
      const eventListener = vi.fn();
      orchestrator.on('job-created', eventListener);

      const tenantData = {
        name: 'テストテナント',
        organizationId: 'org-1',
        domain: 'test.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: ['test.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      const tenant = await orchestrator.createTenant(tenantData);

      await orchestrator.createJob(
        tenant.id,
        'dns-analysis',
        { domains: ['test.com'] }
      );

      expect(eventListener).toHaveBeenCalledTimes(1);
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: tenant.id,
          type: 'dns-analysis',
          status: 'pending'
        })
      );
    });
  });

  describe('統計情報', () => {
    it('統計情報を取得できること', async () => {
      const tenantData = {
        name: 'テストテナント',
        organizationId: 'org-1',
        domain: 'test.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: ['test.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      const tenant = await orchestrator.createTenant(tenantData);
      await orchestrator.createJob(tenant.id, 'dns-analysis', { domains: ['test.com'] });
      await orchestrator.createJob(tenant.id, 'security-scan', { domains: ['test.com'] });

      const stats = orchestrator.getStatistics();

      expect(stats.totalTenants).toBe(1);
      expect(stats.activeTenants).toBe(1);
      expect(stats.totalJobs).toBe(2);
      expect(stats.runningJobs).toBe(0);
      expect(stats.completedJobs).toBe(0);
      expect(stats.failedJobs).toBe(0);
    });

    it('パフォーマンスメトリクスを取得できること', async () => {
      const metrics = orchestrator.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないテナントの取得時にundefinedを返すこと', () => {
      const tenant = orchestrator.getTenant('non-existent-tenant');
      expect(tenant).toBeUndefined();
    });

    it('存在しないジョブの取得時にundefinedを返すこと', () => {
      const job = orchestrator.getJob('non-existent-job');
      expect(job).toBeUndefined();
    });

    it('存在しないテナントの設定更新時にエラーが発生すること', async () => {
      await expect(
        orchestrator.updateTenantSettings('non-existent-tenant', {
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          }
        })
      ).rejects.toThrow('テナントが見つかりません');
    });
  });

  describe('リソース制限', () => {
    it('リソース制限を超えた場合にエラーが発生すること', async () => {
      const tenantData = {
        name: 'テストテナント',
        organizationId: 'org-1',
        domain: 'test.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: ['test.com']
        },
        resources: {
          maxDomains: 1,
          maxRecords: 1,
          maxQueries: 1,
          maxUsers: 1,
          storageLimit: 1,
          computeLimit: 1,
          currentUsage: {
            domains: 1,
            records: 1,
            queries: 1,
            users: 1,
            storage: 1,
            compute: 1
          }
        },
        permissions: {
          adminUsers: ['admin@test.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      const tenant = await orchestrator.createTenant(tenantData);

      await expect(
        orchestrator.createJob(
          tenant.id,
          'dns-analysis',
          { domains: ['test.com'] }
        )
      ).rejects.toThrow('制限に達しました');
    });
  });

  describe('正常終了', () => {
    it('正常終了処理が正しく動作すること', async () => {
      const tenantData = {
        name: 'テストテナント',
        organizationId: 'org-1',
        domain: 'test.com',
        status: 'active' as const,
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: true,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: true,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: ['test.com']
        },
        resources: {
          maxDomains: 50,
          maxRecords: 500,
          maxQueries: 5000,
          maxUsers: 5,
          storageLimit: 500,
          computeLimit: 50,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: ['admin@test.com'],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        }
      };

      await orchestrator.createTenant(tenantData);
      
      // 正常終了処理は例外を発生させない
      await expect(orchestrator.shutdown()).resolves.not.toThrow();
    });
  });
});