import chalk from 'chalk';

/**
 * カラーパレット定義
 */
export const colors = {
  // 基本カラー
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,

  // 追加カラー
  primary: chalk.cyan,
  secondary: chalk.magenta,
  muted: chalk.gray,
  bold: chalk.bold,
  dim: chalk.dim,

  // DNS固有
  record: {
    A: chalk.green,
    AAAA: chalk.blue,
    CNAME: chalk.yellow,
    MX: chalk.magenta,
    TXT: chalk.cyan,
    NS: chalk.white,
    SOA: chalk.gray,
    PTR: chalk.red,
    SRV: chalk.greenBright,
    CAA: chalk.blueBright,
  },

  // リスクレベル
  risk: {
    low: chalk.green,
    medium: chalk.yellow,
    high: chalk.red,
    critical: chalk.redBright.bold,
  },

  // ステータス
  status: {
    running: chalk.blue,
    success: chalk.green,
    failed: chalk.red,
    warning: chalk.yellow,
    pending: chalk.gray,
  },
} as const;

/**
 * NO_COLOR環境変数をチェックしてカラー出力を無効化
 */
export function shouldUseColors(): boolean {
  return !process.env.NO_COLOR && process.stdout.isTTY;
}

/**
 * カラーモードを自動検出
 */
export function detectColorMode(): 'always' | 'never' | 'auto' {
  if (process.env.FORCE_COLOR) return 'always';
  if (process.env.NO_COLOR) return 'never';
  return 'auto';
}

/**
 * カラーパレットの適用設定
 */
export function configureColors(
  mode: 'always' | 'never' | 'auto' = 'auto'
): void {
  const level =
    mode === 'never' ? 0 : mode === 'always' ? 3 : shouldUseColors() ? 3 : 0;

  chalk.level = level;
}

/**
 * カラー付きヘルパー関数
 */
export const colorize = {
  success: (text: string) => colors.success(text),
  warning: (text: string) => colors.warning(text),
  error: (text: string) => colors.error(text),
  info: (text: string) => colors.info(text),

  record: (type: keyof typeof colors.record, text: string) =>
    colors.record[type] ? colors.record[type](text) : text,

  risk: (level: keyof typeof colors.risk, text: string) =>
    colors.risk[level] ? colors.risk[level](text) : text,

  status: (status: keyof typeof colors.status, text: string) =>
    colors.status[status] ? colors.status[status](text) : text,

  // IP形式の自動カラリング
  ip: (address: string) => {
    if (address.includes(':')) {
      return colors.record.AAAA(address); // IPv6
    }
    return colors.record.A(address); // IPv4
  },

  // ドメイン名のカラリング
  domain: (domain: string) => colors.primary(domain),

  // 数値のカラリング
  number: (value: number | string) => colors.secondary(value.toString()),

  // ファイルパスのカラリング
  path: (path: string) => colors.muted(path),
} as const;

// 初期化
configureColors();
