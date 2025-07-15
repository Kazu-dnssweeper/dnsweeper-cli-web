import { Logger } from '@lib/logger.js';
import MultiTenantDNSManager from '@lib/multi-tenant-dns-manager.js';
import { OutputFormatter } from '@lib/output-formatter.js';
import chalk from 'chalk';
import { Command } from 'commander';

const logger = new Logger();

export const tenantCommand = new Command('tenant')
  .description('マルチテナントDNS管理')
  .option('-v, --verbose', '詳細な出力を有効にする', false)
  .option('-f, --format <type>', '出力形式 (json/table/text)', 'table');

// テナント一覧表示
tenantCommand
  .command('list')
  .description('テナント一覧を表示')
  .option('-s, --stats', '統計情報を含める', false)
  .option('--plan <plan>', '特定のプランでフィルタ', '')
  .option('--status <status>', '特定のステータスでフィルタ', '')
  .action(async options => {
    try {
      const manager = new MultiTenantDNSManager();

      logger.info('テナント一覧を取得中...');

      let tenants = manager.getAllTenants();

      // フィルタリング
      if (options.plan) {
        tenants = tenants.filter(t => t.plan === options.plan);
      }
      if (options.status) {
        tenants = tenants.filter(t => t.status === options.status);
      }

      const formatter = new OutputFormatter();

      if (options.stats) {
        const systemStats = manager.getSystemStats();

        console.log(chalk.bold('\n📊 システム統計'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`総テナント数: ${chalk.yellow(systemStats.totalTenants)}`);
        console.log(
          `アクティブテナント数: ${chalk.yellow(systemStats.activeTenants)}`
        );
        console.log(`総ユーザー数: ${chalk.yellow(systemStats.totalUsers)}`);
        console.log(
          `総リソース数: ${chalk.yellow(systemStats.totalResources)}`
        );
        console.log(`総クエリ数: ${chalk.yellow(systemStats.totalQueries)}`);

        console.log(chalk.bold('\n📈 プラン別分布'));
        console.log(chalk.gray('─'.repeat(50)));
        Object.entries(systemStats.planDistribution).forEach(
          ([plan, count]) => {
            console.log(`${plan}: ${chalk.yellow(count)}個`);
          }
        );

        console.log(chalk.bold('\n🌍 地域別分布'));
        console.log(chalk.gray('─'.repeat(50)));
        Object.entries(systemStats.regionDistribution).forEach(
          ([region, count]) => {
            console.log(`${region}: ${chalk.yellow(count)}個`);
          }
        );

        console.log();
      }

      console.log(chalk.bold('🏢 テナント一覧'));
      console.log(chalk.gray('─'.repeat(50)));

      if (tenants.length === 0) {
        console.log(chalk.yellow('テナントが見つかりません'));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(tenants, null, 2));
      } else {
        const tableData = tenants.map(tenant => ({
          ID: tenant.id,
          名前: tenant.name,
          ドメイン: tenant.domain,
          プラン: tenant.plan,
          ステータス:
            tenant.status === 'active'
              ? chalk.green('アクティブ')
              : chalk.red('非アクティブ'),
          作成日: tenant.createdAt.toLocaleDateString('ja-JP'),
          連絡先: tenant.metadata.contactEmail,
        }));

        formatter.formatTable(tableData);
      }

      await manager.shutdown();
    } catch (error) {
      logger.error('テナント一覧の取得に失敗しました', error as Error);
      process.exit(1);
    }
  });

// テナント作成
tenantCommand
  .command('create')
  .description('新しいテナントを作成')
  .requiredOption('-n, --name <name>', 'テナント名')
  .requiredOption('-d, --domain <domain>', 'テナントドメイン')
  .option(
    '-p, --plan <plan>',
    'プラン (free/basic/professional/enterprise)',
    'free'
  )
  .option('-e, --email <email>', '連絡先メールアドレス')
  .option('-i, --industry <industry>', '業界', 'technology')
  .option('-s, --size <size>', '会社規模', 'startup')
  .option('-r, --region <region>', '地域', 'us-east-1')
  .action(async options => {
    try {
      const manager = new MultiTenantDNSManager();

      logger.info(`新しいテナントを作成中: ${options.name}`);

      // プランに基づく設定
      const planConfigs = {
        free: {
          maxDNSRecords: 100,
          maxQueriesPerMonth: 10000,
          maxUsers: 5,
          apiRateLimit: 100,
          allowedFeatures: ['basic-dns', 'monitoring'],
        },
        basic: {
          maxDNSRecords: 500,
          maxQueriesPerMonth: 50000,
          maxUsers: 10,
          apiRateLimit: 500,
          allowedFeatures: ['basic-dns', 'monitoring', 'analytics'],
        },
        professional: {
          maxDNSRecords: 2000,
          maxQueriesPerMonth: 200000,
          maxUsers: 25,
          apiRateLimit: 1000,
          allowedFeatures: [
            'basic-dns',
            'monitoring',
            'analytics',
            'api-access',
          ],
        },
        enterprise: {
          maxDNSRecords: 10000,
          maxQueriesPerMonth: 1000000,
          maxUsers: 100,
          apiRateLimit: 5000,
          allowedFeatures: [
            'basic-dns',
            'monitoring',
            'analytics',
            'api-access',
            'white-label',
          ],
        },
      };

      const planConfig = planConfigs[options.plan as keyof typeof planConfigs];

      const tenantData = {
        name: options.name,
        domain: options.domain,
        plan: options.plan,
        status: 'active' as const,
        settings: {
          ...planConfig,
          retention: {
            logs: options.plan === 'enterprise' ? 365 : 90,
            metrics: options.plan === 'enterprise' ? 365 : 90,
            backups: options.plan === 'enterprise' ? 90 : 30,
          },
        },
        subscription: {
          planId: `${options.plan}-plan`,
          status: 'active' as const,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年後
          usage: {
            dnsRecords: 0,
            queriesThisMonth: 0,
            activeUsers: 0,
            apiCalls: 0,
          },
        },
        metadata: {
          industry: options.industry,
          companySize: options.size,
          region: options.region,
          contactEmail: options.email || `admin@${options.domain}`,
        },
      };

      const tenant = await manager.createTenant(tenantData);

      console.log(chalk.bold('\n✅ テナント作成完了'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`テナントID: ${chalk.yellow(tenant.id)}`);
      console.log(`名前: ${chalk.yellow(tenant.name)}`);
      console.log(`ドメイン: ${chalk.yellow(tenant.domain)}`);
      console.log(`プラン: ${chalk.yellow(tenant.plan)}`);
      console.log(
        `作成日: ${chalk.yellow(tenant.createdAt.toLocaleString('ja-JP'))}`
      );

      console.log(chalk.bold('\n📋 設定詳細'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(
        `最大DNSレコード数: ${chalk.yellow(tenant.settings.maxDNSRecords)}`
      );
      console.log(
        `月間クエリ数上限: ${chalk.yellow(tenant.settings.maxQueriesPerMonth)}`
      );
      console.log(`最大ユーザー数: ${chalk.yellow(tenant.settings.maxUsers)}`);
      console.log(
        `API レート制限: ${chalk.yellow(tenant.settings.apiRateLimit)}/hour`
      );
      console.log(
        `利用可能機能: ${chalk.yellow(tenant.settings.allowedFeatures.join(', '))}`
      );

      await manager.shutdown();
    } catch (error) {
      logger.error('テナント作成に失敗しました', error as Error);
      process.exit(1);
    }
  });

// テナント詳細表示
tenantCommand
  .command('show <tenant-id>')
  .description('テナント詳細情報を表示')
  .option('-s, --stats', '統計情報を含める', false)
  .option('--users', 'ユーザー一覧を表示', false)
  .option('--resources', 'リソース一覧を表示', false)
  .option('--audit', '監査ログを表示', false)
  .option('--quota', 'クォータ情報を表示', false)
  .option('--billing', '請求情報を表示', false)
  .action(async (tenantId, options) => {
    try {
      const manager = new MultiTenantDNSManager();

      logger.info(`テナント詳細を取得中: ${tenantId}`);

      const tenant = manager.getTenant(tenantId);
      if (!tenant) {
        console.log(chalk.red(`テナントが見つかりません: ${tenantId}`));
        return;
      }

      console.log(chalk.bold('\n🏢 テナント詳細'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`テナントID: ${chalk.yellow(tenant.id)}`);
      console.log(`名前: ${chalk.yellow(tenant.name)}`);
      console.log(`ドメイン: ${chalk.yellow(tenant.domain)}`);
      console.log(`プラン: ${chalk.yellow(tenant.plan)}`);
      console.log(
        `ステータス: ${
          tenant.status === 'active'
            ? chalk.green('アクティブ')
            : chalk.red('非アクティブ')
        }`
      );
      console.log(
        `作成日: ${chalk.yellow(tenant.createdAt.toLocaleString('ja-JP'))}`
      );
      console.log(
        `更新日: ${chalk.yellow(tenant.updatedAt.toLocaleString('ja-JP'))}`
      );

      console.log(chalk.bold('\n📞 連絡先情報'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(
        `メールアドレス: ${chalk.yellow(tenant.metadata.contactEmail)}`
      );
      console.log(`業界: ${chalk.yellow(tenant.metadata.industry || 'N/A')}`);
      console.log(
        `会社規模: ${chalk.yellow(tenant.metadata.companySize || 'N/A')}`
      );
      console.log(`地域: ${chalk.yellow(tenant.metadata.region || 'N/A')}`);

      if (options.quota) {
        const quota = manager.getTenantQuota(tenantId);
        if (quota) {
          console.log(chalk.bold('\n📊 クォータ情報'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(
            `DNSレコード: ${chalk.yellow(quota.usage.dnsRecords)}/${chalk.yellow(quota.limits.dnsRecords)}`
          );
          console.log(
            `月間クエリ: ${chalk.yellow(quota.usage.queriesThisMonth)}/${chalk.yellow(quota.limits.queriesPerMonth)}`
          );
          console.log(
            `アクティブユーザー: ${chalk.yellow(quota.usage.activeUsers)}/${chalk.yellow(quota.limits.users)}`
          );
          console.log(
            `時間毎API呼び出し: ${chalk.yellow(quota.usage.apiCallsThisHour)}/${chalk.yellow(quota.limits.apiCallsPerHour)}`
          );
          console.log(
            `ストレージ使用量: ${chalk.yellow(quota.usage.storageUsedGB.toFixed(2))}GB/${chalk.yellow(quota.limits.storageGB)}GB`
          );
        }
      }

      if (options.billing) {
        const billing = manager.getTenantBilling(tenantId);
        if (billing) {
          console.log(chalk.bold('\n💳 請求情報'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(`プラン: ${chalk.yellow(billing.subscription.planId)}`);
          console.log(
            `ステータス: ${chalk.yellow(billing.subscription.status)}`
          );
          console.log(
            `料金: ${chalk.yellow(billing.subscription.amount)} ${chalk.yellow(billing.subscription.currency)}`
          );
          console.log(
            `請求サイクル: ${chalk.yellow(billing.subscription.billingCycle)}`
          );
          console.log(
            `次回請求日: ${chalk.yellow(billing.subscription.nextBillingDate.toLocaleDateString('ja-JP'))}`
          );
          console.log(
            `支払い方法: ${chalk.yellow(billing.paymentMethod.type)} (**** ${chalk.yellow(billing.paymentMethod.lastFour)})`
          );
        }
      }

      if (options.users) {
        const users = manager.getTenantUsers(tenantId);
        console.log(chalk.bold('\n👥 ユーザー一覧'));
        console.log(chalk.gray('─'.repeat(50)));
        if (users.length === 0) {
          console.log(chalk.yellow('ユーザーが見つかりません'));
        } else {
          users.forEach(user => {
            console.log(
              `${chalk.yellow(user.email)} (${chalk.blue(user.role)}) - ${
                user.status === 'active'
                  ? chalk.green('アクティブ')
                  : chalk.red('非アクティブ')
              }`
            );
          });
        }
      }

      if (options.resources) {
        const resources = manager.getTenantResources(tenantId);
        console.log(chalk.bold('\n📦 リソース一覧'));
        console.log(chalk.gray('─'.repeat(50)));
        if (resources.length === 0) {
          console.log(chalk.yellow('リソースが見つかりません'));
        } else {
          resources.forEach(resource => {
            console.log(
              `${chalk.yellow(resource.name)} (${chalk.blue(resource.type)}) - ${
                resource.status === 'active'
                  ? chalk.green('アクティブ')
                  : chalk.red('非アクティブ')
              }`
            );
          });
        }
      }

      if (options.audit) {
        const auditLogs = manager.getAuditLogs(tenantId, { limit: 10 });
        console.log(chalk.bold('\n📋 監査ログ (最新10件)'));
        console.log(chalk.gray('─'.repeat(50)));
        if (auditLogs.length === 0) {
          console.log(chalk.yellow('監査ログが見つかりません'));
        } else {
          auditLogs.forEach(log => {
            const riskColor =
              log.risk === 'high'
                ? chalk.red
                : log.risk === 'medium'
                  ? chalk.yellow
                  : chalk.green;
            console.log(
              `${chalk.blue(log.timestamp.toLocaleString('ja-JP'))} - ${chalk.yellow(log.action)} - ${riskColor(log.risk)} - ${
                log.result === 'success'
                  ? chalk.green('成功')
                  : chalk.red('失敗')
              }`
            );
          });
        }
      }

      if (options.stats) {
        const stats = manager.getTenantStats(tenantId);
        console.log(chalk.bold('\n📈 統計情報'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`総ユーザー数: ${chalk.yellow(stats.overview.totalUsers)}`);
        console.log(
          `総リソース数: ${chalk.yellow(stats.overview.totalResources)}`
        );
        console.log(`総クエリ数: ${chalk.yellow(stats.overview.totalQueries)}`);
        console.log(
          `ストレージ使用量: ${chalk.yellow(stats.overview.totalStorage.toFixed(2))}GB`
        );
        console.log(
          `アクティブ接続数: ${chalk.yellow(manager.getActiveConnections(tenantId))}`
        );
      }

      await manager.shutdown();
    } catch (error) {
      logger.error('テナント詳細の取得に失敗しました', error as Error);
      process.exit(1);
    }
  });

// テナント更新
tenantCommand
  .command('update <tenant-id>')
  .description('テナント情報を更新')
  .option('-n, --name <name>', 'テナント名を更新')
  .option(
    '-p, --plan <plan>',
    'プランを更新 (free/basic/professional/enterprise)'
  )
  .option(
    '-s, --status <status>',
    'ステータスを更新 (active/suspended/cancelled)'
  )
  .option('-e, --email <email>', '連絡先メールアドレスを更新')
  .action(async (tenantId, options) => {
    try {
      const manager = new MultiTenantDNSManager();

      logger.info(`テナントを更新中: ${tenantId}`);

      const tenant = manager.getTenant(tenantId);
      if (!tenant) {
        console.log(chalk.red(`テナントが見つかりません: ${tenantId}`));
        return;
      }

      const updates: any = {};

      if (options.name) {
        updates.name = options.name;
      }

      if (options.plan) {
        updates.plan = options.plan;
        // プラン変更時の設定更新
        const planConfigs = {
          free: {
            maxDNSRecords: 100,
            maxQueriesPerMonth: 10000,
            maxUsers: 5,
            apiRateLimit: 100,
          },
          basic: {
            maxDNSRecords: 500,
            maxQueriesPerMonth: 50000,
            maxUsers: 10,
            apiRateLimit: 500,
          },
          professional: {
            maxDNSRecords: 2000,
            maxQueriesPerMonth: 200000,
            maxUsers: 25,
            apiRateLimit: 1000,
          },
          enterprise: {
            maxDNSRecords: 10000,
            maxQueriesPerMonth: 1000000,
            maxUsers: 100,
            apiRateLimit: 5000,
          },
        };

        const planConfig =
          planConfigs[options.plan as keyof typeof planConfigs];
        updates.settings = {
          ...tenant.settings,
          ...planConfig,
        };
      }

      if (options.status) {
        updates.status = options.status;
      }

      if (options.email) {
        updates.metadata = {
          ...tenant.metadata,
          contactEmail: options.email,
        };
      }

      const updatedTenant = await manager.updateTenant(tenantId, updates);

      console.log(chalk.bold('\n✅ テナント更新完了'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`テナントID: ${chalk.yellow(updatedTenant.id)}`);
      console.log(`名前: ${chalk.yellow(updatedTenant.name)}`);
      console.log(`プラン: ${chalk.yellow(updatedTenant.plan)}`);
      console.log(
        `ステータス: ${
          updatedTenant.status === 'active'
            ? chalk.green('アクティブ')
            : chalk.red('非アクティブ')
        }`
      );
      console.log(
        `更新日: ${chalk.yellow(updatedTenant.updatedAt.toLocaleString('ja-JP'))}`
      );

      await manager.shutdown();
    } catch (error) {
      logger.error('テナント更新に失敗しました', error as Error);
      process.exit(1);
    }
  });

// テナント削除
tenantCommand
  .command('delete <tenant-id>')
  .description('テナントを削除')
  .option('-y, --yes', '確認をスキップ', false)
  .action(async (tenantId, options) => {
    try {
      const manager = new MultiTenantDNSManager();

      const tenant = manager.getTenant(tenantId);
      if (!tenant) {
        console.log(chalk.red(`テナントが見つかりません: ${tenantId}`));
        return;
      }

      if (!options.yes) {
        console.log(
          chalk.yellow(
            `テナント "${tenant.name}" (${tenant.id}) を削除しますか？`
          )
        );
        console.log(chalk.red('この操作は取り消せません。'));
        console.log(
          chalk.gray('確認するには --yes オプションを使用してください。')
        );
        return;
      }

      logger.info(`テナントを削除中: ${tenantId}`);

      await manager.deleteTenant(tenantId);

      console.log(chalk.bold('\n✅ テナント削除完了'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(
        `削除されたテナント: ${chalk.yellow(tenant.name)} (${chalk.yellow(tenant.id)})`
      );

      await manager.shutdown();
    } catch (error) {
      logger.error('テナント削除に失敗しました', error as Error);
      process.exit(1);
    }
  });

// ユーザー管理
tenantCommand
  .command('users <tenant-id>')
  .description('テナントのユーザー管理')
  .option('-a, --add', 'ユーザーを追加', false)
  .option('-e, --email <email>', 'ユーザーのメールアドレス')
  .option(
    '-r, --role <role>',
    'ユーザーの役割 (owner/admin/editor/viewer)',
    'viewer'
  )
  .option('-n, --name <name>', 'ユーザー名')
  .action(async (tenantId, options) => {
    try {
      const manager = new MultiTenantDNSManager();

      const tenant = manager.getTenant(tenantId);
      if (!tenant) {
        console.log(chalk.red(`テナントが見つかりません: ${tenantId}`));
        return;
      }

      if (options.add) {
        if (!options.email || !options.name) {
          console.log(
            chalk.red('ユーザー追加にはメールアドレスと名前が必要です')
          );
          return;
        }

        logger.info(`ユーザーを追加中: ${options.email}`);

        const userData = {
          email: options.email,
          role: options.role,
          permissions: getPermissionsForRole(options.role),
          status: 'active' as const,
          profile: {
            name: options.name,
            timezone: 'Asia/Tokyo',
            language: 'ja',
            preferences: {
              notifications: true,
              emailDigest: true,
              theme: 'light' as const,
            },
          },
          mfa: {
            enabled: false,
          },
        };

        const user = await manager.createUser(tenantId, userData);

        console.log(chalk.bold('\n✅ ユーザー追加完了'));
        console.log(chalk.gray('─'.repeat(50)));
        console.log(`ユーザーID: ${chalk.yellow(user.id)}`);
        console.log(`メールアドレス: ${chalk.yellow(user.email)}`);
        console.log(`役割: ${chalk.yellow(user.role)}`);
        console.log(
          `作成日: ${chalk.yellow(user.createdAt.toLocaleString('ja-JP'))}`
        );
      } else {
        const users = manager.getTenantUsers(tenantId);

        console.log(chalk.bold('\n👥 ユーザー一覧'));
        console.log(chalk.gray('─'.repeat(50)));

        if (users.length === 0) {
          console.log(chalk.yellow('ユーザーが見つかりません'));
        } else {
          const formatter = new OutputFormatter();
          const tableData = users.map(user => ({
            ID: user.id,
            メールアドレス: user.email,
            名前: user.profile.name,
            役割: user.role,
            ステータス:
              user.status === 'active'
                ? chalk.green('アクティブ')
                : chalk.red('非アクティブ'),
            作成日: user.createdAt.toLocaleDateString('ja-JP'),
            最終ログイン: user.lastLoginAt
              ? user.lastLoginAt.toLocaleDateString('ja-JP')
              : 'なし',
          }));

          formatter.formatTable(tableData);
        }
      }

      await manager.shutdown();
    } catch (error) {
      logger.error('ユーザー管理に失敗しました', error as Error);
      process.exit(1);
    }
  });

// 監査ログ
tenantCommand
  .command('audit <tenant-id>')
  .description('テナントの監査ログを表示')
  .option('-l, --limit <limit>', '表示件数', '20')
  .option('-a, --action <action>', '特定のアクションでフィルタ')
  .option('-u, --user <user>', '特定のユーザーでフィルタ')
  .option('-r, --risk <risk>', '特定のリスクレベルでフィルタ')
  .option('-s, --start <start>', '開始日 (YYYY-MM-DD)')
  .option('-e, --end <end>', '終了日 (YYYY-MM-DD)')
  .action(async (tenantId, options) => {
    try {
      const manager = new MultiTenantDNSManager();

      const tenant = manager.getTenant(tenantId);
      if (!tenant) {
        console.log(chalk.red(`テナントが見つかりません: ${tenantId}`));
        return;
      }

      logger.info(`監査ログを取得中: ${tenantId}`);

      const filterOptions: any = {
        limit: parseInt(options.limit) || 20,
      };

      if (options.action) filterOptions.action = options.action;
      if (options.user) filterOptions.userId = options.user;
      if (options.risk) filterOptions.risk = options.risk;
      if (options.start) filterOptions.startDate = new Date(options.start);
      if (options.end) filterOptions.endDate = new Date(options.end);

      const auditLogs = manager.getAuditLogs(tenantId, filterOptions);

      console.log(chalk.bold('\n📋 監査ログ'));
      console.log(chalk.gray('─'.repeat(50)));

      if (auditLogs.length === 0) {
        console.log(chalk.yellow('監査ログが見つかりません'));
      } else {
        const formatter = new OutputFormatter();
        const tableData = auditLogs.map(log => {
          const riskColor =
            log.risk === 'high'
              ? chalk.red
              : log.risk === 'medium'
                ? chalk.yellow
                : chalk.green;

          return {
            時刻: log.timestamp.toLocaleString('ja-JP'),
            アクション: log.action,
            リソース: `${log.resource.type}:${log.resource.name}`,
            ユーザー: log.userId,
            結果:
              log.result === 'success'
                ? chalk.green('成功')
                : chalk.red('失敗'),
            リスク: riskColor(log.risk),
            IPアドレス: log.ipAddress,
          };
        });

        formatter.formatTable(tableData);
      }

      await manager.shutdown();
    } catch (error) {
      logger.error('監査ログの取得に失敗しました', error as Error);
      process.exit(1);
    }
  });

// 権限取得関数
function getPermissionsForRole(role: string): string[] {
  const permissions: Record<string, string[]> = {
    owner: ['*'],
    admin: ['dns:*', 'users:*', 'settings:*', 'billing:read'],
    editor: ['dns:read', 'dns:write', 'users:read'],
    viewer: ['dns:read', 'users:read'],
  };

  return permissions[role] || permissions.viewer;
}

export default tenantCommand;
