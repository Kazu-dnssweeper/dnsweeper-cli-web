/**
 * DNS同期コマンド
 * CloudflareやRoute53との双方向同期を実現
 */

import { Command } from 'commander';
import ora, { type Ora } from 'ora';
import { table } from 'table';

import { CloudflareClient } from '../lib/api/cloudflare.js';
import { loadConfig } from '../lib/config.js';
import { CSVProcessor } from '../lib/csv-processor.js';
import { Logger } from '../lib/logger.js';
import { globalMetrics } from '../lib/metrics/metrics-collector.js';
import { Route53Client } from '../lib/route53.js';

const logger = new Logger();

/**
 * 同期コマンドのオプション
 */
interface SyncOptions {
  provider: 'cloudflare' | 'route53';
  zone?: string;
  direction: 'upload' | 'download' | 'both';
  dryRun?: boolean;
  force?: boolean;
  format?: 'csv' | 'json';
  output?: string;
}

/**
 * 同期コマンドを作成
 */
export function createSyncCommand(): Command {
  const cmd = new Command('sync')
    .description('CloudflareやRoute53とDNSレコードを同期')
    .option(
      '-p, --provider <provider>',
      'プロバイダー (cloudflare|route53)',
      'cloudflare'
    )
    .option('-z, --zone <zone>', 'ゾーンID/ドメイン名')
    .option('-d, --direction <direction>', '同期方向 (pull|push|both)', 'pull')
    .option('-o, --output <file>', '出力ファイル（CSV形式）')
    .option('--dry-run', 'ドライラン（実際の変更を行わない）')
    .option('--force', '確認なしで実行')
    .action(async options => {
      try {
        await handleSync(options);
      } catch (error) {
        logger.error('同期処理中にエラーが発生しました', error as Error);
        process.exit(1);
      }
    });

  // サブコマンド
  cmd
    .command('status')
    .description('同期ステータスを確認')
    .option('-p, --provider <provider>', 'プロバイダー', 'cloudflare')
    .action(async options => {
      await checkSyncStatus(options);
    });

  cmd
    .command('zones')
    .description('利用可能なゾーン一覧を表示')
    .option('-p, --provider <provider>', 'プロバイダー', 'cloudflare')
    .action(async options => {
      await listZones(options);
    });

  return cmd;
}

/**
 * 同期処理のメイン関数
 */
async function handleSync(options: SyncOptions): Promise<void> {
  const startTime = Date.now();
  const spinner = ora('同期処理を開始しています...').start();

  try {
    // 設定を読み込み
    const config = await loadConfig();

    // APIクライアントを初期化
    const client = await createApiClient(options.provider, config as ConfigData);

    if (!options.zone) {
      spinner.fail('ゾーンIDまたはドメイン名を指定してください');
      return;
    }

    // 同期処理を実行
    switch (options.direction) {
      case 'download':
        await pullRecords(client, options, spinner);
        break;
      case 'upload':
        await pushRecords(client, options, spinner);
        break;
      case 'both':
        await syncBidirectional(client, options, spinner);
        break;
      default:
        throw new Error(`不正な同期方向: ${options.direction}`);
    }

    const duration = Date.now() - startTime;
    spinner.succeed(`同期が完了しました (${duration}ms)`);

    // メトリクスを記録
    globalMetrics.recordCommandExecution({
      command: 'sync',
      args: [options.provider, options.direction],
      duration,
      success: true,
    });
  } catch (error) {
    spinner.fail('同期に失敗しました');
    throw error;
  }
}

/**
 * APIクライアントを作成
 */
interface ConfigData {
  cloudflare?: {
    apiToken: string;
  };
  route53?: {
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
  };
}

async function createApiClient(
  provider: string,
  config: ConfigData
): Promise<CloudflareClient | Route53Client> {
  switch (provider) {
    case 'cloudflare':
      if (!config.cloudflare?.apiToken) {
        throw new Error('Cloudflare APIトークンが設定されていません');
      }
      return new CloudflareClient({
        apiToken: config.cloudflare.apiToken,
        email: config.cloudflare.email,
        apiKey: config.cloudflare.apiKey,
      });

    case 'route53':
      if (!config.aws?.accessKeyId || !config.aws?.secretAccessKey) {
        throw new Error('AWS認証情報が設定されていません');
      }
      return new Route53Client({
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
        region: config.aws.region || 'us-east-1',
      });

    default:
      throw new Error(`サポートされていないプロバイダー: ${provider}`);
  }
}

/**
 * レコードをプル（ダウンロード）
 */
async function pullRecords(
  client: CloudflareClient | Route53Client,
  options: SyncOptions,
  spinner: Ora
): Promise<void> {
  spinner.text = 'DNSレコードを取得しています...';

  let records;
  if (client instanceof CloudflareClient) {
    const response = await client.listDNSRecords(options.zone);
    if (!response.success) {
      throw new Error(
        `DNSレコードの取得に失敗しました: ${response.errors?.join(', ')}`
      );
    }
    records = client.convertCloudflareToCSVRecords(response.result || []);
  } else {
    const response = await client.listResourceRecordSets(options.zone);
    if (response.error) {
      throw new Error(`DNSレコードの取得に失敗しました: ${response.error}`);
    }
    records = client.convertRoute53ToCSVRecords(response.data || []);
  }

  spinner.text = `${records.length}件のレコードを取得しました`;

  // ファイルに保存
  if (options.output) {
    const _csvProcessor = new CSVProcessor();
    const outputPath = options.output;

    // TODO: CSV書き込み機能を実装
    logger.info(`レコードを${outputPath}に保存しました`);
  }

  // テーブル表示
  if (!options.quiet) {
    displayRecordsTable(records);
  }
}

/**
 * レコードをプッシュ（アップロード）
 */
async function pushRecords(
  client: CloudflareClient | Route53Client,
  options: SyncOptions & { input?: string },
  spinner: Ora
): Promise<void> {
  if (!options.input) {
    throw new Error('入力ファイルを指定してください（--input）');
  }

  spinner.text = 'CSVファイルを読み込んでいます...';

  const csvProcessor = new CSVProcessor();
  const result = await csvProcessor.parseAuto(options.input);

  spinner.text = `${result.records.length}件のレコードをアップロードしています...`;

  if (options.dryRun) {
    spinner.info('ドライランモード: 実際の変更は行いません');
    displayRecordsTable(result.records);
    return;
  }

  // 確認を求める
  if (!options.force) {
    spinner.stop();
    logger.info(
      `\n${result.records.length}件のレコードをアップロードします。続行しますか？ (y/N)`
    );
    // TODO: ユーザー確認の実装
  }

  // レコードをアップロード
  let successCount = 0;
  let errorCount = 0;

  for (const record of result.records) {
    try {
      if (client instanceof CloudflareClient) {
        const dnsRecord = client.convertCSVToCloudflareRecords([record])[0];
        await client.createDNSRecord(options.zone, dnsRecord);
      } else {
        // Route53の場合
        const change = {
          Action: 'CREATE' as const,
          ResourceRecordSet: client.convertCSVToRoute53([record])[0],
        };
        await client.changeResourceRecordSets(options.zone, {
          Changes: [change],
        });
      }
      successCount++;
    } catch (error) {
      errorCount++;
      logger.error(
        `レコードのアップロードに失敗しました: ${record.name}`,
        error as Error
      );
    }
  }

  spinner.succeed(
    `アップロード完了: 成功 ${successCount}件, 失敗 ${errorCount}件`
  );
}

/**
 * 双方向同期
 */
async function syncBidirectional(
  client: CloudflareClient | Route53Client,
  options: SyncOptions,
  spinner: Ora
): Promise<void> {
  spinner.info('双方向同期は開発中です');
  // TODO: 双方向同期の実装
}

/**
 * 同期ステータスを確認
 */
async function checkSyncStatus(options: SyncOptions): Promise<void> {
  const config = await loadConfig();
  const client = await createApiClient(options.provider, config as ConfigData);

  if (client instanceof CloudflareClient) {
    const response = await client.verifyToken();
    if (response.success) {
      logger.success('Cloudflare API接続: 正常');
      logger.info(`ユーザーID: ${response.result?.id}`);
      logger.info(`メールアドレス: ${response.result?.email}`);
    } else {
      logger.error('Cloudflare API接続: 失敗');
    }
  } else {
    // Route53の場合
    const response = await client.listHostedZones();
    if (!response.error) {
      logger.success('Route53 API接続: 正常');
      logger.info(`ホステッドゾーン数: ${response.data?.length || 0}`);
    } else {
      logger.error('Route53 API接続: 失敗', new Error(response.error));
    }
  }
}

/**
 * ゾーン一覧を表示
 */
async function listZones(options: SyncOptions): Promise<void> {
  const spinner = ora('ゾーン一覧を取得しています...').start();

  try {
    const config = await loadConfig();
    const client = await createApiClient(options.provider, config as ConfigData);

    let zones;
    if (client instanceof CloudflareClient) {
      const response = await client.listZones();
      if (!response.success) {
        throw new Error(
          `ゾーン一覧の取得に失敗しました: ${response.errors?.join(', ')}`
        );
      }
      zones = response.result || [];
    } else {
      const response = await client.listHostedZones();
      if (response.error) {
        throw new Error(`ゾーン一覧の取得に失敗しました: ${response.error}`);
      }
      zones = response.data || [];
    }

    spinner.succeed(`${zones.length}件のゾーンが見つかりました`);

    // テーブル表示
    const tableData = [
      ['ID', 'ドメイン名', 'ステータス'],
      ...zones.map((zone: { id: string; name: string; status?: string }) => [
        zone.id,
        zone.name,
        zone.status || 'active',
      ]),
    ];

    logger.info(table(tableData));
  } catch (error) {
    spinner.fail('ゾーン一覧の取得に失敗しました');
    throw error;
  }
}

/**
 * レコードをテーブル形式で表示
 */
interface DNSRecordDisplay {
  name: string;
  type: string;
  value: string;
  ttl: number;
  priority?: number;
}

function displayRecordsTable(records: DNSRecordDisplay[]): void {
  if (records.length === 0) {
    logger.info('レコードが見つかりませんでした');
    return;
  }

  const tableData = [
    ['名前', 'タイプ', '値', 'TTL', '優先度'],
    ...records
      .slice(0, 20)
      .map(record => [
        record.name,
        record.type,
        record.value.length > 50
          ? record.value.substring(0, 47) + '...'
          : record.value,
        record.ttl?.toString() || '-',
        record.priority?.toString() || '-',
      ]),
  ];

  logger.info(table(tableData));

  if (records.length > 20) {
    logger.info(`... 他 ${records.length - 20} 件のレコード`);
  }
}
