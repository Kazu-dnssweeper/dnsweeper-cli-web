import { ApiError } from '../errors.js';
import type { DNSRecordType } from '../../types/index.js';

/**
 * Cloudflare APIクライアント
 * https://developers.cloudflare.com/api/
 */

export interface CloudflareConfig {
  apiKey: string;
  email: string;
  apiUrl?: string;
}

export interface CloudflareDNSRecord {
  id: string;
  type: DNSRecordType;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
  created_on?: string;
  modified_on?: string;
  locked?: boolean;
  zone_id: string;
  zone_name: string;
  data?: Record<string, any>;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
  type: string;
  development_mode: number;
  name_servers: string[];
  original_name_servers: string[];
  created_on: string;
  modified_on: string;
}

export interface CloudflareListResponse<T> {
  result: T[];
  success: boolean;
  errors: any[];
  messages: any[];
  result_info: {
    page: number;
    per_page: number;
    count: number;
    total_count: number;
  };
}

export class CloudflareClient {
  private apiUrl: string;
  private headers: Record<string, string>;

  constructor(config: CloudflareConfig) {
    this.apiUrl = config.apiUrl || 'https://api.cloudflare.com/client/v4';
    this.headers = {
      'X-Auth-Email': config.email,
      'X-Auth-Key': config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * APIリクエストを送信
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new ApiError(
          data.errors?.[0]?.message || 'Cloudflare API error',
          response.status,
          {
            errors: data.errors,
            messages: data.messages,
          }
        );
      }

      return data.result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        `Cloudflare API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * ゾーン（ドメイン）一覧を取得
   */
  async listZones(options: {
    name?: string;
    status?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<CloudflareZone[]> {
    const params = new URLSearchParams();
    
    if (options.name) params.set('name', options.name);
    if (options.status) params.set('status', options.status);
    if (options.page) params.set('page', options.page.toString());
    if (options.per_page) params.set('per_page', options.per_page.toString());

    const queryString = params.toString();
    const path = `/zones${queryString ? `?${queryString}` : ''}`;

    return this.request<CloudflareZone[]>('GET', path);
  }

  /**
   * ゾーン詳細を取得
   */
  async getZone(zoneId: string): Promise<CloudflareZone> {
    return this.request<CloudflareZone>('GET', `/zones/${zoneId}`);
  }

  /**
   * DNSレコード一覧を取得
   */
  async listDNSRecords(
    zoneId: string,
    options: {
      type?: DNSRecordType;
      name?: string;
      content?: string;
      page?: number;
      per_page?: number;
    } = {}
  ): Promise<CloudflareDNSRecord[]> {
    const params = new URLSearchParams();
    
    if (options.type) params.set('type', options.type);
    if (options.name) params.set('name', options.name);
    if (options.content) params.set('content', options.content);
    if (options.page) params.set('page', options.page.toString());
    if (options.per_page) params.set('per_page', options.per_page.toString());

    const queryString = params.toString();
    const path = `/zones/${zoneId}/dns_records${queryString ? `?${queryString}` : ''}`;

    return this.request<CloudflareDNSRecord[]>('GET', path);
  }

  /**
   * DNSレコード詳細を取得
   */
  async getDNSRecord(zoneId: string, recordId: string): Promise<CloudflareDNSRecord> {
    return this.request<CloudflareDNSRecord>(
      'GET',
      `/zones/${zoneId}/dns_records/${recordId}`
    );
  }

  /**
   * DNSレコードを作成
   */
  async createDNSRecord(
    zoneId: string,
    record: {
      type: DNSRecordType;
      name: string;
      content: string;
      ttl?: number;
      priority?: number;
      proxied?: boolean;
      data?: Record<string, any>;
    }
  ): Promise<CloudflareDNSRecord> {
    const body = {
      ...record,
      ttl: record.ttl || 1, // Auto TTL
    };

    return this.request<CloudflareDNSRecord>(
      'POST',
      `/zones/${zoneId}/dns_records`,
      body
    );
  }

  /**
   * DNSレコードを更新
   */
  async updateDNSRecord(
    zoneId: string,
    recordId: string,
    record: {
      type?: DNSRecordType;
      name?: string;
      content?: string;
      ttl?: number;
      priority?: number;
      proxied?: boolean;
      data?: Record<string, any>;
    }
  ): Promise<CloudflareDNSRecord> {
    return this.request<CloudflareDNSRecord>(
      'PATCH',
      `/zones/${zoneId}/dns_records/${recordId}`,
      record
    );
  }

  /**
   * DNSレコードを削除
   */
  async deleteDNSRecord(zoneId: string, recordId: string): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      'DELETE',
      `/zones/${zoneId}/dns_records/${recordId}`
    );
  }

  /**
   * 複数のDNSレコードを一括インポート
   */
  async importDNSRecords(
    zoneId: string,
    records: Array<{
      type: DNSRecordType;
      name: string;
      content: string;
      ttl?: number;
      priority?: number;
      proxied?: boolean;
    }>
  ): Promise<CloudflareDNSRecord[]> {
    const results: CloudflareDNSRecord[] = [];
    const errors: any[] = [];

    // バッチ処理（Cloudflare APIは一括インポートをサポートしていないため）
    for (const record of records) {
      try {
        const created = await this.createDNSRecord(zoneId, record);
        results.push(created);
      } catch (error) {
        errors.push({
          record,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (errors.length > 0) {
      throw new ApiError(
        `Failed to import ${errors.length} out of ${records.length} records`,
        undefined,
        { errors, imported: results }
      );
    }

    return results;
  }

  /**
   * ゾーンのDNSレコードをエクスポート
   */
  async exportDNSRecords(
    zoneId: string,
    format: 'json' | 'bind' = 'json'
  ): Promise<string> {
    const records = await this.listDNSRecords(zoneId, { per_page: 1000 });

    if (format === 'bind') {
      return this.toBINDFormat(records);
    }

    return JSON.stringify(records, null, 2);
  }

  /**
   * BIND形式に変換
   */
  private toBINDFormat(records: CloudflareDNSRecord[]): string {
    const lines: string[] = [];
    
    for (const record of records) {
      const ttl = record.ttl === 1 ? '' : ` ${record.ttl}`;
      const priority = record.priority ? ` ${record.priority}` : '';
      
      lines.push(`${record.name}${ttl} IN ${record.type}${priority} ${record.content}`);
    }

    return lines.join('\n');
  }

  /**
   * ドメイン名でゾーンIDを検索
   */
  async findZoneId(domain: string): Promise<string | null> {
    const zones = await this.listZones({ name: domain });
    
    if (zones.length === 0) {
      // サブドメインの場合、親ドメインを検索
      const parts = domain.split('.');
      if (parts.length > 2) {
        const parentDomain = parts.slice(1).join('.');
        return this.findZoneId(parentDomain);
      }
      return null;
    }

    return zones[0].id;
  }
}