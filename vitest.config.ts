import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        'node_modules/**',
        'src/**/*.d.ts',
        'src/test/**',
        'tests/**',
        '**/*.{test,spec}.{js,ts}',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    setupFiles: ['tests/setup.ts'],
    // タイムアウト設定
    testTimeout: 30000, // 30秒（GitHub Actions環境向けに増加）
    hookTimeout: 10000, // 10秒
    // Vitest v3での新しい設定オプション
    pool: 'forks', // threads から forks に変更（process.chdir対応）
    poolOptions: {
      forks: {
        singleFork: true, // シングルプロセスでより安定した実行
      },
    },
    maxConcurrency: 5, // 同時実行数を制限
    // より厳密なテスト実行設定
    isolate: true,
    typecheck: {
      enabled: false, // TypeScriptの型チェックは tsc で行う
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@commands': resolve(__dirname, './src/commands'),
      '@lib': resolve(__dirname, './src/lib'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
    },
  },
});