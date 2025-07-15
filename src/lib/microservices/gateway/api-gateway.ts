/**
 * APIゲートウェイ - マイクロサービスへの統一エントリポイント
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

import { Logger } from '@lib/logger.js';

import type { CircuitBreakerImpl } from '@lib/microservices/circuit-breaker/circuit-breaker.js';
import type {
  ServiceInstance,
  ServiceMessage,
} from '@lib/microservices/core/types.js';
import type { ServiceRegistryImpl } from '@lib/microservices/discovery/service-registry.js';

export interface GatewayRoute {
  id: string;
  path: string;
  service: string;
  methods: string[];
  authentication: boolean;
  rateLimit: {
    requests: number;
    window: string;
  };
  timeout: number;
  retries: number;
  headers?: { [key: string]: string };
  transformations?: Array<{
    type: 'add-header' | 'remove-header' | 'modify-body';
    parameters: Record<string, unknown>;
  }>;
}

export interface GatewayOptions {
  port?: number;
  host?: string;
  enableMetrics?: boolean;
  enableTracing?: boolean;
  corsOptions?: {
    origins: string[];
    methods: string[];
    headers: string[];
  };
}

export interface LoadBalancer {
  strategy: 'round-robin' | 'least-connections' | 'weighted' | 'random';
  healthCheckInterval: number;
  failoverThreshold: number;
}

export class APIGateway extends EventEmitter {
  private routes: Map<string, GatewayRoute> = new Map();
  private requestCount: Map<string, number> = new Map();
  private logger: Logger;
  private registry: ServiceRegistryImpl;
  private circuitBreaker: CircuitBreakerImpl;
  private loadBalancerIndex: Map<string, number> = new Map();
  private options: Required<GatewayOptions>;

  constructor(
    registry: ServiceRegistryImpl,
    circuitBreaker: CircuitBreakerImpl,
    options?: GatewayOptions
  ) {
    super();
    this.logger = new Logger({});
    this.registry = registry;
    this.circuitBreaker = circuitBreaker;
    this.options = {
      port: options?.port || 8080,
      host: options?.host || '0.0.0.0',
      enableMetrics: options?.enableMetrics ?? true,
      enableTracing: options?.enableTracing ?? true,
      corsOptions: options?.corsOptions || {
        origins: ['*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization'],
      },
    };
    this.startMetricsCollection();
  }

  /**
   * ルートを追加
   */
  addRoute(route: GatewayRoute): void {
    this.routes.set(route.path, route);
    this.logger.info('ルートを追加しました', {
      path: route.path,
      service: route.service,
      methods: route.methods,
    });
    this.emit('route:added', route);
  }

  /**
   * ルートを削除
   */
  removeRoute(path: string): void {
    const route = this.routes.get(path);
    if (route) {
      this.routes.delete(path);
      this.logger.info('ルートを削除しました', { path });
      this.emit('route:removed', route);
    }
  }

  /**
   * リクエストを処理
   */
  async handleRequest(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ServiceMessage> {
    const route = this.findRoute(path);
    if (!route) {
      throw new Error(`Route not found: ${path}`);
    }

    if (!route.methods.includes(method)) {
      throw new Error(`Method not allowed: ${method}`);
    }

    // レート制限チェック
    this.checkRateLimit(route);

    // サービスインスタンスを取得
    const instances = await this.registry.discover(route.service);
    if (instances.length === 0) {
      throw new Error(`No healthy instances for service: ${route.service}`);
    }

    // ロードバランシング
    const instance = this.selectInstance(instances, route.service);

    // リクエストメッセージを作成
    const message: ServiceMessage = {
      id: randomUUID(),
      correlationId: randomUUID(),
      source: 'api-gateway',
      destination: route.service,
      type: 'request',
      payload: { method, path, body },
      timestamp: new Date(),
      headers: { ...headers, ...route.headers },
      metadata: {
        retryCount: 0,
        priority: 'medium',
      },
    };

    // サーキットブレーカーを通してリクエスト
    try {
      const response = await this.circuitBreaker.wrap(
        `${route.service}-${instance.id}`,
        () => this.sendRequest(instance, message, route),
        {
          timeout: route.timeout,
          failureThreshold: 5,
        }
      );

      this.emit('request:success', {
        route: route.path,
        service: route.service,
        instance: instance.id,
        duration: Date.now() - message.timestamp.getTime(),
      });

      return response;
    } catch (error) {
      this.emit('request:failure', {
        route: route.path,
        service: route.service,
        instance: instance.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // リトライロジック
      if (message.metadata.retryCount! < route.retries) {
        message.metadata.retryCount!++;
        return this.handleRequest(method, path, body, headers);
      }

      throw error;
    }
  }

  /**
   * ルートを検索
   */
  private findRoute(path: string): GatewayRoute | undefined {
    // 完全一致
    if (this.routes.has(path)) {
      return this.routes.get(path);
    }

    // パターンマッチング
    for (const [pattern, route] of this.routes) {
      const regex = new RegExp(pattern.replace(/:[^/]+/g, '([^/]+)'));
      if (regex.test(path)) {
        return route;
      }
    }

    return undefined;
  }

  /**
   * レート制限をチェック
   */
  private checkRateLimit(route: GatewayRoute): void {
    const key = `${route.path}:${(Date.now() / 1000 / 60) | 0}`;
    const count = this.requestCount.get(key) || 0;

    if (count >= route.rateLimit.requests) {
      throw new Error('Rate limit exceeded');
    }

    this.requestCount.set(key, count + 1);
  }

  /**
   * インスタンスを選択（ロードバランシング）
   */
  private selectInstance(
    instances: ServiceInstance[],
    serviceName: string
  ): ServiceInstance {
    const index = this.loadBalancerIndex.get(serviceName) || 0;
    const selected = instances[index % instances.length];
    this.loadBalancerIndex.set(serviceName, index + 1);
    return selected;
  }

  /**
   * リクエストを送信
   */
  private async sendRequest(
    instance: ServiceInstance,
    message: ServiceMessage,
    route: GatewayRoute
  ): Promise<ServiceMessage> {
    // 実際の実装では、HTTPクライアントを使用して
    // インスタンスにリクエストを送信します
    this.logger.info('リクエストを送信します', {
      instance: instance.id,
      service: route.service,
      messageId: message.id,
    });

    // シミュレーション：成功レスポンス
    return {
      ...message,
      id: randomUUID(),
      type: 'response',
      source: route.service,
      destination: 'api-gateway',
      payload: {
        status: 200,
        data: { message: 'Success' },
      },
    };
  }

  /**
   * メトリクス収集を開始
   */
  private startMetricsCollection(): void {
    if (!this.options.enableMetrics) return;

    setInterval(() => {
      const metrics = this.collectMetrics();
      this.emit('metrics', metrics);
    }, 60000); // 1分ごと
  }

  /**
   * メトリクスを収集
   */
  private collectMetrics(): Record<string, unknown> {
    const metrics = {
      timestamp: new Date(),
      routes: this.routes.size,
      requests: {
        total: 0,
        perRoute: {} as Record<string, number>,
      },
      services: [] as Array<{
        name: string;
        instances: number;
        healthy: number;
      }>,
    };

    // リクエスト数を集計
    for (const [key, count] of this.requestCount) {
      const [route] = key.split(':');
      metrics.requests.total += count;
      metrics.requests.perRoute[route] =
        (metrics.requests.perRoute[route] || 0) + count;
    }

    // サービス情報を収集
    const serviceStats = this.registry.getServiceStats() as {
      services: Array<{
        name: string;
        instances: number;
        healthy: number;
      }>;
    };
    metrics.services = serviceStats.services;

    return metrics;
  }

  /**
   * ゲートウェイ統計を取得
   */
  getStats(): Record<string, unknown> {
    return {
      routes: Array.from(this.routes.values()).map(route => ({
        path: route.path,
        service: route.service,
        methods: route.methods,
        authentication: route.authentication,
      })),
      metrics: this.collectMetrics(),
      circuitBreakers: this.circuitBreaker.getStats(),
    };
  }
}
