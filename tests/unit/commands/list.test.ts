import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createListCommand } from '../../../src/commands/list.js';
import { Command } from 'commander';

// モックの設定
const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  success: vi.fn(),
  table: vi.fn(),
};

vi.mock('../../../src/lib/logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => mockLogger),
}));

describe('list command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createListCommand', () => {
    it('listコマンドを正しく作成する', () => {
      const command = createListCommand();

      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('list');
      expect(command.description()).toContain('List DNS records');
    });

    it('オプションが定義されている', () => {
      const command = createListCommand();
      
      // オプションの名前を取得
      const optionNames = command.options.map(opt => opt.long);
      
      expect(optionNames).toContain('--domain');
      expect(optionNames).toContain('--type');
      expect(optionNames).toContain('--format');
      expect(optionNames).toContain('--sort');
      expect(optionNames).toContain('--limit');
    });

    it('formatオプションのデフォルト値が設定されている', () => {
      const command = createListCommand();
      const formatOption = command.options.find(opt => opt.long === '--format');
      
      expect(formatOption?.defaultValue).toBe('table');
    });

    it('sortオプションのデフォルト値が設定されている', () => {
      const command = createListCommand();
      const sortOption = command.options.find(opt => opt.long === '--sort');
      
      expect(sortOption?.defaultValue).toBe('domain');
    });
  });

  describe('list command action', () => {
    it('デフォルトオプションでリストを表示', async () => {
      const command = createListCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync(['node', 'test']);

      expect(mockAction).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'table',
          sort: 'domain'
        })
      );
    });

    it('特定ドメインのレコードをフィルタリング', async () => {
      const command = createListCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        '--domain', 'example.com'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'example.com',
          format: 'table',
          sort: 'domain'
        })
      );
    });

    it('特定タイプのレコードをフィルタリング', async () => {
      const command = createListCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        '--type', 'A'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'A',
          format: 'table',
          sort: 'domain'
        })
      );
    });

    it('JSON形式で出力', async () => {
      const command = createListCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        '--format', 'json'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'json',
          sort: 'domain'
        })
      );
    });

    it('CSV形式で出力', async () => {
      const command = createListCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        '--format', 'csv'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'csv',
          sort: 'domain'
        })
      );
    });

    it('タイプでソート', async () => {
      const command = createListCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        '--sort', 'type'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'table',
          sort: 'type'
        })
      );
    });

    it('結果数を制限', async () => {
      const command = createListCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        '--limit', '10'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'table',
          sort: 'domain',
          limit: '10'
        })
      );
    });

    it('複数のオプションを組み合わせて使用', async () => {
      const command = createListCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        '--domain', 'example.com',
        '--type', 'MX',
        '--format', 'json',
        '--sort', 'value',
        '--limit', '5'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'example.com',
          type: 'MX',
          format: 'json',
          sort: 'value',
          limit: '5'
        })
      );
    });

    it('実際のアクションハンドラーをテスト', async () => {
      const command = createListCommand();
      
      // parseAsyncを直接呼び出してアクションを実行
      await command.parseAsync(['node', 'test']);

      // Logger.infoが呼ばれたことを確認
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Listing DNS records')
      );
    });

    it('テーブル形式での出力', async () => {
      const command = createListCommand();
      
      await command.parseAsync([
        'node', 'test',
        '--format', 'table'
      ]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Format: table')
      );
    });

    it('フィルタリング条件をログに記録', async () => {
      const command = createListCommand();
      
      await command.parseAsync([
        'node', 'test',
        '--domain', 'api.example.com',
        '--type', 'A'
      ]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Domain filter: api.example.com')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Type filter: A')
      );
    });
  });

  describe('ソートオプション', () => {
    const sortOptions = ['domain', 'type', 'value', 'ttl'];

    sortOptions.forEach(sortOption => {
      it(`${sortOption}でソートできる`, async () => {
        const command = createListCommand();
        
        await command.parseAsync([
          'node', 'test',
          '--sort', sortOption
        ]);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining(`Sort by: ${sortOption}`)
        );
      });
    });
  });

  describe('出力形式', () => {
    const formats = ['table', 'json', 'csv'];

    formats.forEach(format => {
      it(`${format}形式で出力できる`, async () => {
        const command = createListCommand();
        
        await command.parseAsync([
          'node', 'test',
          '--format', format
        ]);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining(`Format: ${format}`)
        );
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('無効な形式オプションも現時点では許可される', async () => {
      const command = createListCommand();
      
      // 現時点では検証がないため、エラーは発生しない
      await expect(
        command.parseAsync([
          'node', 'test',
          '--format', 'invalid'
        ])
      ).resolves.not.toThrow();
    });

    it('無効なソートオプションも現時点では許可される', async () => {
      const command = createListCommand();
      
      // 現時点では検証がないため、エラーは発生しない
      await expect(
        command.parseAsync([
          'node', 'test',
          '--sort', 'invalid'
        ])
      ).resolves.not.toThrow();
    });
  });

  describe('ワイルドカードフィルタリング', () => {
    it('ワイルドカードドメインでフィルタリング', async () => {
      const command = createListCommand();
      
      await command.parseAsync([
        'node', 'test',
        '--domain', '*.example.com'
      ]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Domain filter: *.example.com')
      );
    });
  });
});