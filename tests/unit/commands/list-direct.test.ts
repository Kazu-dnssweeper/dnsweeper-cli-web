import { describe, it, expect, vi } from 'vitest';
import { createListCommand } from '../../../src/commands/list.js';

// Mock DNSResolver
vi.mock('../../../src/lib/dns-resolver.js', () => ({
  DNSResolver: vi.fn().mockImplementation(() => ({
    lookupMultiple: vi.fn().mockResolvedValue([
      {
        status: 'success',
        query: { domain: 'google.com', type: 'A' },
        records: [{ type: 'A', value: '142.250.207.46' }],
        responseTime: 50,
      },
      {
        status: 'success',
        query: { domain: 'github.com', type: 'A' },
        records: [{ type: 'A', value: '20.27.177.113' }],
        responseTime: 45,
      },
    ]),
  })),
}));

// Mock Logger
vi.mock('../lib/logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    startSpinner: vi.fn(),
    stopSpinner: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    table: vi.fn(),
    json: vi.fn(),
  })),
}));

describe('List Command', () => {
  it('should create list command with correct configuration', () => {
    const command = createListCommand();

    expect(command.name()).toBe('list');
    expect(command.alias()).toBe('ls');
    expect(command.description()).toContain('List DNS records');
  });

  it('should have correct options configured', () => {
    const command = createListCommand();
    const options = command.options;

    const optionNames = options.map((opt) => opt.long);
    expect(optionNames).toContain('--type');
    expect(optionNames).toContain('--name');
    expect(optionNames).toContain('--limit');
    expect(optionNames).toContain('--verbose');
    expect(optionNames).toContain('--json');
    expect(optionNames).toContain('--quiet');
  });

  it('should have type option with correct description', () => {
    const command = createListCommand();
    const typeOption = command.options.find((opt) => opt.long === '--type');

    expect(typeOption?.description).toContain('Filter by record type');
  });

  it('should have limit option with default value', () => {
    const command = createListCommand();
    const limitOption = command.options.find((opt) => opt.long === '--limit');

    expect(limitOption?.defaultValue).toBe('50');
  });
});
