import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

// GitHub Actions環境用の設定
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    // CI環境向けの設定
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'tests/unit/cloudflare.test.ts',
      'tests/unit/route53.test.ts', 
      'tests/unit/cname-chain.test.ts',
      'tests/unit/analyze-command.test.ts',
      'tests/unit/dns-cache.test.ts',
      'tests/unit/encoding-detector.test.ts',
      'tests/unit/import-command.test.ts',
      'tests/unit/index-direct.test.ts',
      'tests/unit/structured-logger.test.ts'
    ],
    testTimeout: 30000, // 30秒（さらに短縮）
    hookTimeout: 10000, // 10秒
    maxConcurrency: 1, // CI環境では並列実行を無効化
    // レポーター設定（出力を最小化）
    reporters: [['default', { summary: false }]],
    // 再試行設定
    retry: 0, // 再試行無効化（高速化のため）
    // CI環境での安定性向上
    bail: 1, // 1つのテストが失敗したら即中断
    // より厳しい設定
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: false, // アイソレーション無効化で高速化
      },
    },
    // ログレベル最小化
    logLevel: 'error',
    silent: true, // 出力を最小化
  },
});