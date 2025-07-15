/**
 * マイクロサービスアーキテクチャ - エクスポート
 */

// Core types
export * from './core/types.js';

// Service Discovery
export { ServiceRegistryImpl } from './discovery/service-registry.js';

// Circuit Breaker
export {
  CircuitBreakerImpl,
  type CircuitBreakerOptions,
} from './circuit-breaker/circuit-breaker.js';

// API Gateway
export {
  APIGateway,
  type GatewayRoute,
  type GatewayOptions,
} from './gateway/api-gateway.js';

// Re-export the main class for backward compatibility
export { MicroservicesArchitecture } from './microservices-architecture.js';
