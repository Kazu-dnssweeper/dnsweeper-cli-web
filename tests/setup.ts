/**
 * Vitest セットアップファイル
 * テスト実行前に共通設定を初期化
 */

import { beforeAll, afterAll, vi } from 'vitest';

// グローバルなモック設定
beforeAll(() => {
  // fetch をモック
  global.fetch = vi.fn();
  
  // console を一時的に無効化（テスト中のログ出力を抑制）
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  
  // process.exit をモック
  vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
});

afterAll(() => {
  vi.restoreAllMocks();
});