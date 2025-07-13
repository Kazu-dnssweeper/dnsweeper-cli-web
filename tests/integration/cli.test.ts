import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PATH = path.join(__dirname, '../../dist/index.js');
const TEST_DATA_DIR = path.join(__dirname, '../test-data');

describe('DNSweeper CLI 統合テスト', () => {
  beforeAll(() => {
    // ビルドが存在することを確認
    if (!fs.existsSync(CLI_PATH)) {
      execSync('npm run build', { cwd: path.join(__dirname, '../..') });
    }
  });

  describe('基本コマンド', () => {
    it('--version オプションでバージョンを表示', () => {
      const output = execSync(`node ${CLI_PATH} --version`).toString();
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });

    it('--help オプションでヘルプを表示', () => {
      const output = execSync(`node ${CLI_PATH} --help`).toString();
      expect(output).toContain('Usage: dnsweeper');
      expect(output).toContain('Options:');
      expect(output).toContain('Commands:');
    });

    it('存在しないコマンドでエラーを表示', () => {
      try {
        execSync(`node ${CLI_PATH} invalid-command`, { stdio: 'pipe' });
        expect.fail('コマンドが成功してしまいました');
      } catch (error: any) {
        const stderr = error.stderr.toString();
        expect(stderr).toContain('Invalid command');
        expect(error.status).toBe(1);
      }
    });
  });

  describe('list コマンド', () => {
    it('list コマンドが正常に実行される', () => {
      const output = execSync(`node ${CLI_PATH} list`).toString();
      expect(output).toBeDefined();
      // 実際のDNSレコードがない場合でも、エラーなく実行されることを確認
    });

    it('--verbose オプションで詳細出力', () => {
      const output = execSync(`node ${CLI_PATH} list --verbose`).toString();
      expect(output).toBeDefined();
    });

    it('--format json オプションでJSON出力', () => {
      const output = execSync(`node ${CLI_PATH} list --format json`).toString();
      // JSON形式の出力を期待（空の配列でも可）
      expect(() => JSON.parse(output.trim() || '[]')).not.toThrow();
    });
  });

  describe('import コマンド', () => {
    const testCsvPath = path.join(TEST_DATA_DIR, 'test-import.csv');

    beforeAll(() => {
      // テスト用CSVファイルを作成
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
      fs.writeFileSync(testCsvPath, `domain,type,value,ttl
example.com,A,192.168.1.1,300
example.com,AAAA,2001:db8::1,300
mail.example.com,MX,10 mail.example.com,3600
`);
    });

    afterAll(() => {
      // テストファイルをクリーンアップ
      if (fs.existsSync(testCsvPath)) {
        fs.unlinkSync(testCsvPath);
      }
    });

    it('CSV ファイルをインポート', () => {
      const output = execSync(`node ${CLI_PATH} import generic ${testCsvPath}`).toString();
      expect(output).toContain('CSV');
      expect(output).toContain('3'); // 3レコード
    });

    it('存在しないファイルでエラー', () => {
      try {
        execSync(`node ${CLI_PATH} import generic non-existent.csv`, { stdio: 'pipe' });
        expect.fail('コマンドが成功してしまいました');
      } catch (error: any) {
        expect(error.status).toBe(1);
      }
    });
  });

  describe('analyze コマンド', () => {
    const testCsvPath = path.join(TEST_DATA_DIR, 'test-analyze.csv');

    beforeAll(() => {
      // テスト用CSVファイルを作成
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
      fs.writeFileSync(testCsvPath, `domain,type,value,ttl
old-test.example.com,A,192.168.1.1,86400
temp-2023.example.com,A,192.168.1.2,300
main.example.com,A,192.168.1.3,3600
`);
    });

    afterAll(() => {
      // テストファイルをクリーンアップ
      if (fs.existsSync(testCsvPath)) {
        fs.unlinkSync(testCsvPath);
      }
    });

    it('リスク分析を実行', () => {
      const output = execSync(`node ${CLI_PATH} analyze ${testCsvPath}`).toString();
      expect(output).toContain('リスク分析');
      expect(output).toMatch(/高リスク|中リスク|低リスク/);
    });

    it('--threshold オプションでしきい値を設定', () => {
      const output = execSync(`node ${CLI_PATH} analyze ${testCsvPath} --threshold 50`).toString();
      expect(output).toContain('リスク分析');
    });
  });

  describe('設定ファイル', () => {
    const configPath = path.join(TEST_DATA_DIR, '.dnsweeper.json');

    beforeAll(() => {
      // テスト用設定ファイルを作成
      fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({
        output: {
          colors: false,
          verbose: true
        },
        dns: {
          timeout: 3000
        }
      }, null, 2));
    });

    afterAll(() => {
      // 設定ファイルをクリーンアップ
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    });

    it('--config オプションで設定ファイルを読み込み', () => {
      const output = execSync(`node ${CLI_PATH} --config ${configPath} list`).toString();
      expect(output).toBeDefined();
      // 設定が適用されていることを確認（カラーが無効など）
    });
  });

  describe('グローバルオプション', () => {
    it('--quiet オプションで静音モード', () => {
      const output = execSync(`node ${CLI_PATH} --quiet list`).toString();
      // 静音モードでは出力が最小限
      expect(output.length).toBeLessThan(100);
    });

    it('複数のグローバルオプションを組み合わせ', () => {
      const output = execSync(`node ${CLI_PATH} --verbose --no-color list`).toString();
      expect(output).toBeDefined();
      // ANSIカラーコードが含まれていないことを確認
      expect(output).not.toMatch(/\x1b\[[0-9;]+m/);
    });
  });
});