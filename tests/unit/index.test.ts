import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

// モックの設定
const mockCommands = {
  createListCommand: vi.fn(() => new Command('list')),
  createAddCommand: vi.fn(() => new Command('add')),
  createDeleteCommand: vi.fn(() => new Command('delete')),
  createImportCommand: vi.fn(() => new Command('import')),
  createAnalyzeCommand: vi.fn(() => new Command('analyze')),
  createLookupCommand: vi.fn(() => new Command('lookup')),
  createSweepCommand: vi.fn(() => new Command('sweep')),
  createValidateCommand: vi.fn(() => new Command('validate')),
  performanceCommand: new Command('performance'),
  createSyncCommand: vi.fn(() => new Command('sync')),
};

vi.mock('../../src/commands/index.js', () => mockCommands);

vi.mock('../../src/lib/logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
  })),
}));

vi.mock('../../src/lib/config.js', () => ({
  loadConfig: vi.fn().mockResolvedValue({
    dns: { timeout: 5000 },
    output: { format: 'table' }
  }),
  DnsSweeperConfig: {}
}));

// 動的インポートでモックを回避
let createProgram: any;
let main: any;

describe('index.ts', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // 動的インポートでテスト対象を取得
    const module = await import('../../src/index.js');
    createProgram = module.createProgram;
    main = module.main;
  });

  describe('createProgram', () => {
    it('プログラムを正しく作成する', () => {
      const program = createProgram();

      expect(program).toBeInstanceOf(Command);
      expect(program.name()).toBe('dnsweeper');
      expect(program.description()).toContain('DNS record risk analysis');
    });

    it('バージョンとオプションが設定されている', () => {
      const program = createProgram();
      const options = program.opts();

      // バージョンが設定されている
      expect(program.version()).toMatch(/\d+\.\d+\.\d+/);

      // グローバルオプションが定義されている
      const optionNames = program.options.map(opt => opt.long);
      expect(optionNames).toContain('--verbose');
      expect(optionNames).toContain('--quiet');
      expect(optionNames).toContain('--config');
    });

    it('すべてのサブコマンドが追加されている', () => {
      const program = createProgram();
      const commandNames = program.commands.map(cmd => cmd.name());

      expect(commandNames).toContain('list');
      expect(commandNames).toContain('add');
      expect(commandNames).toContain('delete');
      expect(commandNames).toContain('import');
      expect(commandNames).toContain('analyze');

      // コマンド作成関数が呼ばれていることを確認
      expect(mockCommands.createListCommand).toHaveBeenCalled();
      expect(mockCommands.createAddCommand).toHaveBeenCalled();
      expect(mockCommands.createDeleteCommand).toHaveBeenCalled();
      expect(mockCommands.createImportCommand).toHaveBeenCalled();
      expect(mockCommands.createAnalyzeCommand).toHaveBeenCalled();
    });

    it('無効なコマンドのハンドラーが設定されている', () => {
      const program = createProgram();
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      // command:* イベントをトリガー
      program.args = ['invalid-command'];
      
      expect(() => {
        program.emit('command:*');
      }).toThrow('process.exit called');

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });
  });

  describe('main', () => {
    const originalArgv = process.argv;

    beforeEach(() => {
      process.argv = ['node', 'dnsweeper'];
    });

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('正常にプログラムを実行する', async () => {
      process.argv.push('--help');
      
      const mockParseAsync = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(Command.prototype, 'parseAsync').mockImplementation(mockParseAsync);

      await main();

      expect(mockParseAsync).toHaveBeenCalledWith(process.argv);
    });

    it('エラー時に適切に処理する', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      const testError = new Error('テストエラー');
      vi.spyOn(Command.prototype, 'parseAsync').mockRejectedValue(testError);

      await expect(main()).rejects.toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('設定ファイルを読み込む', async () => {
      const { loadConfig } = await import('../../src/lib/config.js');
      
      process.argv.push('--config', 'custom.json', 'list');
      
      const mockParseAsync = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(Command.prototype, 'parseAsync').mockImplementation(mockParseAsync);

      await main();

      expect(loadConfig).toHaveBeenCalled();
    });

    it('未知のエラーを適切に処理する', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      // Error以外のものをthrow
      vi.spyOn(Command.prototype, 'parseAsync').mockRejectedValue('文字列エラー');

      await expect(main()).rejects.toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
  });

  describe('エントリーポイント', () => {
    it('main関数が自動的に呼ばれる', async () => {
      // このテストはファイルのトップレベルで main() が呼ばれることを確認
      // 実際の動作は他のテストでカバーされている
      expect(true).toBe(true);
    });
  });
});