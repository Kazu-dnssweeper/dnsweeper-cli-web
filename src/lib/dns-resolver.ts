import { promises as dns } from 'node:dns';
import type { DNSRecordType } from '../types/index.js';
import { DnsResolutionError, TimeoutError } from './errors.js';
import { mapConcurrent, ProgressTracker } from '../utils/concurrent.js';
import { withTimeout, withRetry } from '../utils/retry.js';
import { normalizeIPv6, isValidIPv6 } from '../utils/ipv6.js';
import { traceCnameChain, validateCnameChain, type CnameChainResult } from '../utils/cname-chain.js';
import { DnsCache, type DnsCacheOptions } from './dns-cache.js';
import { BatchProcessor, DNSBatchProcessor } from './performance/batch-processor.js';
import { MemoryOptimizer } from './performance/memory-optimizer.js';

interface INodeDNSError extends Error {
  code?: string;
}

export interface IDNSRecord {
  type: DNSRecordType;
  value: string;
  ttl?: number;
  priority?: number;
  weight?: number;
  port?: number;
  exchange?: string; // For MX records
  target?: string; // For SRV records
}

export interface IDNSQuery {
  domain: string;
  type: DNSRecordType;
  server?: string;
}

export interface IDNSResponse {
  query: IDNSQuery;
  records: IDNSRecord[];
  responseTime: number;
  status: 'success' | 'error' | 'timeout';
  error?: string;
  cnameChain?: CnameChainResult;
}

export class DNSResolver {
  private servers: string[];
  private timeout: number;
  private cache?: DnsCache;
  private batchProcessor: DNSBatchProcessor;

  constructor(options: { 
    timeout?: number; 
    servers?: string[];
    enableCache?: boolean;
    cacheOptions?: DnsCacheOptions;
    batchSize?: number;
    concurrency?: number;
  } = {}) {
    this.servers = options.servers ?? ['8.8.8.8', '1.1.1.1'];
    this.timeout = options.timeout ?? 5000;

    // キャッシュを有効化
    if (options.enableCache !== false) {
      this.cache = new DnsCache(options.cacheOptions);
    }

    // バッチプロセッサーを初期化
    this.batchProcessor = new DNSBatchProcessor({
      batchSize: options.batchSize || 100,
      concurrency: options.concurrency || 20,
      retries: 2,
      retryDelay: 500,
      onProgress: (processed, total) => {
        // メモリ使用量をチェック
        MemoryOptimizer.checkMemoryWarning(256, (usage) => {
          console.warn(`DNS batch processing memory warning: ${usage.heapUsed}MB used`);
          MemoryOptimizer.forceGarbageCollection();
        });
      },
      onError: (error, item) => {
        console.warn(`DNS resolution failed for ${item}:`, error.message);
      }
    });

    // Set custom DNS servers if provided
    if (this.servers.length > 0) {
      dns.setServers(this.servers);
    }
  }

  async resolve(domain: string, type: DNSRecordType): Promise<IDNSResponse> {
    const startTime = Date.now();
    const query: IDNSQuery = { domain, type };

    // キャッシュから確認
    if (this.cache) {
      const cached = this.cache.get(query);
      if (cached) {
        return {
          ...cached,
          responseTime: Date.now() - startTime // 新しいレスポンス時間を設定
        };
      }
    }

    try {
      const records = await this.withTimeout(this.resolveByType(domain, type), this.timeout);
      const responseTime = Date.now() - startTime;

      const response: IDNSResponse = {
        query,
        records,
        responseTime,
        status: 'success',
      };

      // キャッシュに保存
      if (this.cache) {
        this.cache.set(query, response);
      }

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Enhanced error handling
      let errorMessage: string;
      let status: 'error' | 'timeout' = 'error';

      if (error instanceof Error) {
        const dnsError = error as INodeDNSError;

        if (error.message.includes('timeout')) {
          status = 'timeout';
          errorMessage = `DNS query timeout after ${this.timeout}ms`;
        } else if (dnsError.code === 'ENOTFOUND') {
          errorMessage = `Domain not found: ${domain}`;
        } else if (dnsError.code === 'ENODATA') {
          errorMessage = `No ${type} records found for ${domain}`;
        } else if (dnsError.code === 'ESERVFAIL') {
          errorMessage = `DNS server failure for ${domain}`;
        } else if (dnsError.code === 'ETIMEOUT') {
          status = 'timeout';
          errorMessage = `DNS query timeout for ${domain}`;
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage = 'Unknown DNS resolution error';
      }

      return {
        query,
        records: [],
        responseTime,
        status,
        error: errorMessage,
      };
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private async resolveByType(domain: string, type: DNSRecordType): Promise<IDNSRecord[]> {
    switch (type) {
      case 'A':
        return this.resolveA(domain);
      case 'AAAA':
        return this.resolveAAAA(domain);
      case 'CNAME':
        return this.resolveCNAME(domain);
      case 'MX':
        return this.resolveMX(domain);
      case 'TXT':
        return this.resolveTXT(domain);
      case 'NS':
        return this.resolveNS(domain);
      case 'SOA':
        return this.resolveSOA(domain);
      case 'SRV':
        return this.resolveSRV(domain);
      case 'PTR':
        return this.resolvePTR(domain);
      case 'CAA':
        return this.resolveCAA(domain);
      default:
        throw new Error(`Unsupported DNS record type: ${String(type)}`);
    }
  }

  private async resolveA(domain: string): Promise<IDNSRecord[]> {
    const addresses = await dns.resolve4(domain);
    return addresses.map((value) => ({
      type: 'A' as const,
      value,
    }));
  }

  private async resolveAAAA(domain: string): Promise<IDNSRecord[]> {
    const addresses = await dns.resolve6(domain);
    return addresses.map((value) => {
      // IPv6アドレスを正規化
      const normalizedValue = isValidIPv6(value) ? normalizeIPv6(value) : value;
      return {
        type: 'AAAA' as const,
        value: normalizedValue,
      };
    });
  }

  private async resolveCNAME(domain: string): Promise<IDNSRecord[]> {
    const cnames = await dns.resolveCname(domain);
    return cnames.map((value) => ({
      type: 'CNAME' as const,
      value,
    }));
  }

  /**
   * CNAMEチェーンを追跡してレコードを解決
   */
  async resolveCNAMEWithChain(domain: string): Promise<IDNSResponse> {
    const startTime = Date.now();
    
    try {
      // CNAMEチェーンを追跡
      const cnameChain = await traceCnameChain(domain, {
        maxDepth: 10,
        timeout: this.timeout,
        followToEnd: true
      });

      // チェーンを検証
      const validation = validateCnameChain(cnameChain);
      
      // CNAMEレコードを作成
      const records: IDNSRecord[] = cnameChain.chain.slice(1).map(target => ({
        type: 'CNAME' as const,
        value: target,
      }));

      const responseTime = Date.now() - startTime;

      return {
        query: { domain, type: 'CNAME' },
        records,
        responseTime,
        status: validation.isValid ? 'success' : 'error',
        error: validation.issues.length > 0 ? validation.issues.join('; ') : undefined,
        cnameChain
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        query: { domain, type: 'CNAME' },
        records: [],
        responseTime,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async resolveMX(domain: string): Promise<IDNSRecord[]> {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords.map((record) => ({
      type: 'MX' as const,
      value: record.exchange,
      priority: record.priority,
      exchange: record.exchange,
    }));
  }

  private async resolveTXT(domain: string): Promise<IDNSRecord[]> {
    const txtRecords = await dns.resolveTxt(domain);
    return txtRecords.map((record) => ({
      type: 'TXT' as const,
      value: Array.isArray(record) ? record.join('') : record,
    }));
  }

  private async resolveNS(domain: string): Promise<IDNSRecord[]> {
    const nsRecords = await dns.resolveNs(domain);
    return nsRecords.map((value) => ({
      type: 'NS' as const,
      value,
    }));
  }

  private async resolveSOA(domain: string): Promise<IDNSRecord[]> {
    const soaRecord = await dns.resolveSoa(domain);
    return [
      {
        type: 'SOA' as const,
        value: `${soaRecord.nsname} ${soaRecord.hostmaster} ${soaRecord.serial} ${soaRecord.refresh} ${soaRecord.retry} ${soaRecord.expire} ${soaRecord.minttl}`,
      },
    ];
  }

  private async resolveSRV(domain: string): Promise<IDNSRecord[]> {
    const srvRecords = await dns.resolveSrv(domain);
    return srvRecords.map((record) => ({
      type: 'SRV' as const,
      value: record.name,
      priority: record.priority,
      weight: record.weight,
      port: record.port,
      target: record.name,
    }));
  }

  private async resolvePTR(domain: string): Promise<IDNSRecord[]> {
    const ptrRecords = await dns.resolvePtr(domain);
    return ptrRecords.map((value) => ({
      type: 'PTR' as const,
      value,
    }));
  }

  private resolveCAA(domain: string): IDNSRecord[] {
    // node:dns doesn't support CAA records natively
    // For now, return empty array - could be implemented with dns2 if needed
    console.warn(`CAA records not supported with node:dns for domain: ${domain}`);
    return [];
  }

  // Utility methods
  async lookupMultiple(domains: string[], type: DNSRecordType): Promise<IDNSResponse[]> {
    const promises = domains.map((domain) => this.resolve(domain, type));
    return Promise.all(promises);
  }

  async reverseLookup(ip: string): Promise<IDNSResponse> {
    return this.resolve(ip, 'PTR');
  }

  // Performance method for batch operations
  async batchResolve(queries: IDNSQuery[]): Promise<IDNSResponse[]> {
    console.log(`Starting batch DNS resolution for ${queries.length} queries`);
    MemoryOptimizer.logMemoryUsage('Before batch resolve');

    try {
      // バッチプロセッサーを使用して効率的に処理
      const result = await this.batchProcessor.process(
        queries,
        async (query: IDNSQuery) => {
          return await this.resolve(query.domain, query.type);
        }
      );

      MemoryOptimizer.logMemoryUsage('After batch resolve');
      console.log(`Batch resolution completed: ${result.successful.length} successful, ${result.failed.length} failed, ${result.duration}ms`);

      // 成功した結果と失敗した結果を統合
      const allResults: IDNSResponse[] = [
        ...result.successful,
        ...result.failed.map(failure => ({
          query: failure.item,
          records: [],
          responseTime: 0,
          status: 'error' as const,
          error: failure.error.message,
        }))
      ];

      return allResults;
    } catch (error) {
      console.error('Batch resolve failed:', error);
      // フォールバックとして従来の方法を使用
      const promises = queries.map((query) => this.resolve(query.domain, query.type));
      return Promise.allSettled(promises).then((results) =>
        results.map((result) =>
          result.status === 'fulfilled'
            ? result.value
            : {
                query: { domain: '', type: 'A' as const },
                records: [],
                responseTime: 0,
                status: 'error' as const,
                error: 'Promise rejected',
              },
        ),
      );
    }
  }

  // 並列解決の最適化版
  async batchResolveOptimized(
    queries: IDNSQuery[],
    options: {
      concurrency?: number;
      retryOnError?: boolean;
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<IDNSResponse[]> {
    const { concurrency = 10, retryOnError = true, onProgress } = options;

    // 進捗トラッカーの設定
    const tracker = onProgress ? new ProgressTracker(queries.length, (info) => {
      onProgress(info.completed, info.total);
    }) : null;

    // 各クエリを実行する関数を作成
    const executeQuery = async (query: IDNSQuery, index: number): Promise<IDNSResponse> => {
      try {
        const resolver = retryOnError
          ? () => withTimeout(
              () => this.resolve(query.domain, query.type),
              this.timeout,
              `DNS resolution timeout for ${query.domain}`
            )
          : () => this.resolve(query.domain, query.type);

        const result = retryOnError
          ? await withRetry(resolver, {
              maxAttempts: 3,
              delay: 500,
              backoff: 'exponential',
              onRetry: (attempt, error) => {
                console.warn(`Retry attempt ${attempt} for ${query.domain}:`, error);
              }
            })
          : await resolver();

        if (tracker) {
          tracker.increment();
        }

        return result;
      } catch (error) {
        if (tracker) {
          tracker.increment();
        }

        return {
          query,
          records: [],
          responseTime: 0,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    };

    // 並列実行
    return mapConcurrent(queries, executeQuery, { concurrency });
  }

  // 複数ドメインの全レコードタイプを解決
  async resolveAllRecordsForDomains(
    domains: string[],
    options: {
      recordTypes?: DNSRecordType[];
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<Map<string, IDNSResponse[]>> {
    const {
      recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS'],
      concurrency = 10,
      onProgress
    } = options;

    // クエリを生成
    const queries: IDNSQuery[] = [];
    for (const domain of domains) {
      for (const type of recordTypes) {
        queries.push({ domain, type });
      }
    }

    // 並列解決
    const responses = await this.batchResolveOptimized(queries, {
      concurrency,
      onProgress
    });

    // ドメインごとにグループ化
    const resultMap = new Map<string, IDNSResponse[]>();
    for (const response of responses) {
      const domain = response.query.domain;
      if (!resultMap.has(domain)) {
        resultMap.set(domain, []);
      }
      resultMap.get(domain)!.push(response);
    }

    return resultMap;
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStats() {
    return this.cache?.getStats() || null;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache?.clear();
  }

  /**
   * 特定のドメイン/タイプのキャッシュを無効化
   */
  invalidateCache(domain?: string, type?: string): number {
    return this.cache?.invalidate(domain, type) || 0;
  }

  /**
   * キャッシュクリーンアップを実行
   */
  cleanupCache(): number {
    return this.cache?.cleanup() || 0;
  }

  /**
   * リソースを破棄
   */
  destroy(): void {
    this.cache?.destroy();
  }
}
