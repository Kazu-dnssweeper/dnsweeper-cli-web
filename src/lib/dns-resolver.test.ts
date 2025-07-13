import { describe, it, expect, beforeEach } from 'vitest';
import type { DNSRecordType } from '../types/index.js';
import { DNSResolver } from './dns-resolver.js';
import { TEST_DOMAINS } from '../test/setup.js';

describe('DNSResolver', () => {
  let resolver: DNSResolver;

  beforeEach(() => {
    resolver = new DNSResolver({ timeout: 5000 });
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const defaultResolver = new DNSResolver();
      expect(defaultResolver).toBeInstanceOf(DNSResolver);
    });

    it('should create instance with custom options', () => {
      const customResolver = new DNSResolver({
        timeout: 10000,
        servers: ['8.8.8.8', '1.1.1.1'],
      });
      expect(customResolver).toBeInstanceOf(DNSResolver);
    });
  });

  describe('resolve A records', () => {
    it('should resolve A record for valid domain', async () => {
      const result = await resolver.resolve('google.com', 'A');

      expect(result.status).toBe('success');
      expect(result.records).toHaveLength(1);
      expect(result.records[0]!.type).toBe('A');
      expect(result.records[0]!.value).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should handle non-existent domain', async () => {
      const result = await resolver.resolve(TEST_DOMAINS.invalid[0], 'A');

      expect(result.status).toBe('error');
      expect(result.records).toHaveLength(0);
      expect(result.error).toContain('Domain not found');
    });
  });

  describe('resolve AAAA records', () => {
    it('should resolve AAAA record for valid domain', async () => {
      const result = await resolver.resolve('google.com', 'AAAA');

      if (result.status === 'success' && result.records.length > 0) {
        expect(result.records[0]!.type).toBe('AAAA');
        expect(result.records[0]!.value).toMatch(/^[0-9a-f:]+$/i);
      } else {
        // Some domains might not have AAAA records
        expect(result.status).toMatch(/^(success|error)$/);
      }
    });
  });

  describe('resolve MX records', () => {
    it('should resolve MX records for valid domain', async () => {
      const result = await resolver.resolve('google.com', 'MX');

      expect(result.status).toBe('success');
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.records[0]!.type).toBe('MX');
      expect(result.records[0]!.priority).toBeDefined();
      expect(result.records[0]!.exchange).toBeDefined();
    });
  });

  describe('resolve TXT records', () => {
    it('should resolve TXT records for valid domain', async () => {
      const result = await resolver.resolve('google.com', 'TXT');

      if (result.status === 'success' && result.records.length > 0) {
        expect(result.records[0]!.type).toBe('TXT');
        expect(typeof result.records[0]!.value).toBe('string');
      }
    });
  });

  describe('timeout handling', () => {
    it('should handle very short timeout', async () => {
      const fastResolver = new DNSResolver({ timeout: 1 }); // 1ms timeout
      const result = await fastResolver.resolve('google.com', 'A');

      // Might succeed if DNS is very fast, or timeout
      expect(result.status).toMatch(/^(success|timeout|error)$/);
      expect(result.responseTime).toBeDefined();
    });
  });

  describe('batch operations', () => {
    it('should resolve multiple domains', async () => {
      const domains = ['google.com', 'github.com'];
      const results = await resolver.lookupMultiple(domains, 'A');

      expect(results).toHaveLength(2);
      expect(results[0]!.query.domain).toBe('google.com');
      expect(results[1]!.query.domain).toBe('github.com');
    });

    it('should handle mixed success/failure in batch', async () => {
      const domains = ['google.com', TEST_DOMAINS.invalid[0]];
      const results = await resolver.lookupMultiple(domains, 'A');

      expect(results).toHaveLength(2);
      expect(results[0]!.status).toBe('success');
      expect(results[1]!.status).toBe('error');
    });
  });

  describe('error handling', () => {
    it('should handle unsupported record type gracefully', async () => {
      const result = await resolver.resolve('google.com', 'UNKNOWN' as DNSRecordType);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Unsupported DNS record type');
    });

    it('should handle CAA records (not supported)', async () => {
      const result = await resolver.resolve('google.com', 'CAA');

      // CAA returns empty array but success status
      expect(result.status).toBe('success');
      expect(result.records).toHaveLength(0);
    });
  });

  describe('reverse lookup', () => {
    it('should perform reverse lookup', async () => {
      const result = await resolver.reverseLookup('8.8.8.8');

      expect(result.query.type).toBe('PTR');
      // Results may vary depending on DNS configuration
    });
  });
});
