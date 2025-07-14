/**
 * パスエイリアスヘルパー
 * 
 * TypeScriptのパスエイリアスを実行時に解決するためのヘルパー
 * Node.jsはデフォルトでTypeScriptのパスエイリアスを理解しないため、
 * このヘルパーを使用して実行時にパスを解決します。
 */

import { pathToFileURL } from 'url';
import { resolve } from 'path';

/**
 * パスエイリアスのマッピング
 */
const aliasMap: Record<string, string> = {
  '@': 'src',
  '@commands': 'src/commands',
  '@lib': 'src/lib',
  '@utils': 'src/utils',
  '@types': 'src/types',
};

/**
 * エイリアスパスを実際のパスに解決
 */
export function resolveAlias(importPath: string): string {
  for (const [alias, actualPath] of Object.entries(aliasMap)) {
    if (importPath.startsWith(alias + '/')) {
      const relativePath = importPath.substring(alias.length + 1);
      return resolve(process.cwd(), actualPath, relativePath);
    }
  }
  
  return importPath;
}

/**
 * インポート文でパスエイリアスを使用する際の注意事項：
 * 
 * 1. 開発時（ts-node）: tsconfig.jsonのpathsが自動的に解決される
 * 2. ビルド時: TypeScriptコンパイラがパスを解決
 * 3. 実行時: ビルドツール（esbuild、webpack等）でパスを解決するか、
 *    またはランタイムでモジュール解決をカスタマイズする必要がある
 * 
 * 推奨される解決方法：
 * - esbuildやwebpackなどのバンドラーを使用する
 * - tsc-aliasなどのツールを使用してビルド後のパスを書き換える
 * - ts-nodeの場合は tsconfig-paths を使用する
 */