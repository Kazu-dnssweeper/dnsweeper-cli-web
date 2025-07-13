import { beforeAll, afterAll } from 'vitest';

// テスト環境の設定
beforeAll(() => {
  // 環境変数の設定
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0'; // ランダムポート
  process.env.FRONTEND_URL = 'http://localhost:5173';
  
  // ログレベルをエラーのみに設定
  process.env.LOG_LEVEL = 'error';
});

afterAll(() => {
  // テスト後のクリーンアップ
});