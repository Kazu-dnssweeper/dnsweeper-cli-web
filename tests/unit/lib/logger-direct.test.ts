import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '../../../src/lib/logger.js';

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  table: vi.fn(),
};

vi.stubGlobal('console', mockConsole);

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create logger with default options', () => {
    const logger = new Logger();
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should create logger with custom options', () => {
    const logger = new Logger({ verbose: true, quiet: false });
    expect(logger).toBeInstanceOf(Logger);
  });

  it('should handle verbose and quiet options', () => {
    const verboseLogger = new Logger({ verbose: true });
    const quietLogger = new Logger({ quiet: true });

    expect(verboseLogger).toBeInstanceOf(Logger);
    expect(quietLogger).toBeInstanceOf(Logger);
  });

  describe('logging methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger();
    });

    it('should have success method', () => {
      expect(typeof logger.success).toBe('function');
      logger.success('Test success message');
      // Verify it doesn't throw
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
      logger.error('Test error message');
      // Verify it doesn't throw
    });

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
      logger.info('Test info message');
      // Verify it doesn't throw
    });

    it('should have table method', () => {
      expect(typeof logger.table).toBe('function');
      const testData = [{ id: 1, name: 'test' }];
      logger.table(testData);
      // Verify it doesn't throw
    });

    it('should have json method', () => {
      expect(typeof logger.json).toBe('function');
      const testData = { test: 'data' };
      logger.json(testData);
      // Verify it doesn't throw
    });
  });

  describe('spinner methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger();
    });

    it('should have startSpinner method', () => {
      expect(typeof logger.startSpinner).toBe('function');
      logger.startSpinner('Loading...');
      // Verify it doesn't throw
    });

    it('should have stopSpinner method', () => {
      expect(typeof logger.stopSpinner).toBe('function');
      logger.stopSpinner(true, 'Done');
      // Verify it doesn't throw
    });

    it('should handle spinner start and stop sequence', () => {
      logger.startSpinner('Processing...');
      logger.stopSpinner(true, 'Completed');
      // Verify it doesn't throw
    });
  });
});
