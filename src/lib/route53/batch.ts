/**
 * Route53 バッチ処理機能
 */

import type {
  Route53BatchOptions,
  Route53BatchResult,
  Route53Change,
  Route53ChangeInfo,
} from './types.js';
import type { ICSVRecord } from '../../types/index.js';

export class Route53BatchProcessor {
  private options: Route53BatchOptions;

  constructor(options: Route53BatchOptions = {}) {
    this.options = {
      batchSize: 100,
      maxConcurrency: 5,
      retryCount: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  /**
   * CSVレコードを Route53 レコードに変換
   */
  convertCSVToRoute53Records(records: ICSVRecord[]): Route53Change[] {
    return records.map(record => ({
      Action: 'UPSERT' as const,
      ResourceRecordSet: {
        Name: record.name,
        Type: record.type,
        TTL: record.ttl,
        ResourceRecords: [{ Value: record.value }],
        ...(record.priority && { Weight: record.priority }),
        ...(record.weight && { Weight: record.weight }),
        ...(record.port && {
          ResourceRecords: [
            {
              Value: `${record.priority || 0} ${record.weight || 0} ${record.port} ${record.value}`,
            },
          ],
        }),
      },
    }));
  }

  /**
   * バッチでレコードを処理
   */
  async processBatch(
    records: ICSVRecord[],
    processFunction: (
      changes: Route53Change[]
    ) => Promise<Route53ChangeInfo | null>
  ): Promise<Route53BatchResult> {
    const result: Route53BatchResult = {
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      errors: [],
      changeInfos: [],
    };

    const changes = this.convertCSVToRoute53Records(records);
    const batches = this.createBatches(changes, this.options.batchSize || 100);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        const changeInfo = await this.processWithRetry(batch, processFunction);
        if (changeInfo) {
          result.changeInfos.push(changeInfo);
          result.successCount += batch.length;
        } else {
          result.errorCount += batch.length;
          batch.forEach((change, index) => {
            const originalRecord = records[result.totalProcessed + index];
            result.errors.push({
              record: originalRecord,
              error: 'Failed to process batch',
            });
          });
        }
      } catch (error) {
        result.errorCount += batch.length;
        batch.forEach((change, index) => {
          const originalRecord = records[result.totalProcessed + index];
          result.errors.push({
            record: originalRecord,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        });
      }

      result.totalProcessed += batch.length;

      // 進捗報告
      if (this.options.onProgress) {
        this.options.onProgress(result.totalProcessed, records.length);
      }
    }

    return result;
  }

  /**
   * リトライ付きでバッチを処理
   */
  private async processWithRetry(
    batch: Route53Change[],
    processFunction: (
      changes: Route53Change[]
    ) => Promise<Route53ChangeInfo | null>
  ): Promise<Route53ChangeInfo | null> {
    let lastError: Error | null = null;
    const maxRetries = this.options.retryCount || 3;
    const retryDelay = this.options.retryDelay || 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await processFunction(batch);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // 指数バックオフ
        }
      }
    }

    throw lastError;
  }

  /**
   * バッチを作成
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * 遅延
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * バッチ処理の進捗統計を取得
   */
  getBatchStats(result: Route53BatchResult): {
    successRate: number;
    errorRate: number;
    totalBatches: number;
    averageProcessingTime: number;
  } {
    const total = result.totalProcessed;
    const successRate = total > 0 ? (result.successCount / total) * 100 : 0;
    const errorRate = total > 0 ? (result.errorCount / total) * 100 : 0;

    return {
      successRate,
      errorRate,
      totalBatches: result.changeInfos.length,
      averageProcessingTime: 0, // 実装時に計算
    };
  }
}
