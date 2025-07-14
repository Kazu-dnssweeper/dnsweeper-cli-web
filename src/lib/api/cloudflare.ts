/**
 * Cloudflare API クライアント
 */

import type { DNSRecordType, ICSVRecord } from '../../types/index.js';

export interface CloudflareConfig {
  apiToken?: string;
  email?: string;
  apiKey?: string;
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
  original_registrar: string;
  original_dnshost: string;
  created_on: string;
  modified_on: string;
  activated_on: string;
}

export interface CloudflareDNSRecord {
  id?: string;
  zone_id?: string;
  zone_name?: string;
  name: string;
  type: DNSRecordType;
  content: string;
  proxiable?: boolean;
  proxied?: boolean;
  ttl?: number;
  priority?: number;
  locked?: boolean;
  created_on?: string;
  modified_on?: string;
  meta?: {
    auto_added?: boolean;
    source?: string;
  };
}

export interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    count: number;
    total_count: number;
    total_pages: number;
  };
}

export class CloudflareClient {
  private readonly baseUrl = 'https://api.cloudflare.com/client/v4';
  private readonly headers: Record<string, string>;

  constructor(config: CloudflareConfig) {
    if (config.apiToken) {
      this.headers = {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      };
    } else if (config.email && config.apiKey) {
      this.headers = {
        'X-Auth-Email': config.email,
        'X-Auth-Key': config.apiKey,
        'Content-Type': 'application/json'
      };
    } else {
      throw new Error('Cloudflare認証情報が不正です。APIトークンまたはEmail+APIキーを指定してください');
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<CloudflareResponse<T>> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      ...(body && { body: JSON.stringify(body) })
    });

    const data = await response.json() as CloudflareResponse<T>;
    
    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
    }

    return data;
  }

  async listZones(): Promise<CloudflareZone[]> {
    const response = await this.request<CloudflareZone[]>('GET', '/zones');
    return response.result;
  }

  async getZone(zoneId: string): Promise<CloudflareZone> {
    const response = await this.request<CloudflareZone>('GET', `/zones/${zoneId}`);
    return response.result;
  }

  async listDNSRecords(zoneId: string): Promise<CloudflareDNSRecord[]> {
    const response = await this.request<CloudflareDNSRecord[]>('GET', `/zones/${zoneId}/dns_records`);
    return response.result;
  }

  async getDNSRecord(zoneId: string, recordId: string): Promise<CloudflareDNSRecord> {
    const response = await this.request<CloudflareDNSRecord>('GET', `/zones/${zoneId}/dns_records/${recordId}`);
    return response.result;
  }

  async createDNSRecord(zoneId: string, record: CloudflareDNSRecord): Promise<CloudflareDNSRecord> {
    const response = await this.request<CloudflareDNSRecord>('POST', `/zones/${zoneId}/dns_records`, record);
    return response.result;
  }

  async updateDNSRecord(zoneId: string, recordId: string, record: CloudflareDNSRecord): Promise<CloudflareDNSRecord> {
    const response = await this.request<CloudflareDNSRecord>('PUT', `/zones/${zoneId}/dns_records/${recordId}`, record);
    return response.result;
  }

  async deleteDNSRecord(zoneId: string, recordId: string): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
    return response.result;
  }

  /**
   * CSVレコードをCloudflare DNS形式に変換
   */
  convertCSVToCloudflareRecords(csvRecords: ICSVRecord[]): CloudflareDNSRecord[] {
    return csvRecords.map(csvRecord => ({
      name: csvRecord.domain,
      type: csvRecord.type,
      content: csvRecord.value,
      ttl: csvRecord.ttl || 1, // CloudflareのTTL 1 = automatic
      priority: csvRecord.priority,
      proxied: false // デフォルトはプロキシ無効
    }));
  }

  /**
   * Cloudflare DNSレコードをCSV形式に変換
   */
  convertCloudflareToCSVRecords(cfRecords: CloudflareDNSRecord[]): ICSVRecord[] {
    return cfRecords.map(cfRecord => ({
      domain: cfRecord.name,
      type: cfRecord.type,
      value: cfRecord.content,
      ttl: cfRecord.ttl === 1 ? 0 : cfRecord.ttl || 300,
      priority: cfRecord.priority,
      weight: undefined,
      port: undefined
    }));
  }

  /**
   * ゾーンファイルのエクスポート
   */
  async exportZone(zoneId: string): Promise<string> {
    const response = await this.request<string>('GET', `/zones/${zoneId}/dns_records/export`);
    return response.result;
  }

  /**
   * ゾーンファイルのインポート
   */
  async importZone(zoneId: string, zoneFile: string): Promise<{
    recs_added: number;
    total_records_parsed: number;
  }> {
    const response = await this.request<{
      recs_added: number;
      total_records_parsed: number;
    }>('POST', `/zones/${zoneId}/dns_records/import`, {
      file: zoneFile
    });
    return response.result;
  }
}