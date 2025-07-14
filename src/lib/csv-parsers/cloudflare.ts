/**
 * Cloudflare CSV形式パーサー
 * Format: Name,Type,Content,TTL,Priority
 */

import Papa from 'papaparse';

import type { DNSRecordType, ICSVRecord } from '../../types/index.js';
import type { ICloudflareCSVRow, ICSVParseResult, IFileReadResult } from './types.js';

export class CloudflareCSVParser {
  /**
   * Cloudflare CSV形式の結果を処理
   */
  processResults(results: Papa.ParseResult<ICloudflareCSVRow>): ICSVParseResult {
    const records: ICSVRecord[] = [];
    const errors: Papa.ParseError[] = [...results.errors];

    results.data.forEach((row: ICloudflareCSVRow, index: number) => {
      try {
        if (!row.name || !row.type || !row.content) {
          errors.push({
            type: 'FieldMismatch',
            code: 'TooFewFields',
            message: `Row ${index + 1}: Missing required fields (name, type, content)`,
            row: index,
          });
          return;
        }

        const record: ICSVRecord = {
          id: `cloudflare-${index}`,
          name: row.name,
          type: row.type.toUpperCase() as DNSRecordType,
          value: row.content,
          ttl: parseInt(row.ttl, 10) || 300,
          created: new Date(),
          updated: new Date(),
        };

        if (row.priority) {
          record.priority = parseInt(row.priority, 10);
        }

        records.push(record);
      } catch (error) {
        errors.push({
          type: 'FieldMismatch',
          code: 'TooFewFields',
          message: `Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          row: index,
        });
      }
    });

    return {
      records,
      errors,
      meta: results.meta,
      totalRows: results.data.length,
      validRows: records.length,
    };
  }

  /**
   * Cloudflare CSV形式をパース
   */
  async parse(
    fileContent: string,
    options: {
      skipEmptyLines?: boolean;
      trimValues?: boolean;
      delimiter?: string;
    } = {}
  ): Promise<ICSVParseResult> {
    return new Promise((resolve, reject) => {
      Papa.parse<ICloudflareCSVRow>(fileContent, {
        header: true,
        skipEmptyLines: options.skipEmptyLines ?? true,
        delimiter: options.delimiter ?? ',',
        transformHeader: header => header.toLowerCase().trim(),
        transform: value => (options.trimValues ? value.trim() : value),
        complete: results => {
          try {
            const csvResult = this.processResults(results);
            resolve(csvResult);
          } catch (error: unknown) {
            reject(error);
          }
        },
        error: (error: Error) => reject(error),
      });
    });
  }
}