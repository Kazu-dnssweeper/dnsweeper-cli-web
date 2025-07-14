import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAddCommand } from '../../../src/commands/add.js';
import type { IAddOptions } from '../../../src/types/index.js';
import { Logger } from '../../../src/lib/logger.js';

// Mock Logger
vi.mock('../../../src/lib/logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    startSpinner: vi.fn(),
    stopSpinner: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    json: vi.fn(),
  })),
}));

const MockedLogger = vi.mocked(Logger);

describe('createAddCommand', () => {
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

  it('should create add command with correct configuration', () => {
    const command = createAddCommand();

    expect(command.name()).toBe('add');
    expect(command.description()).toBe('Add a new DNS record');
  });

  it('should have required arguments', () => {
    const command = createAddCommand();
    const args = command.registeredArguments;

    expect(args).toHaveLength(3);
    expect(args[0]!.name()).toBe('name');
    expect(args[1]!.name()).toBe('type');
    expect(args[2]!.name()).toBe('value');
  });

  it('should have correct options', () => {
    const command = createAddCommand();
    const options = command.options;
    const optionFlags = options.map((opt) => opt.flags);

    expect(optionFlags).toContain('-t, --ttl <seconds>');
    expect(optionFlags).toContain('-p, --priority <number>');
    expect(optionFlags).toContain('-w, --weight <number>');
    expect(optionFlags).toContain('--port <number>');
    expect(optionFlags).toContain('-v, --verbose');
    expect(optionFlags).toContain('-j, --json');
    expect(optionFlags).toContain('-q, --quiet');
  });

  it('should execute add action with default options', () => {
    const command = createAddCommand();
    const mockLogger = {
      startSpinner: vi.fn(),
      stopSpinner: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      json: vi.fn(),
    };

    MockedLogger.mockReturnValue(mockLogger as any);

    const options: IAddOptions = {
      ttl: '7200',
      verbose: false,
      quiet: false,
      json: false,
    };

    // Execute the action
    const action = command._actions[0]!.fn;
    action('example.com', 'A', '192.168.1.1', options);

    expect(mockLogger.startSpinner).toHaveBeenCalledWith('Adding A record for example.com...');
    expect(mockLogger.stopSpinner).toHaveBeenCalledWith(true, 'DNS record added successfully');
    expect(mockLogger.success).toHaveBeenCalledWith('Added A record: example.com → 192.168.1.1');
    expect(mockLogger.info).toHaveBeenCalledWith('TTL: 7200 seconds');
  });

  it('should execute add action with JSON output', () => {
    const command = createAddCommand();
    const mockLogger = {
      startSpinner: vi.fn(),
      stopSpinner: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      json: vi.fn(),
    };

    MockedLogger.mockReturnValue(mockLogger as any);

    const options: IAddOptions = {
      ttl: '3600',
      priority: '10',
      verbose: false,
      quiet: false,
      json: true,
    };

    // Execute the action
    const action = command._actions[0]!.fn;
    action('mail.example.com', 'MX', 'mail.example.com', options);

    expect(mockLogger.json).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'mail.example.com',
        type: 'MX',
        value: 'mail.example.com',
        ttl: 3600,
        priority: 10,
      }),
    );
  });

  it('should handle SRV record with all options', () => {
    const command = createAddCommand();
    const mockLogger = {
      startSpinner: vi.fn(),
      stopSpinner: vi.fn(),
      success: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      json: vi.fn(),
    };

    MockedLogger.mockReturnValue(mockLogger as any);

    const options: IAddOptions = {
      ttl: '1800',
      priority: '10',
      weight: '5',
      port: '443',
      verbose: true,
      quiet: false,
      json: false,
    };

    // Execute the action
    const action = command._actions[0]!.fn;
    action('_https._tcp.example.com', 'SRV', 'server.example.com', options);

    expect(mockLogger.success).toHaveBeenCalledWith(
      'Added SRV record: _https._tcp.example.com → server.example.com',
    );
  });

  it('should handle errors gracefully', () => {
    const command = createAddCommand();

    // Mock Logger constructor to throw error
    MockedLogger.mockImplementation(() => {
      throw new Error('Test error');
    });

    const options: IAddOptions = {
      ttl: '3600',
      verbose: false,
      quiet: false,
      json: false,
    };

    // Execute the action and expect it to exit
    const action = command._actions[0]!.fn;

    expect(() => {
      action('example.com', 'A', '192.168.1.1', options);
    }).toThrow('process.exit called');

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
