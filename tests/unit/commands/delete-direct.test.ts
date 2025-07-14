import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDeleteCommand } from '../../../src/commands/delete.js';
import type { IDeleteOptions } from '../../../src/types/index.js';
import inquirer from 'inquirer';
import { Logger } from '../../../src/lib/logger.js';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock Logger
vi.mock('../../../src/lib/logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    startSpinner: vi.fn(),
    stopSpinner: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

const MockedInquirer = vi.mocked(inquirer);
const MockedLogger = vi.mocked(Logger);

describe('createDeleteCommand', () => {
  let mockExit: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  it('should create delete command with correct configuration', () => {
    const command = createDeleteCommand();

    expect(command.name()).toBe('delete');
    expect(command.alias()).toBe('rm');
    expect(command.description()).toBe('Delete a DNS record');
  });

  it('should have required argument', () => {
    const command = createDeleteCommand();
    const args = command.registeredArguments;

    expect(args).toHaveLength(1);
    expect(args[0]!.name()).toBe('id');
  });

  it('should have correct options', () => {
    const command = createDeleteCommand();
    const options = command.options;
    const optionFlags = options.map((opt) => opt.flags);

    expect(optionFlags).toContain('-f, --force');
    expect(optionFlags).toContain('-v, --verbose');
    expect(optionFlags).toContain('-q, --quiet');
  });

  it('should execute delete with force option', async () => {
    const command = createDeleteCommand();
    const mockLogger = {
      startSpinner: vi.fn(),
      stopSpinner: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };

    MockedLogger.mockReturnValue(mockLogger as any);

    const options: IDeleteOptions = {
      force: true,
      verbose: false,
      quiet: false,
    };

    // Execute the action
    const action = command._actions[0]!.fn;
    await action('test-id-123', options);

    expect(MockedInquirer.prompt).not.toHaveBeenCalled();
    expect(mockLogger.startSpinner).toHaveBeenCalledWith('Deleting DNS record test-id-123...');
    expect(mockLogger.stopSpinner).toHaveBeenCalledWith(true, 'DNS record deleted successfully');
    expect(mockLogger.success).toHaveBeenCalledWith('Deleted DNS record: test-id-123');
  });

  it('should execute delete with confirmation', async () => {
    const command = createDeleteCommand();
    const mockLogger = {
      startSpinner: vi.fn(),
      stopSpinner: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };

    MockedLogger.mockReturnValue(mockLogger as any);

    // Mock confirmation prompt
    MockedInquirer.prompt.mockResolvedValue({ confirm: true });

    const options: IDeleteOptions = {
      force: false,
      verbose: false,
      quiet: false,
    };

    // Execute the action
    const action = command._actions[0]!.fn;
    await action('test-id-456', options);

    expect(MockedInquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to delete record test-id-456?',
        default: false,
      },
    ]);
    expect(mockLogger.startSpinner).toHaveBeenCalledWith('Deleting DNS record test-id-456...');
    expect(mockLogger.success).toHaveBeenCalledWith('Deleted DNS record: test-id-456');
  });

  it('should cancel deletion when user declines confirmation', async () => {
    const command = createDeleteCommand();
    const mockLogger = {
      startSpinner: vi.fn(),
      stopSpinner: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };

    MockedLogger.mockReturnValue(mockLogger as any);

    // Mock confirmation prompt - user says no
    MockedInquirer.prompt.mockResolvedValue({ confirm: false });

    const options: IDeleteOptions = {
      force: false,
      verbose: false,
      quiet: false,
    };

    // Execute the action
    const action = command._actions[0]!.fn;
    await action('test-id-789', options);

    expect(mockLogger.info).toHaveBeenCalledWith('Deletion cancelled');
    expect(mockLogger.startSpinner).not.toHaveBeenCalled();
    expect(mockLogger.success).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const command = createDeleteCommand();
    const mockLogger = {
      startSpinner: vi.fn(),
      stopSpinner: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    };

    MockedLogger.mockReturnValue(mockLogger as any);

    // Mock inquirer to throw error
    MockedInquirer.prompt.mockRejectedValue(new Error('Prompt error'));

    const options: IDeleteOptions = {
      force: false,
      verbose: false,
      quiet: false,
    };

    // Execute the action and expect it to exit
    const action = command._actions[0]!.fn;

    await expect(async () => {
      await action('test-id-error', options);
    }).rejects.toThrow('process.exit called');

    expect(mockLogger.error).toHaveBeenCalledWith('Prompt error');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
