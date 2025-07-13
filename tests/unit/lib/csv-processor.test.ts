import { describe, it, expect, beforeEach } from 'vitest';
import { CSVProcessor, type ICSVRecord } from '../../../src/lib/csv-processor.js';
import fs from 'fs';
import path from 'path';

describe('CSVProcessor', () => {
  let processor: CSVProcessor;
  const testDataPath = path.resolve(process.cwd(), 'test-data');

  beforeEach(() => {
    processor = new CSVProcessor();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const defaultProcessor = new CSVProcessor();
      expect(defaultProcessor).toBeInstanceOf(CSVProcessor);
    });

    it('should create instance with custom options', () => {
      const customProcessor = new CSVProcessor({
        skipEmptyLines: false,
        trimValues: false,
        delimiter: ';',
      });
      expect(customProcessor).toBeInstanceOf(CSVProcessor);
    });
  });

  describe('parseCloudflare', () => {
    const cloudflareFile = path.join(testDataPath, 'cloudflare-sample.csv');

    it('should parse Cloudflare CSV format correctly', async () => {
      const result = await processor.parseCloudflare(cloudflareFile);

      expect(result.records).toHaveLength(7);
      expect(result.validRows).toBe(7);
      expect(result.totalRows).toBe(7);
      expect(result.errors).toHaveLength(0);

      // Check first A record
      const aRecord = result.records.find((r) => r.type === 'A');
      expect(aRecord).toBeDefined();
      expect(aRecord?.domain).toBe('example.com');
      expect(aRecord?.value).toBe('192.168.1.1');
      expect(aRecord?.ttl).toBe(3600);

      // Check MX record with priority
      const mxRecord = result.records.find((r) => r.type === 'MX');
      expect(mxRecord).toBeDefined();
      expect(mxRecord?.domain).toBe('mail.example.com');
      expect(mxRecord?.value).toBe('mail.example.com');
      expect(mxRecord?.priority).toBe(10);

      // Check CNAME record
      const cnameRecord = result.records.find((r) => r.type === 'CNAME');
      expect(cnameRecord).toBeDefined();
      expect(cnameRecord?.domain).toBe('www.example.com');
      expect(cnameRecord?.value).toBe('example.com');
    });
  });

  describe('parseRoute53', () => {
    const route53File = path.join(testDataPath, 'route53-sample.csv');

    it('should parse Route53 CSV format correctly', async () => {
      const result = await processor.parseRoute53(route53File);

      expect(result.records).toHaveLength(7);
      expect(result.validRows).toBe(7);
      expect(result.errors).toHaveLength(0);

      // Check MX record with priority in value
      const mxRecord = result.records.find((r) => r.type === 'MX');
      expect(mxRecord).toBeDefined();
      expect(mxRecord?.domain).toBe('example.com');
      expect(mxRecord?.value).toBe('mail.example.com');
      expect(mxRecord?.priority).toBe(10);

      // Check A record
      const aRecord = result.records.find((r) => r.type === 'A');
      expect(aRecord).toBeDefined();
      expect(aRecord?.domain).toBe('example.com');
      expect(aRecord?.value).toBe('192.168.1.1');
      expect(aRecord?.ttl).toBe(300);
    });
  });

  describe('parseGeneric', () => {
    const genericFile = path.join(testDataPath, 'generic-sample.csv');

    it('should parse generic CSV format correctly', async () => {
      const result = await processor.parseGeneric(genericFile);

      expect(result.records).toHaveLength(8);
      expect(result.validRows).toBe(8);
      expect(result.errors).toHaveLength(0);

      // Check SRV record with all fields
      const srvRecord = result.records.find((r) => r.type === 'SRV');
      expect(srvRecord).toBeDefined();
      expect(srvRecord?.domain).toBe('sip.example.com');
      expect(srvRecord?.value).toBe('sip.example.com');
      expect(srvRecord?.priority).toBe(10);
      expect(srvRecord?.weight).toBe(5);
      expect(srvRecord?.port).toBe(5060);

      // Check basic A record
      const aRecord = result.records.find((r) => r.type === 'A');
      expect(aRecord).toBeDefined();
      expect(aRecord?.domain).toBe('example.com');
      expect(aRecord?.value).toBe('192.168.1.1');
    });
  });

  describe('parseAuto', () => {
    it('should auto-detect Cloudflare format', async () => {
      const cloudflareFile = path.join(testDataPath, 'cloudflare-sample.csv');
      const result = await processor.parseAuto(cloudflareFile);

      expect(result.records.length).toBeGreaterThan(0);
      expect(result.validRows).toBeGreaterThan(0);
    });

    it('should auto-detect Route53 format', async () => {
      const route53File = path.join(testDataPath, 'route53-sample.csv');
      const result = await processor.parseAuto(route53File);

      expect(result.records.length).toBeGreaterThan(0);
      expect(result.validRows).toBeGreaterThan(0);
    });

    it('should auto-detect generic format', async () => {
      const genericFile = path.join(testDataPath, 'generic-sample.csv');
      const result = await processor.parseAuto(genericFile);

      expect(result.records.length).toBeGreaterThan(0);
      expect(result.validRows).toBeGreaterThan(0);
    });

    it('should throw error for unsupported format', async () => {
      // Create a temporary file with unsupported headers
      const unsupportedFile = path.join(testDataPath, 'unsupported.csv');
      fs.writeFileSync(unsupportedFile, 'unknown,headers,format\ndata,data,data');

      await expect(processor.parseAuto(unsupportedFile)).rejects.toThrow('Unsupported CSV format');

      // Cleanup
      fs.unlinkSync(unsupportedFile);
    });
  });

  describe('parseStreaming', () => {
    it('should process records via streaming', async () => {
      const genericFile = path.join(testDataPath, 'generic-sample.csv');
      const processedRecords: ICSVRecord[] = [];

      const result = await processor.parseStreaming(
        genericFile,
        (record) => {
          processedRecords.push(record);
        },
        'generic',
      );

      expect(result.totalProcessed).toBe(8);
      expect(result.errors).toHaveLength(0);
      expect(processedRecords).toHaveLength(8);

      // Verify first record
      expect(processedRecords[0]!.domain).toBe('example.com');
      expect(processedRecords[0]!.type).toBe('A');
    });
  });

  describe('error handling', () => {
    it('should handle missing file gracefully', async () => {
      const nonExistentFile = path.join(testDataPath, 'non-existent.csv');

      await expect(processor.parseCloudflare(nonExistentFile)).rejects.toThrow();
    });

    it('should handle malformed CSV', async () => {
      // Create a temporary malformed CSV
      const malformedFile = path.join(testDataPath, 'malformed.csv');
      fs.writeFileSync(
        malformedFile,
        'Name,Type,Content\nexample.com,A\ninvalid,line,too,many,columns',
      );

      const result = await processor.parseCloudflare(malformedFile);

      // Should still parse what it can
      expect(result.records.length).toBeLessThan(3);

      // Cleanup
      fs.unlinkSync(malformedFile);
    });

    it('should handle empty CSV file', async () => {
      // Create empty CSV
      const emptyFile = path.join(testDataPath, 'empty.csv');
      fs.writeFileSync(emptyFile, '');

      const result = await processor.parseCloudflare(emptyFile);

      // Empty file should return empty results, not throw error
      expect(result.records).toHaveLength(0);
      expect(result.totalRows).toBe(0);
      expect(result.validRows).toBe(0);

      // Cleanup
      fs.unlinkSync(emptyFile);
    });
  });

  describe('data validation', () => {
    it('should validate DNS record types', async () => {
      // Create CSV with invalid record type
      const invalidFile = path.join(testDataPath, 'invalid-type.csv');
      fs.writeFileSync(
        invalidFile,
        'domain,record_type,value,ttl\nexample.com,INVALID,192.168.1.1,3600',
      );

      const result = await processor.parseGeneric(invalidFile);

      // Should still process but record type will be as-is
      expect(result.records).toHaveLength(1);
      expect(result.records[0]!.type).toBe('INVALID');

      // Cleanup
      fs.unlinkSync(invalidFile);
    });

    it('should handle missing required fields', async () => {
      // Create CSV with missing fields
      const incompleteFile = path.join(testDataPath, 'incomplete.csv');
      fs.writeFileSync(
        incompleteFile,
        'domain,record_type,value,ttl\n,A,192.168.1.1,3600\nexample.com,,192.168.1.1,3600',
      );

      const result = await processor.parseGeneric(incompleteFile);

      // Should skip invalid rows
      expect(result.validRows).toBeLessThan(result.totalRows);

      // Cleanup
      fs.unlinkSync(incompleteFile);
    });
  });
});
