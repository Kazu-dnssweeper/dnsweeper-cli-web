/**
 * Route53 CSV形式パーサー
 * Format: Name,Type,Value,TTL,Weight,SetIdentifier
 */

import Papa from 'papaparse';

import type { IRoute53CSVRow, ICSVParseResult } from './types.js';
import type { DNSRecordType, ICSVRecord } from '../../types/index.js';

export class Route53CSVParser {
  /**
   * Route53 CSV形式の結果を処理
   */
  processResults(results: Papa.ParseResult<IRoute53CSVRow>): ICSVParseResult {
    const records: ICSVRecord[] = [];
    const errors: Papa.ParseError[] = [...results.errors];

    results.data.forEach((row: IRoute53CSVRow, index: number) => {
      try {
        if (!row.name || !row.type || !row.value) {
          errors.push({
            type: 'FieldMismatch',
            code: 'TooFewFields',
            message: `Row ${index + 1}: Missing required fields (name, type, value)`,
            row: index,
          });
          return;
        }

        const record: ICSVRecord = {
          id: `route53-${index}`,
          name: row.name,
          type: row.type.toUpperCase() as DNSRecordType,
          value: row.value,
          ttl: parseInt(row.ttl, 10) || 300,
          created: new Date(),
          updated: new Date(),
        };

        if (row.weight) {
          record.weight = parseInt(row.weight, 10);
        }

        // SetIdentifierがある場合は追加情報として保存
        if (row.setidentifier) {
          record.setIdentifier = row.setidentifier;
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
   * Route53 CSV形式をパース
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
      Papa.parse<IRoute53CSVRow>(fileContent, {
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
