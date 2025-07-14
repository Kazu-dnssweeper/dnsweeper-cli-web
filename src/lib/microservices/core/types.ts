/**
 * マイクロサービスアーキテクチャ - コア型定義
 */

export interface ServiceDefinition {
  name: string;
  version: string;
  port: number;
  health: {
    endpoint: string;
    interval: number;
    timeout: number;
  };
  dependencies: string[];
  environment: 'development' | 'staging' | 'production';
  resources: {
    cpu: string;
    memory: string;
    replicas: number;
    maxReplicas: number;
  };
  endpoints: ServiceEndpoint[];
  authentication: {
    required: boolean;
    type: 'jwt' | 'oauth' | 'api-key';
  };
  monitoring: {
    metrics: boolean;
    logging: boolean;
    tracing: boolean;
  };
}

export interface ServiceEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  authentication: boolean;
  rateLimit: {
    requests: number;
    window: string;
  };
  timeout: number;
  retry: {
    attempts: number;
    backoff: 'exponential' | 'linear';
  };
  validation: {
    request?: Record<string, unknown>;
    response?: Record<string, unknown>;
  };
}

export interface ServiceInstance {
  id: string;
  serviceId: string;
  host: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'starting' | 'stopping';
  registeredAt: Date;
  lastHealthCheck: Date;
  metadata: {
    version: string;
    environment: string;
    zone: string;
    weight: number;
    tags: string[];
    [key: string]: unknown;
  };
}

export interface HealthCheck {
  serviceId: string;
  instanceId: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details: {
    cpu: number;
    memory: number;
    connections: number;
    errors: number;
  };
  timestamp: Date;
}

export interface ServiceMessage {
  id: string;
  correlationId: string;
  source: string;
  destination: string;
  type: 'request' | 'response' | 'event';
  payload: Record<string, unknown>;
  timestamp: Date;
  headers: {
    [key: string]: string;
  };
  metadata: {
    retryCount?: number;
    priority?: 'low' | 'medium' | 'high';
    ttl?: number;
  };
}