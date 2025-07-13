import Papa from 'papaparse';
import fs from 'fs';
import { createReadStream } from 'fs';
import { Transform, Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { DNSRecordType } from '../types/index.js';
import { CsvProcessingError, FileOperationError } from './errors.js';
import { 
  detectCsvEncoding, 
  readFileWithDetectedEncoding, 
  evaluateDetectionReliability,
  type SupportedEncoding 
} from '../utils/encoding-detector.js';
import { StreamProcessor, MemoryOptimizer } from './performance/memory-optimizer.js';
import { CSVBatchProcessor } from './performance/batch-processor.js';

export interface ICSVRecord {
  domain: string;
  type: DNSRecordType;
  value: string;
  ttl: number;
  priority?: number | undefined;
  weight?: number | undefined;
  port?: number | undefined;
}

export interface ICSVParseOptions {
  skipEmptyLines?: boolean;
  trimValues?: boolean;
  delimiter?: string;
  encoding?: SupportedEncoding;
  autoDetectEncoding?: boolean;
  autoDetectDelimiter?: boolean;
}

export interface ICSVParseResult {
  records: ICSVRecord[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
  totalRows: number;
  validRows: number;
  encodingInfo?: {
    detectedEncoding: SupportedEncoding;
    confidence: number;
    reliability: 'high' | 'medium' | 'low';
    bomPresent: boolean;
  };
  delimiters?: {
    detected: string[];
    used: string;
  };
}

export class CSVProcessor {
  private defaultOptions: ICSVParseOptions = {
    skipEmptyLines: true,
    trimValues: true,
    delimiter: ',',
    encoding: 'utf-8',
    autoDetectEncoding: true,
    autoDetectDelimiter: true,
  };
  private streamProcessor: StreamProcessor<any>;
  private batchProcessor: CSVBatchProcessor<ICSVRecord>;

  constructor(private options: ICSVParseOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
    
    // ストリーミング処理用の初期化
    this.streamProcessor = new StreamProcessor({
      chunkSize: 5000,
      memoryWarningThreshold: 512,
      onMemoryWarning: (usage) => {
        console.warn(`CSV processing memory warning: ${usage.heapUsed}MB used`);
      }
    });

    // バッチ処理用の初期化
    this.batchProcessor = new CSVBatchProcessor({
      batchSize: 10000,
      concurrency: 4,
      onProgress: (processed, total) => {
        console.log(`CSV processing progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
      }
    });
  }

  /**
   * Parse Cloudflare DNS export CSV format
   * Format: Name,Type,Content,TTL,Priority
   */
  async parseCloudflare(filePath: string): Promise<ICSVParseResult> {
    const { fileContent, encodingInfo, delimiters } = await this.readFileWithAutoDetection(filePath);

    return new Promise((resolve, reject) => {
      Papa.parse<ICloudflareCSVRow>(fileContent, {
        header: true,
        skipEmptyLines: this.options.skipEmptyLines,
        delimiter: delimiters?.used || this.options.delimiter,
        transformHeader: (header) => header.toLowerCase().trim(),
        transform: (value) => (this.options.trimValues ? value.trim() : value),
        complete: (results) => {
          try {
            const csvResult = this.processCloudflareResults(results);
            csvResult.encodingInfo = encodingInfo;
            csvResult.delimiters = delimiters;
            resolve(csvResult);
          } catch (error: unknown) {
            reject(error);
          }
        },
        error: (error: Error) => reject(error),
      });
    });
  }

  /**
   * Parse Route53 CSV export format
   * Format: Name,Type,Value,TTL,Weight,SetIdentifier
   */
  async parseRoute53(filePath: string): Promise<ICSVParseResult> {
    const { fileContent, encodingInfo, delimiters } = await this.readFileWithAutoDetection(filePath);

    return new Promise((resolve, reject) => {
      Papa.parse<IRoute53CSVRow>(fileContent, {
        header: true,
        skipEmptyLines: this.options.skipEmptyLines,
        delimiter: delimiters?.used || this.options.delimiter,
        transformHeader: (header) => header.toLowerCase().trim(),
        transform: (value) => (this.options.trimValues ? value.trim() : value),
        complete: (results) => {
          try {
            const csvResult = this.processRoute53Results(results);
            csvResult.encodingInfo = encodingInfo;
            csvResult.delimiters = delimiters;
            resolve(csvResult);
          } catch (error: unknown) {
            reject(error);
          }
        },
        error: (error: Error) => reject(error),
      });
    });
  }

  /**
   * Parse generic CSV format
   * Format: domain,record_type,value,ttl,priority,weight,port
   */
  async parseGeneric(filePath: string): Promise<ICSVParseResult> {
    const { fileContent, encodingInfo, delimiters } = await this.readFileWithAutoDetection(filePath);

    return new Promise((resolve, reject) => {
      Papa.parse<IGenericCSVRow>(fileContent, {
        header: true,
        skipEmptyLines: this.options.skipEmptyLines,
        delimiter: delimiters?.used || this.options.delimiter,
        transformHeader: (header) => header.toLowerCase().trim(),
        transform: (value) => (this.options.trimValues ? value.trim() : value),
        complete: (results) => {
          try {
            const csvResult = this.processGenericResults(results);
            csvResult.encodingInfo = encodingInfo;
            csvResult.delimiters = delimiters;
            resolve(csvResult);
          } catch (error: unknown) {
            reject(error);
          }
        },
        error: (error: Error) => reject(error),
      });
    });
  }

  /**
   * Auto-detect CSV format and parse accordingly
   */
  async parseAuto(filePath: string): Promise<ICSVParseResult> {
    const { fileContent } = await this.readFileWithAutoDetection(filePath);
    const firstLine = fileContent.split('\n')[0]?.toLowerCase() || '';

    if (firstLine.includes('name,type,content,ttl') || firstLine.includes('name;type;content;ttl')) {
      return this.parseCloudflare(filePath);
    } else if (firstLine.includes('name,type,value,ttl') || firstLine.includes('name;type;value;ttl')) {
      return this.parseRoute53(filePath);
    } else if (firstLine.includes('domain,record_type,value') || firstLine.includes('domain;record_type;value')) {
      return this.parseGeneric(filePath);
    } else {
      throw new CsvProcessingError(
        'サポートされていないCSV形式です。ヘッダーが認識できません。',
        { filePath, firstLine }
      );
    }
  }

  /**
   * Parse CSV with streaming for large files
   */
  async parseStreaming(
    filePath: string,
    onRecord: (record: ICSVRecord) => void,
    format: 'cloudflare' | 'route53' | 'generic' = 'generic',
  ): Promise<{ totalProcessed: number; errors: Papa.ParseError[] }> {
    const { encodingInfo, delimiters } = await this.readFileWithAutoDetection(filePath);
    
    return new Promise((resolve, reject) => {
      let totalProcessed = 0;
      const errors: Papa.ParseError[] = [];

      const encoding = encodingInfo?.detectedEncoding || this.options.encoding || 'utf-8';
      const stream = fs.createReadStream(filePath, { encoding: encoding as BufferEncoding });

      Papa.parse(stream, {
        header: true,
        skipEmptyLines: this.options.skipEmptyLines,
        delimiter: delimiters?.used || this.options.delimiter,
        transformHeader: (header) => header.toLowerCase().trim(),
        transform: (value) => (this.options.trimValues ? value.trim() : value),
        step: (row) => {
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
        error: (error) => reject(error),
      });
    });
  }

  private processCloudflareResults(results: Papa.ParseResult<ICloudflareCSVRow>): ICSVParseResult {
    const records: ICSVRecord[] = [];
    let validRows = 0;

    for (const row of results.data) {
      try {
        const record = this.convertCloudflareRow(row);
        if (record) {
          records.push(record);
          validRows++;
        }
      } catch (error) {
        // Error already tracked in results.errors
      }
    }

    return {
      records,
      errors: results.errors,
      meta: results.meta,
      totalRows: results.data.length,
      validRows,
    };
  }

  private processRoute53Results(results: Papa.ParseResult<IRoute53CSVRow>): ICSVParseResult {
    const records: ICSVRecord[] = [];
    let validRows = 0;

    for (const row of results.data) {
      try {
        const record = this.convertRoute53Row(row);
        if (record) {
          records.push(record);
          validRows++;
        }
      } catch (error) {
        // Error already tracked in results.errors
      }
    }

    return {
      records,
      errors: results.errors,
      meta: results.meta,
      totalRows: results.data.length,
      validRows,
    };
  }

  private processGenericResults(results: Papa.ParseResult<IGenericCSVRow>): ICSVParseResult {
    const records: ICSVRecord[] = [];
    let validRows = 0;

    for (const row of results.data) {
      try {
        const record = this.convertGenericRow(row);
        if (record) {
          records.push(record);
          validRows++;
        }
      } catch (error) {
        // Error already tracked in results.errors
      }
    }

    return {
      records,
      errors: results.errors,
      meta: results.meta,
      totalRows: results.data.length,
      validRows,
    };
  }

  private convertRowToRecord(
    row: unknown,
    format: 'cloudflare' | 'route53' | 'generic',
  ): ICSVRecord | null {
    switch (format) {
      case 'cloudflare':
        return this.convertCloudflareRow(row as ICloudflareCSVRow);
      case 'route53':
        return this.convertRoute53Row(row as IRoute53CSVRow);
      case 'generic':
        return this.convertGenericRow(row as IGenericCSVRow);
      default:
        throw new Error(`Unsupported format: ${String(format)}`);
    }
  }

  private convertCloudflareRow(row: ICloudflareCSVRow): ICSVRecord | null {
    if (!row.name || !row.type || !row.content) {
      return null;
    }

    const type = row.type.toUpperCase() as DNSRecordType;
    const ttl = parseInt(row.ttl || '3600', 10);
    const priority = row.priority ? parseInt(row.priority, 10) : undefined;

    return {
      domain: row.name,
      type,
      value: row.content,
      ttl,
      priority,
    };
  }

  private convertRoute53Row(row: IRoute53CSVRow): ICSVRecord | null {
    if (!row.name || !row.type || !row.value) {
      return null;
    }

    const type = row.type.toUpperCase() as DNSRecordType;
    const ttl = parseInt(row.ttl || '300', 10);
    const weight = row.weight ? parseInt(row.weight, 10) : undefined;

    // Handle MX records with priority in value (e.g., "10 mail.example.com")
    let value = row.value;
    let priority: number | undefined = undefined;

    if (type === 'MX' && value.includes(' ')) {
      const parts = value.split(' ');
      priority = parseInt(parts[0] || '0', 10);
      value = parts.slice(1).join(' ');
    }

    return {
      domain: row.name,
      type,
      value,
      ttl,
      priority,
      weight,
    };
  }

  private convertGenericRow(row: IGenericCSVRow): ICSVRecord | null {
    if (!row.domain || !row.record_type || !row.value) {
      return null;
    }

    const type = row.record_type.toUpperCase() as DNSRecordType;
    const ttl = parseInt(row.ttl || '3600', 10);
    const priority = row.priority ? parseInt(row.priority, 10) : undefined;
    const weight = row.weight ? parseInt(row.weight, 10) : undefined;
    const port = row.port ? parseInt(row.port, 10) : undefined;

    return {
      domain: row.domain,
      type,
      value: row.value,
      ttl,
      priority,
      weight,
      port,
    };
  }

  /**
   * 大容量CSVファイルのストリーミング処理
   */
  async parseStreamingCloudflare(filePath: string, onProgress?: (processed: number) => void): Promise<ICSVParseResult> {
    console.log(`Starting streaming CSV processing for: ${filePath}`);
    MemoryOptimizer.logMemoryUsage('Before streaming parse');

    const fileStats = fs.statSync(filePath);
    const fileSizeMB = fileStats.size / (1024 * 1024);
    
    if (fileSizeMB < 10) {
      // 小さなファイルは通常の処理
      return this.parseCloudflare(filePath);
    }

    console.log(`Large file detected (${fileSizeMB.toFixed(2)}MB), using streaming processing`);

    const records: ICSVRecord[] = [];
    const errors: Papa.ParseError[] = [];
    let processedRows = 0;
    let validRows = 0;

    // ストリーミング読み込み
    const readStream = createReadStream(filePath, { encoding: 'utf-8' });
    
    return new Promise((resolve, reject) => {
      Papa.parse(readStream, {
        header: true,
        skipEmptyLines: true,
        step: (result, parser) => {
          try {
            processedRows++;

            if (result.errors && result.errors.length > 0) {
              errors.push(...result.errors);
              return;
            }

            const row = result.data as ICloudflareCSVRow;
            const record = this.convertCloudflareRecord(row);
            
            if (record) {
              records.push(record);
              validRows++;
            }

            // 進捗報告
            if (processedRows % 1000 === 0) {
              onProgress?.(processedRows);
              
              // メモリチェック
              MemoryOptimizer.checkMemoryWarning(512, (usage) => {
                console.warn(`Streaming parse memory warning: ${usage.heapUsed}MB`);
                MemoryOptimizer.forceGarbageCollection();
              });
            }

          } catch (error) {
            errors.push({
              type: 'FieldMismatch',
              code: 'UnexpectedError',
              message: error instanceof Error ? error.message : 'Unknown error',
              row: processedRows
            } as Papa.ParseError);
          }
        },
        complete: (results) => {
          MemoryOptimizer.logMemoryUsage('After streaming parse');
          console.log(`Streaming parse completed: ${validRows} valid records from ${processedRows} total`);

          resolve({
            records,
            errors,
            meta: results.meta,
            totalRows: processedRows,
            validRows
          });
        },
        error: (error) => reject(error)
      });
    });
  }

  /**
   * バッチ処理による大容量データの効率的変換
   */
  async processBatchRecords(records: ICSVRecord[], processor: (record: ICSVRecord) => ICSVRecord): Promise<ICSVRecord[]> {
    if (records.length < 1000) {
      // 小さなデータセットは通常処理
      return records.map(processor);
    }

    console.log(`Processing ${records.length} records in batches`);
    MemoryOptimizer.logMemoryUsage('Before batch processing');

    const result = await this.batchProcessor.process(records, async (record) => {
      return processor(record);
    });

    MemoryOptimizer.logMemoryUsage('After batch processing');
    console.log(`Batch processing completed: ${result.successful.length} successful, ${result.failed.length} failed`);

    if (result.failed.length > 0) {
      console.warn(`${result.failed.length} records failed processing`);
      result.failed.forEach(failure => {
        console.warn(`Failed record:`, failure.error.message);
      });
    }

    return result.successful;
  }

  /**
   * ファイルの読み込みとエンコーディング・区切り文字の自動検出
   */
  private async readFileWithAutoDetection(filePath: string): Promise<{
    fileContent: string;
    encodingInfo?: {
      detectedEncoding: SupportedEncoding;
      confidence: number;
      reliability: 'high' | 'medium' | 'low';
      bomPresent: boolean;
    };
    delimiters?: {
      detected: string[];
      used: string;
    };
  }> {
    try {
      if (this.options.autoDetectEncoding) {
        // エンコーディング自動検出
        const csvDetection = await detectCsvEncoding(filePath);
        const reliability = evaluateDetectionReliability(csvDetection);

        const { content } = await readFileWithDetectedEncoding(filePath);

        let delimiters: { detected: string[]; used: string } | undefined;

        if (this.options.autoDetectDelimiter && csvDetection.csvSpecificInfo.looksLikeCsv) {
          // 区切り文字自動検出
          const detected = csvDetection.csvSpecificInfo.potentialDelimiters;
          const used = this.selectBestDelimiter(detected, content);
          
          delimiters = { detected, used };
        }

        return {
          fileContent: content,
          encodingInfo: {
            detectedEncoding: csvDetection.encoding,
            confidence: csvDetection.confidence,
            reliability: reliability.level,
            bomPresent: csvDetection.bomPresent
          },
          delimiters
        };
      } else {
        // 手動エンコーディング指定
        const fileContent = fs.readFileSync(filePath, this.options.encoding || 'utf-8');
        
        let delimiters: { detected: string[]; used: string } | undefined;
        
        if (this.options.autoDetectDelimiter) {
          const potentialDelimiters = this.detectDelimitersInContent(fileContent);
          const used = this.selectBestDelimiter(potentialDelimiters, fileContent);
          delimiters = { detected: potentialDelimiters, used };
        }

        return {
          fileContent,
          delimiters
        };
      }
    } catch (error) {
      throw new CsvProcessingError(
        `ファイル読み込みまたはエンコーディング検出に失敗: ${filePath}`,
        { filePath, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * コンテンツ内の潜在的な区切り文字を検出
   */
  private detectDelimitersInContent(content: string): string[] {
    const delimiters = [',', ';', '\t', '|'];
    const lines = content.split(/\r?\n/).slice(0, 5); // 最初の5行を分析
    
    return delimiters.filter(delimiter => 
      lines.some(line => line.includes(delimiter))
    );
  }

  /**
   * 最適な区切り文字を選択
   */
  private selectBestDelimiter(candidates: string[], content: string): string {
    if (candidates.length === 0) {
      return this.options.delimiter || ',';
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // 最初の数行で各区切り文字の出現頻度を計算
    const lines = content.split(/\r?\n/).slice(0, 5);
    const scores = candidates.map(delimiter => {
      let score = 0;
      let consistency = 0;
      let expectedCount = -1;

      for (const line of lines) {
        if (line.trim() === '') continue;
        
        const count = (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
        
        if (expectedCount === -1) {
          expectedCount = count;
        }
        
        if (count === expectedCount && count > 0) {
          consistency++;
        }
        
        score += count;
      }

      // 一貫性を重視（同じ行で同じ区切り文字数）
      return {
        delimiter,
        score: score * consistency,
        consistency
      };
    });

    // 最高スコアの区切り文字を選択
    scores.sort((a, b) => b.score - a.score);
    return scores[0]?.delimiter || candidates[0];
  }
}

// Type definitions for different CSV formats
interface ICloudflareCSVRow {
  name: string;
  type: string;
  content: string;
  ttl: string;
  priority?: string;
}

interface IRoute53CSVRow {
  name: string;
  type: string;
  value: string;
  ttl: string;
  weight?: string;
  setidentifier?: string;
}

interface IGenericCSVRow {
  domain: string;
  record_type: string;
  value: string;
  ttl: string;
  priority?: string;
  weight?: string;
  port?: string;
}
