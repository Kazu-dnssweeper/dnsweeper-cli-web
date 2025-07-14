import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDeleteCommand } from '../../../src/commands/delete.js';
import { Command } from 'commander';

// モックの設定
const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  success: vi.fn(),
};

vi.mock('../../../src/lib/logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => mockLogger),
}));

describe('delete command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDeleteCommand', () => {
    it('deleteコマンドを正しく作成する', () => {
      const command = createDeleteCommand();

      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('delete');
      expect(command.description()).toContain('Delete a DNS record');
    });

    it('必要な引数が定義されている', () => {
      const command = createDeleteCommand();
      
      // 引数の名前を取得
      const argNames = command.registeredArguments.map(arg => arg.name());
      
      expect(argNames).toContain('domain');
      expect(argNames).toContain('type');
    });

    it('オプションが定義されている', () => {
      const command = createDeleteCommand();
      
      // オプションの名前を取得
      const optionNames = command.options.map(opt => opt.long);
      
      expect(optionNames).toContain('--value');
      expect(optionNames).toContain('--force');
      expect(optionNames).toContain('--dry-run');
    });
  });

  describe('delete command action', () => {
    it('特定のレコードを削除する', async () => {
      const command = createDeleteCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync(['node', 'test', 'example.com', 'A']);

      expect(mockAction).toHaveBeenCalledWith(
        'example.com',
        'A',
        expect.objectContaining({})
      );
    });

    it('値を指定してレコードを削除する', async () => {
      const command = createDeleteCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        'example.com', 'A',
        '--value', '192.168.1.1'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        'example.com',
        'A',
        expect.objectContaining({
          value: '192.168.1.1'
        })
      );
    });

    it('強制削除オプションを使用する', async () => {
      const command = createDeleteCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        'example.com', 'MX',
        '--force'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        'example.com',
        'MX',
        expect.objectContaining({
          force: true
        })
      );
    });

    it('ドライランモードで実行する', async () => {
      const command = createDeleteCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        'example.com', 'CNAME',
        '--dry-run'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        'example.com',
        'CNAME',
        expect.objectContaining({
          dryRun: true
        })
      );
    });

    it('実際のアクションハンドラーをテスト', async () => {
      const command = createDeleteCommand();
      
      // parseAsyncを直接呼び出してアクションを実行
      await command.parseAsync(['node', 'test', 'example.com', 'A']);

      // Logger.infoが呼ばれたことを確認
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Deleting DNS record')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('example.com')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Type: A')
      );
    });

    it('値指定での削除をログに記録', async () => {
      const command = createDeleteCommand();
      
      await command.parseAsync([
        'node', 'test',
        'test.com', 'TXT',
        '--value', 'v=spf1 include:_spf.google.com ~all'
      ]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Value: v=spf1 include:_spf.google.com ~all')
      );
    });

    it('ドライランモードでの実行をログに記録', async () => {
      const command = createDeleteCommand();
      
      await command.parseAsync([
        'node', 'test',
        'staging.example.com', 'A',
        '--dry-run'
      ]);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('DRY RUN MODE')
      );
    });

    it('複数のオプションを組み合わせて使用', async () => {
      const command = createDeleteCommand();
      
      await command.parseAsync([
        'node', 'test',
        'old.example.com', 'A',
        '--value', '10.0.0.1',
        '--force',
        '--dry-run'
      ]);

      // ドライランモードの警告
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('DRY RUN MODE')
      );
      
      // 強制削除の情報
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Force: true')
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('引数が不足している場合はCommanderがエラーを出す', async () => {
      const command = createDeleteCommand();
      
      // exitOverrideを使用してprocess.exitを防ぐ
      command.exitOverride();
      
      await expect(
        command.parseAsync(['node', 'test', 'example.com'])
      ).rejects.toThrow();
    });

    it('無効なオプションの組み合わせも現時点では許可される', async () => {
      const command = createDeleteCommand();
      
      // 現時点では検証がないため、エラーは発生しない
      await expect(
        command.parseAsync([
          'node', 'test',
          'example.com', 'A',
          '--force',
          '--dry-run'
        ])
      ).resolves.not.toThrow();
    });
  });

  describe('ワイルドカード削除', () => {
    it('ワイルドカードドメインの削除', async () => {
      const command = createDeleteCommand();
      
      await command.parseAsync([
        'node', 'test',
        '*.example.com', 'A',
        '--force'
      ]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('*.example.com')
      );
    });
  });
});