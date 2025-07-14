/**
 * サービスレジストリ - サービス検出と登録
 */

import { EventEmitter } from 'events';
import { Logger } from '@lib/logger.js';
import type { ServiceDefinition, ServiceInstance, HealthCheck } from '@lib/microservices/core/types.js';

export interface ServiceRegistry {
  register(service: ServiceDefinition): Promise<string>;
  deregister(serviceId: string): Promise<void>;
  discover(serviceName: string): Promise<ServiceInstance[]>;
  updateHealth(healthCheck: HealthCheck): Promise<void>;
}

export class ServiceRegistryImpl extends EventEmitter implements ServiceRegistry {
  private services: Map<string, ServiceDefinition> = new Map();
  private instances: Map<string, ServiceInstance[]> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private logger: Logger;

  constructor() {
    super();
    this.logger = new Logger({ context: 'ServiceRegistry' });
  }

  /**
   * サービスを登録
   */
  async register(service: ServiceDefinition): Promise<string> {
    const serviceId = `${service.name}-${service.version}-${Date.now()}`;
    this.services.set(serviceId, service);
    
    this.logger.info('サービスを登録しました', {
      serviceId,
      name: service.name,
      version: service.version
    });

    this.emit('service:registered', { serviceId, service });
    return serviceId;
  }

  /**
   * サービスを登録解除
   */
  async deregister(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`サービスが見つかりません: ${serviceId}`);
    }

    this.services.delete(serviceId);
    this.instances.delete(serviceId);
    this.healthChecks.delete(serviceId);

    this.logger.info('サービスを登録解除しました', { serviceId });
    this.emit('service:deregistered', { serviceId });
  }

  /**
   * サービスインスタンスを検出
   */
  async discover(serviceName: string): Promise<ServiceInstance[]> {
    const allInstances: ServiceInstance[] = [];

    for (const [serviceId, service] of this.services.entries()) {
      if (service.name === serviceName) {
        const instances = this.instances.get(serviceId) || [];
        const healthyInstances = instances.filter(
          instance => instance.status === 'healthy'
        );
        allInstances.push(...healthyInstances);
      }
    }

    return allInstances;
  }

  /**
   * ヘルスチェック結果を更新
   */
  async updateHealth(healthCheck: HealthCheck): Promise<void> {
    this.healthChecks.set(healthCheck.instanceId, healthCheck);

    const instances = this.instances.get(healthCheck.serviceId);
    if (instances) {
      const instance = instances.find(i => i.id === healthCheck.instanceId);
      if (instance) {
        instance.status = healthCheck.status === 'healthy' ? 'healthy' : 'unhealthy';
        instance.lastHealthCheck = healthCheck.timestamp;
      }
    }

    this.emit('health:updated', healthCheck);
  }

  /**
   * インスタンスを登録
   */
  registerInstance(serviceId: string, instance: ServiceInstance): void {
    const instances = this.instances.get(serviceId) || [];
    instances.push(instance);
    this.instances.set(serviceId, instances);

    this.logger.info('インスタンスを登録しました', {
      serviceId,
      instanceId: instance.id,
      host: instance.host,
      port: instance.port
    });

    this.emit('instance:registered', { serviceId, instance });
  }

  /**
   * インスタンスを削除
   */
  deregisterInstance(serviceId: string, instanceId: string): void {
    const instances = this.instances.get(serviceId) || [];
    const filtered = instances.filter(i => i.id !== instanceId);
    this.instances.set(serviceId, filtered);

    this.logger.info('インスタンスを削除しました', {
      serviceId,
      instanceId
    });

    this.emit('instance:deregistered', { serviceId, instanceId });
  }

  /**
   * サービス統計を取得
   */
  getServiceStats(): Record<string, unknown> {
    const stats = {
      totalServices: this.services.size,
      totalInstances: 0,
      healthyInstances: 0,
      unhealthyInstances: 0,
      services: [] as Array<{
        name: string;
        version: string;
        instances: number;
        healthy: number;
      }>
    };

    for (const [serviceId, service] of this.services.entries()) {
      const instances = this.instances.get(serviceId) || [];
      const healthyCount = instances.filter(i => i.status === 'healthy').length;
      
      stats.totalInstances += instances.length;
      stats.healthyInstances += healthyCount;
      stats.unhealthyInstances += instances.length - healthyCount;
      
      stats.services.push({
        name: service.name,
        version: service.version,
        instances: instances.length,
        healthy: healthyCount
      });
    }

    return stats;
  }
}