/**
 * リファクタリングされたCSVProcessor
 * 各フォーマットパーサーを分離してモジュール化
 */

import { createReadStream } from 'fs';

import Papa from 'papaparse';

import {
  CloudflareCSVParser,
  Route53CSVParser,
  GenericCSVParser,
  CSVAutoDetector,
  type ICSVParseOptions,
  type ICSVParseResult,
} from './csv-parsers/index.js';
import { CsvProcessingError } from './errors.js';
import { CSVBatchProcessor } from './performance/batch-processor.js';
import { globalMetrics } from './metrics/metrics-collector.js';

import type { ICSVRecord, DNSRecordType } from '../types/index.js';

export class CSVProcessor {
  private cloudflareParser: CloudflareCSVParser;
  private route53Parser: Route53CSVParser;
  private genericParser: GenericCSVParser;
  private autoDetector: CSVAutoDetector;
  private batchProcessor: CSVBatchProcessor<ICSVRecord>;

  private defaultOptions: ICSVParseOptions = {
    skipEmptyLines: true,
    trimValues: true,
    delimiter: ',',
    encoding: 'utf-8',
    autoDetectEncoding: true,
    autoDetectDelimiter: true,
  };

  constructor(private options: ICSVParseOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };

    // パーサーの初期化
    this.cloudflareParser = new CloudflareCSVParser();
    this.route53Parser = new Route53CSVParser();
    this.genericParser = new GenericCSVParser();
    this.autoDetector = new CSVAutoDetector();

    // バッチ処理用の初期化
    this.batchProcessor = new CSVBatchProcessor({
      batchSize: 10000,
      concurrency: 4,
      onProgress: (processed, total) => {
        console.log(
          `CSV processing progress: ${processed}/${total} (${Math.round((processed / total) * 100)}%)`
        );
      },
    });
  }

  /**
   * Cloudflare CSV形式をパース
   */
  async parseCloudflare(filePath: string): Promise<ICSVParseResult> {
    const { fileContent, encodingInfo, delimiters } =
      await this.autoDetector.readFileWithAutoDetection(filePath, this.options);

    const result = await this.cloudflareParser.parse(fileContent, {
      skipEmptyLines: this.options.skipEmptyLines,
      trimValues: this.options.trimValues,
      delimiter: delimiters?.used || this.options.delimiter,
    });

    // 追加メタデータを付与
    result.encodingInfo = encodingInfo;
    result.delimiters = delimiters;

    return result;
  }

  /**
   * Route53 CSV形式をパース
   */
  async parseRoute53(filePath: string): Promise<ICSVParseResult> {
    const { fileContent, encodingInfo, delimiters } =
      await this.autoDetector.readFileWithAutoDetection(filePath, this.options);

    const result = await this.route53Parser.parse(fileContent, {
      skipEmptyLines: this.options.skipEmptyLines,
      trimValues: this.options.trimValues,
      delimiter: delimiters?.used || this.options.delimiter,
    });

    // 追加メタデータを付与
    result.encodingInfo = encodingInfo;
    result.delimiters = delimiters;

    return result;
  }

  /**
   * 汎用CSV形式をパース
   */
  async parseGeneric(filePath: string): Promise<ICSVParseResult> {
    const { fileContent, encodingInfo, delimiters } =
      await this.autoDetector.readFileWithAutoDetection(filePath, this.options);

    const result = await this.genericParser.parse(fileContent, {
      skipEmptyLines: this.options.skipEmptyLines,
      trimValues: this.options.trimValues,
      delimiter: delimiters?.used || this.options.delimiter,
    });

    // 追加メタデータを付与
    result.encodingInfo = encodingInfo;
    result.delimiters = delimiters;

    return result;
  }

  /**
   * フォーマットを自動検出してパース
   */
  async parseAuto(filePath: string): Promise<ICSVParseResult> {
    const format = await this.autoDetector.detectFormat(filePath);

    switch (format) {
      case 'cloudflare':
        return this.parseCloudflare(filePath);
      case 'route53':
        return this.parseRoute53(filePath);
      case 'generic':
        return this.parseGeneric(filePath);
      default:
        throw new CsvProcessingError(
          'サポートされていないCSV形式です。',
          { filePath, format }
        );
    }
  }

  /**
   * ストリーミングパースで大容量ファイルに対応
   */
  async parseStreaming(
    filePath: string,
    onRecord: (record: ICSVRecord) => void,
    format: 'cloudflare' | 'route53' | 'generic' = 'generic'
  ): Promise<{ totalProcessed: number; errors: Papa.ParseError[] }> {
    const { encodingInfo, delimiters } =
      await this.autoDetector.readFileWithAutoDetection(filePath, this.options);

    return new Promise((resolve, reject) => {
      let totalProcessed = 0;
      const errors: Papa.ParseError[] = [];

      const encoding =
        encodingInfo?.detectedEncoding || this.options.encoding || 'utf-8';
      const stream = createReadStream(filePath, {
        encoding: encoding as BufferEncoding,
      });

      Papa.parse(stream, {
        header: true,
        skipEmptyLines: this.options.skipEmptyLines,
        delimiter: delimiters?.used || this.options.delimiter,
        transformHeader: header => header.toLowerCase().trim(),
        transform: value => (this.options.trimValues ? value.trim() : value),
        step: row => {
          try {
            const record = this.convertRowToRecord(row.data, format);
            if (record) {
              onRecord(record);
              totalProcessed++;
            }
          } catch (error) {
            errors.push({
              type: 'FieldMismatch',
              code: 'TooFewFields',
              message: error instanceof Error ? error.message : 'Unknown error',
              row: totalProcessed,
            });
          }
        },
        complete: () => {
          resolve({ totalProcessed, errors });
        },
        error: error => reject(error),
      });
    });
  }

  /**
   * バッチ処理でCSVを処理
   */
  async processBatch(
    filePath: string,
    batchSize: number = 1000
  ): Promise<ICSVParseResult> {
    const format = await this.autoDetector.detectFormat(filePath);
    const result = await this.parseAuto(filePath);

    // バッチ処理でレコードを処理
    const batchResult = await this.batchProcessor.process(
      result.records,
      async (record: ICSVRecord) => {
        // 何らかの処理を行う（例：バリデーション、変換など）
        return record;
      }
    );

    return {
      ...result,
      records: batchResult.successful,
    };
  }

  /**
   * 行データをレコードに変換
   */
  private convertRowToRecord(
    data: unknown,
    format: 'cloudflare' | 'route53' | 'generic'
  ): ICSVRecord | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const row = data as Record<string, unknown>;

    try {
      switch (format) {
        case 'cloudflare':
          return this.convertCloudflareRow(row);
        case 'route53':
          return this.convertRoute53Row(row);
        case 'generic':
          return this.convertGenericRow(row);
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  private convertCloudflareRow(row: Record<string, unknown>): ICSVRecord {
    const name = String(row.name || '');
    const type = String(row.type || '');
    const content = String(row.content || '');
    const ttl = parseInt(String(row.ttl || '300'), 10);

    if (!name || !type || !content) {
      throw new Error('Missing required fields');
    }

    const record: ICSVRecord = {
      id: `cloudflare-${Date.now()}`,
      name,
      type: type.toUpperCase() as DNSRecordType,
      value: content,
      ttl,
      created: new Date(),
      updated: new Date(),
    };

    if (row.priority) {
      record.priority = parseInt(String(row.priority), 10);
    }

    return record;
  }

  private convertRoute53Row(row: Record<string, unknown>): ICSVRecord {
    const name = String(row.name || '');
    const type = String(row.type || '');
    const value = String(row.value || '');
    const ttl = parseInt(String(row.ttl || '300'), 10);

    if (!name || !type || !value) {
      throw new Error('Missing required fields');
    }

    const record: ICSVRecord = {
      id: `route53-${Date.now()}`,
      name,
      type: type.toUpperCase() as DNSRecordType,
      value,
      ttl,
      created: new Date(),
      updated: new Date(),
    };

    if (row.weight) {
      record.weight = parseInt(String(row.weight), 10);
    }

    return record;
  }

  private convertGenericRow(row: Record<string, unknown>): ICSVRecord {
    const domain = String(row.domain || '');
    const recordType = String(row.record_type || '');
    const value = String(row.value || '');
    const ttl = parseInt(String(row.ttl || '300'), 10);

    if (!domain || !recordType || !value) {
      throw new Error('Missing required fields');
    }

    const record: ICSVRecord = {
      id: `generic-${Date.now()}`,
      name: domain,
      type: recordType.toUpperCase() as DNSRecordType,
      value,
      ttl,
      created: new Date(),
      updated: new Date(),
    };

    if (row.priority) {
      record.priority = parseInt(String(row.priority), 10);
    }

    if (row.weight) {
      record.weight = parseInt(String(row.weight), 10);
    }

    if (row.port) {
      record.port = parseInt(String(row.port), 10);
    }

    return record;
  }
}

// 再エクスポート
export type { ICSVParseOptions, ICSVParseResult } from './csv-parsers/index.js';