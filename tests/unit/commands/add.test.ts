import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAddCommand } from '../add.js';
import { Command } from 'commander';

// モックの設定
vi.mock('../../lib/logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
  })),
}));

describe('add command', () => {
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { Logger } = vi.mocked(await import('../../lib/logger.js'));
    mockLogger = new Logger();
  });

  describe('createAddCommand', () => {
    it('addコマンドを正しく作成する', () => {
      const command = createAddCommand();

      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('add');
      expect(command.description()).toContain('Add a new DNS record');
    });

    it('必要な引数が定義されている', () => {
      const command = createAddCommand();
      
      // 引数の名前を取得
      const argNames = command.registeredArguments.map(arg => arg.name());
      
      expect(argNames).toContain('domain');
      expect(argNames).toContain('type');
      expect(argNames).toContain('value');
    });

    it('オプションが定義されている', () => {
      const command = createAddCommand();
      
      // オプションの名前を取得
      const optionNames = command.options.map(opt => opt.long);
      
      expect(optionNames).toContain('--ttl');
      expect(optionNames).toContain('--priority');
      expect(optionNames).toContain('--weight');
      expect(optionNames).toContain('--port');
    });

    it('デフォルトのTTL値が設定されている', () => {
      const command = createAddCommand();
      const ttlOption = command.options.find(opt => opt.long === '--ttl');
      
      expect(ttlOption?.defaultValue).toBe('3600');
    });
  });

  describe('add command action', () => {
    it('有効なAレコードを追加する', async () => {
      const command = createAddCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync(['node', 'test', 'example.com', 'A', '192.168.1.1']);

      expect(mockAction).toHaveBeenCalledWith(
        'example.com',
        'A',
        '192.168.1.1',
        expect.objectContaining({
          ttl: '3600'
        })
      );
    });

    it('MXレコードを優先度付きで追加する', async () => {
      const command = createAddCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        'example.com', 'MX', 'mail.example.com',
        '--priority', '10',
        '--ttl', '7200'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        'example.com',
        'MX',
        'mail.example.com',
        expect.objectContaining({
          ttl: '7200',
          priority: '10'
        })
      );
    });

    it('SRVレコードを完全なオプションで追加する', async () => {
      const command = createAddCommand();
      const mockAction = vi.fn();
      command.action(mockAction);

      // コマンドを実行
      await command.parseAsync([
        'node', 'test',
        '_http._tcp.example.com', 'SRV', 'server.example.com',
        '--priority', '10',
        '--weight', '60',
        '--port', '80',
        '--ttl', '300'
      ]);

      expect(mockAction).toHaveBeenCalledWith(
        '_http._tcp.example.com',
        'SRV',
        'server.example.com',
        expect.objectContaining({
          ttl: '300',
          priority: '10',
          weight: '60',
          port: '80'
        })
      );
    });

    it('実際のアクションハンドラーをテスト', async () => {
      const command = createAddCommand();
      
      // parseAsyncを直接呼び出してアクションを実行
      await command.parseAsync(['node', 'test', 'example.com', 'A', '192.168.1.1']);

      // Logger.infoが呼ばれたことを確認
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Adding DNS record')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('example.com')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.1')
      );
    });

    it('すべてのオプションが正しく処理される', async () => {
      const command = createAddCommand();
      
      await command.parseAsync([
        'node', 'test',
        'test.com', 'MX', 'mail.test.com',
        '--ttl', '1800',
        '--priority', '20'
      ]);

      // オプションの情報がログに含まれることを確認
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Priority: 20')
      );
    });
  });

  describe('入力検証', () => {
    it('無効なレコードタイプでもコマンドは実行される（実際の検証は後で追加）', async () => {
      const command = createAddCommand();
      
      // 現時点では検証がないため、エラーは発生しない
      await expect(
        command.parseAsync(['node', 'test', 'example.com', 'INVALID', 'value'])
      ).resolves.not.toThrow();
    });

    it('引数が不足している場合はCommanderがエラーを出す', async () => {
      const command = createAddCommand();
      
      // exitOverrideを使用してprocess.exitを防ぐ
      command.exitOverride();
      
      await expect(
        command.parseAsync(['node', 'test', 'example.com'])
      ).rejects.toThrow();
    });
  });
});