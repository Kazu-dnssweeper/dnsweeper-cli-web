/**
 * EnterpriseJobOrchestrator テストスイート
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnterpriseJobOrchestrator } from '../../../src/lib/enterprise-job-orchestrator.js';
import { Logger } from '../../../src/lib/logger.js';

// タイマーのモック
vi.useFakeTimers();

describe('EnterpriseJobOrchestrator', () => {
  let jobOrchestrator: EnterpriseJobOrchestrator;
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllTimers();
    logger = new Logger({ logLevel: 'error' }); // テスト中はエラーのみログ出力
    jobOrchestrator = new EnterpriseJobOrchestrator(logger, {
      maxConcurrentJobs: 2,
      jobTimeoutMs: 5000,
      monitoring: {
        metricsEnabled: false,
        alertingEnabled: false,
        auditLogging: false,
      },
      retryPolicy: {
        maxRetries: 1,
        retryDelayMs: 1000,
        backoffMultiplier: 2,
      },
    });
  });

  describe('createJob', () => {
    it('新しいジョブを作成できる', async () => {
      const job = await jobOrchestrator.createJob(
        'tenant-123',
        'dns-analysis',
        { domain: 'example.com' },
        { priority: 'high', estimatedDuration: 30000 }
      );

      expect(job.id).toBeDefined();
      expect(job.tenantId).toBe('tenant-123');
      expect(job.type).toBe('dns-analysis');
      // ジョブは作成と同時に処理が開始される場合がある
      expect(['pending', 'running']).toContain(job.status);
      expect(job.parameters).toEqual({ domain: 'example.com' });
      expect(job.priority).toBe('high');
      expect(job.estimatedDuration).toBe(30000);
      expect(job.progress).toBeGreaterThanOrEqual(0);
      expect(job.createdAt).toBeInstanceOf(Date);
    });

    it('ジョブ作成イベントを発行する', async () => {
      const eventSpy = vi.fn();
      jobOrchestrator.on('job-created', eventSpy);

      const job = await jobOrchestrator.createJob(
        'tenant-456',
        'security-scan',
        { domains: ['example.com', 'test.com'] }
      );

      expect(eventSpy).toHaveBeenCalledWith(job);
    });

    it('デフォルト値を適用する', async () => {
      const job = await jobOrchestrator.createJob(
        'tenant-789',
        'optimization',
        { strategy: 'basic' }
      );

      expect(job.priority).toBe('medium'); // デフォルト
      expect(job.estimatedDuration).toBe(60000); // デフォルト1分
    });
  });

  describe('getJob', () => {
    it('存在するジョブを取得できる', async () => {
      const createdJob = await jobOrchestrator.createJob(
        'tenant-get',
        'dns-analysis',
        { domain: 'get.example.com' }
      );

      const retrievedJob = jobOrchestrator.getJob(createdJob.id);

      expect(retrievedJob).toBeDefined();
      expect(retrievedJob?.id).toBe(createdJob.id);
      expect(retrievedJob?.tenantId).toBe('tenant-get');
    });

    it('存在しないジョブに対してundefinedを返す', () => {
      const result = jobOrchestrator.getJob('non-existent-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getJobsByTenant', () => {
    it('テナントのジョブ一覧を取得できる', async () => {
      const tenantId = 'tenant-list-test';

      const job1 = await jobOrchestrator.createJob(
        tenantId,
        'dns-analysis',
        { domain: 'job1.example.com' }
      );

      const job2 = await jobOrchestrator.createJob(
        tenantId,
        'security-scan',
        { domains: ['job2.example.com'] }
      );

      // 別のテナントのジョブ
      await jobOrchestrator.createJob(
        'other-tenant',
        'optimization',
        { strategy: 'comprehensive' }
      );

      const tenantJobs = jobOrchestrator.getJobsByTenant(tenantId);

      expect(tenantJobs).toHaveLength(2);
      expect(tenantJobs.map(j => j.id)).toContain(job1.id);
      expect(tenantJobs.map(j => j.id)).toContain(job2.id);
      expect(tenantJobs.every(j => j.tenantId === tenantId)).toBe(true);
    });

    it('ジョブが存在しないテナントに対して空配列を返す', () => {
      const result = jobOrchestrator.getJobsByTenant('empty-tenant');
      expect(result).toEqual([]);
    });
  });

  describe('cancelJob', () => {
    it('ペンディング中のジョブをキャンセルできる', async () => {
      const job = await jobOrchestrator.createJob(
        'tenant-cancel',
        'dns-analysis',
        { domain: 'cancel.example.com' }
      );

      await jobOrchestrator.cancelJob(job.id);

      const cancelledJob = jobOrchestrator.getJob(job.id);
      expect(cancelledJob?.status).toBe('cancelled');
      expect(cancelledJob?.completedAt).toBeInstanceOf(Date);
    });

    it('存在しないジョブのキャンセルでエラーを投げる', async () => {
      await expect(
        jobOrchestrator.cancelJob('non-existent-id')
      ).rejects.toThrow('ジョブ non-existent-id が見つかりません');
    });

    it('ジョブキャンセルイベントを発行する', async () => {
      const eventSpy = vi.fn();
      jobOrchestrator.on('job-cancelled', eventSpy);

      const job = await jobOrchestrator.createJob(
        'tenant-cancel-event',
        'dns-analysis',
        { domain: 'cancel-event.example.com' }
      );

      await jobOrchestrator.cancelJob(job.id);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: job.id,
          status: 'cancelled',
        })
      );
    });
  });

  describe('ジョブ実行', () => {
    it('DNS分析ジョブを実行できる', async () => {
      const startedSpy = vi.fn();
      const completedSpy = vi.fn();
      jobOrchestrator.on('job-started', startedSpy);
      jobOrchestrator.on('job-completed', completedSpy);

      const job = await jobOrchestrator.createJob(
        'tenant-dns',
        'dns-analysis',
        { domain: 'dns.example.com' }
      );

      // ジョブプロセッサーがジョブを処理するまで待機
      await vi.advanceTimersByTimeAsync(10000);

      expect(startedSpy).toHaveBeenCalled();

      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: job.id,
          status: 'completed',
          progress: 100,
        })
      );

      const completedJob = jobOrchestrator.getJob(job.id);
      expect(completedJob?.status).toBe('completed');
      expect(completedJob?.result).toBeDefined();
      expect(completedJob?.result?.domain).toBe('dns.example.com');
    });

    it('セキュリティスキャンジョブを実行できる', async () => {
      const progressSpy = vi.fn();
      const completedSpy = vi.fn();
      jobOrchestrator.on('job-progress', progressSpy);
      jobOrchestrator.on('job-completed', completedSpy);

      const domains = ['security1.example.com', 'security2.example.com'];
      const job = await jobOrchestrator.createJob(
        'tenant-security',
        'security-scan',
        { domains }
      );

      // ジョブプロセッサーがジョブを処理するまで待機
      await vi.advanceTimersByTimeAsync(10000);

      expect(progressSpy).toHaveBeenCalled();
      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: job.id,
          status: 'completed',
          progress: 100,
        })
      );

      const completedJob = jobOrchestrator.getJob(job.id);
      expect(completedJob?.result?.scannedDomains).toBe(2);
    });

    it('無効なパラメータでジョブが失敗する', async () => {
      const failedSpy = vi.fn();
      jobOrchestrator.on('job-failed', failedSpy);

      const job = await jobOrchestrator.createJob(
        'tenant-invalid',
        'dns-analysis',
        { /* domain パラメータが不足 */ }
      );

      // ジョブプロセッサーがジョブを処理するまで待機
      await vi.advanceTimersByTimeAsync(10000);

      expect(failedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: job.id,
          status: 'failed',
          error: expect.stringContaining('DNS分析には有効なドメインが必要です'),
        })
      );
    });

    it('ジョブの並列実行制限を守る', async () => {
      const startedSpy = vi.fn();
      jobOrchestrator.on('job-started', startedSpy);

      // 制限値（2）を超える3つのジョブを作成
      const job1 = await jobOrchestrator.createJob(
        'tenant-parallel-1',
        'dns-analysis',
        { domain: 'parallel1.example.com' }
      );

      const job2 = await jobOrchestrator.createJob(
        'tenant-parallel-2',
        'dns-analysis',
        { domain: 'parallel2.example.com' }
      );

      const job3 = await jobOrchestrator.createJob(
        'tenant-parallel-3',
        'dns-analysis',
        { domain: 'parallel3.example.com' }
      );

      // 短時間待機（最初の2つだけが開始されるはず）
      await vi.advanceTimersByTimeAsync(1000);

      // 最初の2つのジョブが開始され、3つ目はまだペンディング
      expect(startedSpy).toHaveBeenCalledTimes(2);

      const job3Status = jobOrchestrator.getJob(job3.id);
      expect(job3Status?.status).toBe('pending');

      // さらに時間を進めて最初のジョブが完了し、3つ目が開始される
      await vi.advanceTimersByTimeAsync(10000);

      expect(startedSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('getJobStatistics', () => {
    it('ジョブ統計を取得できる', async () => {
      // 複数のジョブを作成
      const job1 = await jobOrchestrator.createJob(
        'tenant-stats-1',
        'dns-analysis',
        { domain: 'stats1.example.com' }
      );

      await jobOrchestrator.createJob(
        'tenant-stats-2',
        'security-scan',
        { domains: ['stats2.example.com'] }
      );

      const job3 = await jobOrchestrator.createJob(
        'tenant-stats-3',
        'optimization',
        { strategy: 'basic' }
      );

      // 1つをキャンセル
      await jobOrchestrator.cancelJob(job3.id);

      // ジョブ処理を実行
      await vi.advanceTimersByTimeAsync(10000);

      const stats = jobOrchestrator.getJobStatistics();

      expect(stats.totalJobs).toBe(3);
      expect(stats.completedJobs).toBe(2);
      expect(stats.failedJobs).toBe(0);
      expect(stats.queueLength).toBe(0); // 全て処理済み
      expect(stats.runningJobs).toBe(0); // 全て完了
    });
  });

  describe('進捗報告', () => {
    it('ジョブ進捗イベントを正しく発行する', async () => {
      const progressSpy = vi.fn();
      jobOrchestrator.on('job-progress', progressSpy);

      const job = await jobOrchestrator.createJob(
        'tenant-progress',
        'security-scan',
        { domains: ['progress1.example.com', 'progress2.example.com'] }
      );

      // ジョブプロセッサーがジョブを処理するまで待機
      await vi.advanceTimersByTimeAsync(10000);

      // 進捗イベントが複数回発行されることを確認
      expect(progressSpy).toHaveBeenCalled();
      expect(progressSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: job.id,
          progress: expect.any(Number),
        })
      );

      // 最終的に100%になることを確認
      const finalJob = jobOrchestrator.getJob(job.id);
      expect(finalJob?.progress).toBe(100);
    });
  });

  describe('エラーハンドリング', () => {
    it('完了済みジョブのキャンセルでエラーを投げる', async () => {
      const job = await jobOrchestrator.createJob(
        'tenant-completed',
        'dns-analysis',
        { domain: 'completed.example.com' }
      );

      // ジョブを完了させる
      await vi.advanceTimersByTimeAsync(10000);

      const completedJob = jobOrchestrator.getJob(job.id);
      expect(completedJob?.status).toBe('completed');

      // 完了済みジョブのキャンセルを試行
      await expect(
        jobOrchestrator.cancelJob(job.id)
      ).rejects.toThrow('ジョブ ' + job.id + ' は既に完了しているためキャンセルできません');
    });

    it('未知のジョブタイプでエラーを投げる', async () => {
      const failedSpy = vi.fn();
      jobOrchestrator.on('job-failed', failedSpy);

      const job = await jobOrchestrator.createJob(
        'tenant-unknown',
        'unknown-type' as any,
        { data: 'test' }
      );

      // ジョブプロセッサーがジョブを処理するまで待機
      await vi.advanceTimersByTimeAsync(10000);

      expect(failedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: job.id,
          status: 'failed',
          error: expect.stringContaining('未知のジョブタイプ'),
        })
      );
    });
  });
});