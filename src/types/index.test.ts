import { describe, it, expect } from 'vitest';
import type {
  IDNSRecord,
  DNSRecordType,
  ICommandOptions,
  IListOptions,
  IAddOptions,
  IDeleteOptions,
  IConfig,
  IDNSResolverOptions,
  IDNSQuery,
  IDNSResolveResult,
} from './index.js';

describe('Type definitions', () => {
  describe('DNSRecordType', () => {
    it('should include all supported DNS record types', () => {
      const validTypes: DNSRecordType[] = [
        'A',
        'AAAA',
        'CNAME',
        'MX',
        'TXT',
        'NS',
        'SOA',
        'SRV',
        'PTR',
        'CAA',
      ];

      // Type test - this will fail at compile time if types don't match
      validTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('IDNSRecord', () => {
    it('should create valid DNS record object', () => {
      const record: IDNSRecord = {
        id: 'test-123',
        name: 'example.com',
        type: 'A',
        value: '192.168.1.1',
        ttl: 3600,
        priority: 10,
        weight: 5,
        port: 443,
        created: new Date(),
        updated: new Date(),
      };

      expect(record.id).toBe('test-123');
      expect(record.name).toBe('example.com');
      expect(record.type).toBe('A');
      expect(record.value).toBe('192.168.1.1');
      expect(record.ttl).toBe(3600);
      expect(record.priority).toBe(10);
      expect(record.weight).toBe(5);
      expect(record.port).toBe(443);
      expect(record.created).toBeInstanceOf(Date);
      expect(record.updated).toBeInstanceOf(Date);
    });

    it('should create minimal DNS record object', () => {
      const record: IDNSRecord = {
        id: 'minimal-123',
        name: 'test.com',
        type: 'CNAME',
        value: 'target.com',
        ttl: 300,
        created: new Date(),
        updated: new Date(),
      };

      expect(record.priority).toBeUndefined();
      expect(record.weight).toBeUndefined();
      expect(record.port).toBeUndefined();
    });
  });

  describe('ICommandOptions', () => {
    it('should create valid command options', () => {
      const options: ICommandOptions = {
        verbose: true,
        json: false,
        quiet: false,
      };

      expect(options.verbose).toBe(true);
      expect(options.json).toBe(false);
      expect(options.quiet).toBe(false);
    });

    it('should allow empty options', () => {
      const options: ICommandOptions = {};

      expect(options.verbose).toBeUndefined();
      expect(options.json).toBeUndefined();
      expect(options.quiet).toBeUndefined();
    });
  });

  describe('IListOptions', () => {
    it('should extend ICommandOptions correctly', () => {
      const options: IListOptions = {
        verbose: true,
        json: true,
        quiet: false,
        type: 'A',
        name: 'example.com',
        limit: '50',
      };

      expect(options.verbose).toBe(true);
      expect(options.type).toBe('A');
      expect(options.name).toBe('example.com');
      expect(options.limit).toBe('50');
    });
  });

  describe('IAddOptions', () => {
    it('should extend ICommandOptions with add-specific options', () => {
      const options: IAddOptions = {
        verbose: false,
        ttl: '7200',
        priority: '10',
        weight: '5',
        port: '443',
      };

      expect(options.ttl).toBe('7200');
      expect(options.priority).toBe('10');
      expect(options.weight).toBe('5');
      expect(options.port).toBe('443');
    });
  });

  describe('IDeleteOptions', () => {
    it('should extend ICommandOptions with delete-specific options', () => {
      const options: IDeleteOptions = {
        quiet: true,
        force: true,
        confirm: false,
      };

      expect(options.quiet).toBe(true);
      expect(options.force).toBe(true);
      expect(options.confirm).toBe(false);
    });
  });

  describe('IConfig', () => {
    it('should create valid configuration object', () => {
      const config: IConfig = {
        apiKey: 'test-api-key',
        apiUrl: 'https://api.example.com',
        defaultTTL: 3600,
        outputFormat: 'table',
      };

      expect(config.apiKey).toBe('test-api-key');
      expect(config.apiUrl).toBe('https://api.example.com');
      expect(config.defaultTTL).toBe(3600);
      expect(config.outputFormat).toBe('table');
    });

    it('should allow minimal configuration', () => {
      const config: IConfig = {
        defaultTTL: 300,
        outputFormat: 'json',
      };

      expect(config.apiKey).toBeUndefined();
      expect(config.apiUrl).toBeUndefined();
      expect(config.defaultTTL).toBe(300);
      expect(config.outputFormat).toBe('json');
    });
  });

  describe('IDNSResolverOptions', () => {
    it('should create valid resolver options', () => {
      const options: IDNSResolverOptions = {
        timeout: 5000,
        servers: ['8.8.8.8', '1.1.1.1'],
      };

      expect(options.timeout).toBe(5000);
      expect(options.servers).toEqual(['8.8.8.8', '1.1.1.1']);
    });

    it('should allow empty resolver options', () => {
      const options: IDNSResolverOptions = {};

      expect(options.timeout).toBeUndefined();
      expect(options.servers).toBeUndefined();
    });
  });

  describe('IDNSQuery', () => {
    it('should create valid DNS query', () => {
      const query: IDNSQuery = {
        domain: 'example.com',
        type: 'A',
        server: '8.8.8.8',
      };

      expect(query.domain).toBe('example.com');
      expect(query.type).toBe('A');
      expect(query.server).toBe('8.8.8.8');
    });

    it('should create query without server', () => {
      const query: IDNSQuery = {
        domain: 'test.com',
        type: 'MX',
      };

      expect(query.domain).toBe('test.com');
      expect(query.type).toBe('MX');
      expect(query.server).toBeUndefined();
    });
  });

  describe('IDNSResolveResult', () => {
    it('should create valid resolve result', () => {
      const result: IDNSResolveResult = {
        type: 'A',
        value: '192.168.1.1',
        ttl: 3600,
      };

      expect(result.type).toBe('A');
      expect(result.value).toBe('192.168.1.1');
      expect(result.ttl).toBe(3600);
    });

    it('should create MX record result', () => {
      const result: IDNSResolveResult = {
        type: 'MX',
        value: 'mail.example.com',
        ttl: 300,
        priority: 10,
        exchange: 'mail.example.com',
      };

      expect(result.type).toBe('MX');
      expect(result.priority).toBe(10);
      expect(result.exchange).toBe('mail.example.com');
    });

    it('should create SRV record result', () => {
      const result: IDNSResolveResult = {
        type: 'SRV',
        value: 'server.example.com',
        priority: 10,
        weight: 5,
        port: 443,
        target: 'server.example.com',
      };

      expect(result.type).toBe('SRV');
      expect(result.priority).toBe(10);
      expect(result.weight).toBe(5);
      expect(result.port).toBe(443);
      expect(result.target).toBe('server.example.com');
    });
  });
});
