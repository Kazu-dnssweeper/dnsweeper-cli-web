import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Command } from 'commander';
import { createProgram, main } from '../../src/index.js';

// Mock dependencies
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue('{"version": "1.0.0", "description": "Test description"}'),
}));

vi.mock('../../src/commands/index.js', () => ({
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
}));

vi.mock('../../src/lib/logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

describe('CLI main entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProgram', () => {
    it('should create program with correct configuration', () => {
      const program = createProgram();

      expect(program.name()).toBe('dnsweeper');
      expect(program.description()).toBe('Test description');
      expect(program.version()).toBe('1.0.0');
    });

    it('should add verbose and quiet options', () => {
      const program = createProgram();

      const options = program.options;
      const optionFlags = options.map((opt) => opt.flags);

      expect(optionFlags).toContain('-v, --verbose');
      expect(optionFlags).toContain('-q, --quiet');
    });

    it('should add all required commands', () => {
      const program = createProgram();

      const commands = program.commands;
      const commandNames = commands.map((cmd) => cmd.name());

      expect(commandNames).toContain('list');
      expect(commandNames).toContain('add');
      expect(commandNames).toContain('delete');
      expect(commandNames).toContain('import');
      expect(commandNames).toContain('analyze');
      expect(commandNames).toContain('lookup');
      expect(commandNames).toContain('sweep');
      expect(commandNames).toContain('validate');
    });
  });

  describe('invalid command handling', () => {
    it('should handle invalid commands', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      const program = createProgram();

      // Simulate invalid command
      program.args = ['invalid', 'command'];

      expect(() => {
        program.emit('command:invalid');
      }).toThrow('process.exit called');

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });
  });

  describe('main function', () => {
    it('should handle errors gracefully', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      // Mock createProgram to return a program that throws
      vi.doMock('../../src/index.js', () => ({
        createProgram: vi.fn(() => ({
          parseAsync: vi.fn().mockRejectedValue(new Error('Test error')),
        })),
        main,
      }));

      await expect(main()).rejects.toThrow('process.exit called');

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it('should run without errors when successful', async () => {
      const mockProgram = {
        parseAsync: vi.fn().mockResolvedValue(undefined),
      };

      vi.doMock('../../src/index.js', () => ({
        createProgram: vi.fn(() => mockProgram),
        main,
      }));

      await expect(main()).resolves.toBeUndefined();
      expect(mockProgram.parseAsync).toHaveBeenCalledWith(process.argv);
    });
  });
});
