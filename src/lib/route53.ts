/**
 * Route53 APIクライアント（リファクタリング済み）
 * 元のファイルは route53-backup.ts として保存
 */

// 新しいモジュール化されたRoute53クライアントを再エクスポート
export {
  Route53Client,
  Route53Auth,
  Route53Parser,
  Route53BatchProcessor,
  type Route53Config,
  type Route53Record,
  type Route53HostedZone,
  type Route53Change,
  type Route53ChangeBatch,
  type Route53ChangeInfo,
  type Route53Response,
  type Route53BatchOptions,
  type Route53BatchResult,
} from './route53/index.js';

// 後方互換性のためのデフォルトエクスポート
export { Route53Client as default } from './route53/index.js';