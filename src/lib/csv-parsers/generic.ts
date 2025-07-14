/**
 * 汎用CSV形式パーサー
 * Format: domain,record_type,value,ttl,priority,weight,port
 */

import Papa from 'papaparse';

import type { IGenericCSVRow, ICSVParseResult } from './types.js';
import type { DNSRecordType, ICSVRecord } from '../../types/index.js';

export class GenericCSVParser {
  /**
   * 汎用CSV形式の結果を処理
   */
  processResults(results: Papa.ParseResult<IGenericCSVRow>): ICSVParseResult {
    const records: ICSVRecord[] = [];
    const errors: Papa.ParseError[] = [...results.errors];

    results.data.forEach((row: IGenericCSVRow, index: number) => {
      try {
        if (!row.domain || !row.record_type || !row.value) {
          errors.push({
            type: 'FieldMismatch',
            code: 'TooFewFields',
            message: `Row ${index + 1}: Missing required fields (domain, record_type, value)`,
            row: index,
          });
          return;
        }

        const record: ICSVRecord = {
          id: `generic-${index}`,
          name: row.domain,
          type: row.record_type.toUpperCase() as DNSRecordType,
          value: row.value,
          ttl: parseInt(row.ttl, 10) || 300,
          created: new Date(),
          updated: new Date(),
        };

        if (row.priority) {
          record.priority = parseInt(row.priority, 10);
        }

        if (row.weight) {
          record.weight = parseInt(row.weight, 10);
        }

        if (row.port) {
          record.port = parseInt(row.port, 10);
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
   * 汎用CSV形式をパース
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
      Papa.parse<IGenericCSVRow>(fileContent, {
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
