import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

/**
 * DNSweeperの設定インターフェース
 */
export interface DnsSweeperConfig {
  // DNS解決設定
  dns?: {
    timeout?: number; // タイムアウト（ミリ秒）
    retries?: number; // リトライ回数
    servers?: string[]; // DNSサーバーリスト
    concurrent?: number; // 並列実行数
  };

  // CSV処理設定
  csv?: {
    encoding?: BufferEncoding; // ファイルエンコーディング
    delimiter?: string; // 区切り文字
    quote?: string; // クォート文字
    skipEmptyLines?: boolean; // 空行スキップ
    maxRows?: number; // 最大行数制限
  };

  // リスク計算設定
  risk?: {
    weights?: {
      unusedDays?: number; // 未使用期間の重み
      namingPattern?: number; // 命名パターンの重み
      ttl?: number; // TTLの重み
    };
    thresholds?: {
      high?: number; // 高リスクしきい値
      medium?: number; // 中リスクしきい値
    };
  };

  // 出力設定
  output?: {
    format?: 'json' | 'csv' | 'table'; // 出力形式
    colors?: boolean; // カラー出力
    verbose?: boolean; // 詳細出力
    quiet?: boolean; // 静音モード
  };

  // API設定
  api?: {
    cloudflare?: {
      apiKey?: string;
      email?: string;
      accountId?: string;
    };
    route53?: {
      accessKeyId?: string;
      secretAccessKey?: string;
      region?: string;
    };
  };
}

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: DnsSweeperConfig = {
  dns: {
    timeout: 5000,
    retries: 3,
    concurrent: 10,
  },
  csv: {
    encoding: 'utf8',
    delimiter: ',',
    quote: '"',
    skipEmptyLines: true,
    maxRows: 1000000,
  },
  risk: {
    weights: {
      unusedDays: 0.4,
      namingPattern: 0.3,
      ttl: 0.3,
    },
    thresholds: {
      high: 70,
      medium: 40,
    },
  },
  output: {
    format: 'table',
    colors: true,
    verbose: false,
    quiet: false,
  },
};

/**
 * 設定ファイルのパスを検索
 */
async function findConfigFile(): Promise<string | null> {
  const configFileNames = [
    '.dnsweeper.json',
    '.dnsweeperrc',
    'dnsweeper.config.json',
  ];

  // 現在のディレクトリから上位ディレクトリまで探索
  let currentDir = process.cwd();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (const fileName of configFileNames) {
      const configPath = path.join(currentDir, fileName);
      try {
        await fs.access(configPath);
        return configPath;
      } catch {
        // ファイルが存在しない場合は次を試す
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break; // ルートディレクトリに到達
    }
    currentDir = parentDir;
  }

  // ホームディレクトリもチェック
  const homeDir = os.homedir();
  for (const fileName of configFileNames) {
    const configPath = path.join(homeDir, fileName);
    try {
      await fs.access(configPath);
      return configPath;
    } catch {
      // ファイルが存在しない場合は次を試す
    }
  }

  return null;
}

/**
 * 設定ファイルを読み込む
 */
export async function loadConfig(
  configPath?: string
): Promise<DnsSweeperConfig> {
  let config = { ...DEFAULT_CONFIG };

  // 設定ファイルパスが指定されていない場合は自動検索
  const actualConfigPath = configPath || (await findConfigFile());

  if (actualConfigPath) {
    try {
      const configContent = await fs.readFile(actualConfigPath, 'utf8');
      const fileConfig = JSON.parse(configContent);

      // 深いマージを実行
      config = deepMerge(config, fileConfig);

      // Debug: 設定ファイルを読み込みました
      // console.log(`設定ファイルを読み込みました: ${actualConfigPath}`);
    } catch (error) {
      console.error(`設定ファイルの読み込みエラー: ${actualConfigPath}`, error);
      throw error;
    }
  }

  // 環境変数から設定を上書き
  config = mergeEnvironmentVariables(config);

  return config;
}

/**
 * 環境変数から設定をマージ
 */
function mergeEnvironmentVariables(config: DnsSweeperConfig): DnsSweeperConfig {
  const env = process.env;

  // DNS設定
  if (env.DNSWEEPER_DNS_TIMEOUT) {
    config.dns = config.dns || {};
    config.dns.timeout = parseInt(env.DNSWEEPER_DNS_TIMEOUT, 10);
  }
  if (env.DNSWEEPER_DNS_SERVERS) {
    config.dns = config.dns || {};
    config.dns.servers = env.DNSWEEPER_DNS_SERVERS.split(',');
  }

  // API設定
  if (env.CLOUDFLARE_API_KEY) {
    config.api = config.api || {};
    config.api.cloudflare = config.api.cloudflare || {};
    config.api.cloudflare.apiKey = env.CLOUDFLARE_API_KEY;
  }
  if (env.CLOUDFLARE_EMAIL) {
    config.api = config.api || {};
    config.api.cloudflare = config.api.cloudflare || {};
    config.api.cloudflare.email = env.CLOUDFLARE_EMAIL;
  }
  if (env.AWS_ACCESS_KEY_ID) {
    config.api = config.api || {};
    config.api.route53 = config.api.route53 || {};
    config.api.route53.accessKeyId = env.AWS_ACCESS_KEY_ID;
  }
  if (env.AWS_SECRET_ACCESS_KEY) {
    config.api = config.api || {};
    config.api.route53 = config.api.route53 || {};
    config.api.route53.secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  }

  // 出力設定
  if (env.DNSWEEPER_OUTPUT_FORMAT) {
    config.output = config.output || {};
    config.output.format = env.DNSWEEPER_OUTPUT_FORMAT as
      | 'json'
      | 'csv'
      | 'table';
  }
  if (env.NO_COLOR || env.DNSWEEPER_NO_COLOR) {
    config.output = config.output || {};
    config.output.colors = false;
  }

  return config;
}

/**
 * オブジェクトの深いマージ
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(
          (result[key] || {}) as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * 設定の検証
 */
export function validateConfig(config: DnsSweeperConfig): void {
  // DNS設定の検証
  if (config.dns?.timeout && config.dns.timeout < 0) {
    throw new Error('DNS timeout must be positive');
  }
  if (config.dns?.retries && config.dns.retries < 0) {
    throw new Error('DNS retries must be positive');
  }

  // リスク重みの検証
  if (config.risk?.weights) {
    const weights = config.risk.weights;
    const total =
      (weights.unusedDays || 0) +
      (weights.namingPattern || 0) +
      (weights.ttl || 0);
    if (Math.abs(total - 1.0) > 0.01) {
      throw new Error('Risk weights must sum to 1.0');
    }
  }

  // しきい値の検証
  if (config.risk?.thresholds) {
    const { high = 70, medium = 40 } = config.risk.thresholds;
    if (high <= medium) {
      throw new Error(
        'High risk threshold must be greater than medium threshold'
      );
    }
  }
}

/**
 * 設定をファイルに保存
 */
export async function saveConfig(
  config: DnsSweeperConfig,
  configPath?: string
): Promise<void> {
  const actualConfigPath =
    configPath || path.join(process.cwd(), '.dnsweeper.json');

  try {
    const configContent = JSON.stringify(config, null, 2);
    await fs.writeFile(actualConfigPath, configContent, 'utf8');
    // Debug: 設定ファイルを保存しました
    // console.log(`設定ファイルを保存しました: ${actualConfigPath}`);
  } catch (error) {
    console.error(`設定ファイルの保存エラー: ${actualConfigPath}`, error);
    throw error;
  }
}
