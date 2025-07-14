import { promises as dns } from 'node:dns';

import { DnsResolutionError } from '../lib/errors.js';

/**
 * CNAMEチェーン追跡の結果
 */
export interface CnameChainResult {
  chain: string[];
  finalTarget: string | null;
  hasLoop: boolean;
  maxDepthReached: boolean;
  resolutionTime: number;
}

/**
 * CNAMEチェーン追跡のオプション
 */
export interface CnameChainOptions {
  maxDepth?: number;
  timeout?: number;
  followToEnd?: boolean;
}

/**
 * CNAMEチェーンを追跡し、ループや無限再帰を検知する
 */
export async function traceCnameChain(
  domain: string,
  options: CnameChainOptions = {}
): Promise<CnameChainResult> {
  const { maxDepth = 10, timeout = 5000, followToEnd = true } = options;

  const startTime = Date.now();
  const chain: string[] = [];
  const visited = new Set<string>();
  let currentDomain = domain.toLowerCase();
  let hasLoop = false;
  let maxDepthReached = false;
  let finalTarget: string | null = null;

  try {
    while (chain.length < maxDepth) {
      // ループ検知
      if (visited.has(currentDomain)) {
        hasLoop = true;
        break;
      }

      visited.add(currentDomain);
      chain.push(currentDomain);

      try {
        // タイムアウト付きでCNAME解決
        const cnames = await Promise.race([
          dns.resolveCname(currentDomain),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          ),
        ]);

        if (cnames.length === 0) {
          // CNAMEレコードがない場合、これが最終ターゲット
          finalTarget = currentDomain;
          break;
        }

        // 複数のCNAMEがある場合は最初のものを使用
        const firstCname = cnames[0];
        if (!firstCname) {
          break;
        }
        currentDomain = firstCname.toLowerCase();

        if (!followToEnd) {
          // 一段階のみ追跡する場合
          finalTarget = currentDomain;
          break;
        }
      } catch (error) {
        const nodeError = error as { code?: string };

        if (nodeError.code === 'ENODATA' || nodeError.code === 'ENOTFOUND') {
          // CNAMEレコードがない場合、これが最終ターゲット
          finalTarget = currentDomain;
          break;
        }

        if (error instanceof Error && error.message === 'Timeout') {
          throw new DnsResolutionError(
            `CNAME resolution timeout for ${currentDomain}`,
            {
              domain: currentDomain,
              timeout,
            }
          );
        }

        throw new DnsResolutionError(
          `Failed to resolve CNAME for ${currentDomain}: ${nodeError.code || 'Unknown error'}`,
          { domain: currentDomain, code: nodeError.code }
        );
      }
    }

    if (chain.length >= maxDepth && !finalTarget && !hasLoop) {
      maxDepthReached = true;
      finalTarget = currentDomain;
    }
  } catch (error) {
    // エラーが発生した場合でも、これまでの追跡結果を返す
    console.warn(
      `CNAME chain tracing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  const resolutionTime = Date.now() - startTime;

  return {
    chain,
    finalTarget,
    hasLoop,
    maxDepthReached,
    resolutionTime,
  };
}

/**
 * CNAMEチェーンを検証する
 */
export function validateCnameChain(result: CnameChainResult): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // ループの検知
  if (result.hasLoop) {
    issues.push('CNAMEチェーンにループが検出されました');
    recommendations.push(
      'DNSレコードの設定を確認し、循環参照を修正してください'
    );
  }

  // 最大深度の到達
  if (result.maxDepthReached) {
    issues.push('CNAMEチェーンが最大深度に達しました');
    recommendations.push(
      '不必要に長いCNAMEチェーンを短縮することを検討してください'
    );
  }

  // 長いチェーンの警告
  if (result.chain.length > 5) {
    issues.push(`CNAMEチェーンが長すぎます（${result.chain.length}段階）`);
    recommendations.push(
      'パフォーマンスのため、CNAMEチェーンを5段階以下に短縮することをお勧めします'
    );
  }

  // 解決時間の警告
  if (result.resolutionTime > 2000) {
    issues.push(
      `CNAME解決に時間がかかりすぎています（${result.resolutionTime}ms）`
    );
    recommendations.push('DNSサーバーの応答性能を確認してください');
  }

  // 最終ターゲットの確認
  if (!result.finalTarget && !result.hasLoop) {
    issues.push('CNAMEチェーンの最終ターゲットが解決できませんでした');
    recommendations.push('DNSレコードの設定を確認してください');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations,
  };
}

/**
 * CNAMEチェーンの統計情報を生成
 */
export function getCnameChainStats(results: CnameChainResult[]): {
  totalChains: number;
  averageDepth: number;
  maxDepth: number;
  loopCount: number;
  averageResolutionTime: number;
  healthScore: number;
} {
  if (results.length === 0) {
    return {
      totalChains: 0,
      averageDepth: 0,
      maxDepth: 0,
      loopCount: 0,
      averageResolutionTime: 0,
      healthScore: 100,
    };
  }

  const totalDepth = results.reduce(
    (sum, result) => sum + result.chain.length,
    0
  );
  const maxDepth = Math.max(...results.map(result => result.chain.length));
  const loopCount = results.filter(result => result.hasLoop).length;
  const totalResolutionTime = results.reduce(
    (sum, result) => sum + result.resolutionTime,
    0
  );

  // ヘルススコア計算（0-100）
  let healthScore = 100;

  // ループの影響
  healthScore -= (loopCount / results.length) * 50;

  // 長いチェーンの影響
  const longChains = results.filter(result => result.chain.length > 5).length;
  healthScore -= (longChains / results.length) * 20;

  // 最大深度到達の影響
  const maxDepthReached = results.filter(
    result => result.maxDepthReached
  ).length;
  healthScore -= (maxDepthReached / results.length) * 30;

  return {
    totalChains: results.length,
    averageDepth: totalDepth / results.length,
    maxDepth,
    loopCount,
    averageResolutionTime: totalResolutionTime / results.length,
    healthScore: Math.max(0, Math.round(healthScore)),
  };
}

/**
 * 複数ドメインのCNAMEチェーンを並列で追跡
 */
export async function traceMultipleCnameChains(
  domains: string[],
  options: CnameChainOptions & { concurrency?: number } = {}
): Promise<Map<string, CnameChainResult>> {
  const { concurrency = 5, ...chainOptions } = options;
  const results = new Map<string, CnameChainResult>();

  // 並列実行のためのワーカー関数
  const traceDomain = async (domain: string): Promise<void> => {
    try {
      const result = await traceCnameChain(domain, chainOptions);
      results.set(domain, result);
    } catch (error) {
      // エラーが発生した場合でも結果を記録
      results.set(domain, {
        chain: [domain],
        finalTarget: null,
        hasLoop: false,
        maxDepthReached: false,
        resolutionTime: 0,
      });
    }
  };

  // 並列実行（指定された並列数で制限）
  const workers: Promise<void>[] = [];
  let index = 0;

  const createWorker = async (): Promise<void> => {
    while (index < domains.length) {
      const domain = domains[index++];
      if (domain) {
        await traceDomain(domain);
      }
    }
  };

  for (let i = 0; i < Math.min(concurrency, domains.length); i++) {
    workers.push(createWorker());
  }

  await Promise.all(workers);
  return results;
}
