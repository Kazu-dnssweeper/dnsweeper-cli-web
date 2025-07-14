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
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      };
    } else if (config.email && config.apiKey) {
      this.headers = {
        'X-Auth-Email': config.email,
        'X-Auth-Key': config.apiKey,
        'Content-Type': 'application/json',
      };
    } else {
      throw new Error(
        'Cloudflare認証情報が不正です。APIトークンまたはEmail+APIキーを指定してください'
      );
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
      ...(body && { body: JSON.stringify(body) }),
    });

    const data = (await response.json()) as CloudflareResponse<T>;

    if (!response.ok) {
      throw new Error(
        `Cloudflare API error: ${response.status} ${response.statusText}`
      );
    }

    return data;
  }

  async listZones(): Promise<CloudflareZone[]> {
    const response = await this.request<CloudflareZone[]>('GET', '/zones');
    return response.result;
  }

  async getZone(zoneId: string): Promise<CloudflareZone> {
    const response = await this.request<CloudflareZone>(
      'GET',
      `/zones/${zoneId}`
    );
    return response.result;
  }

  async listDNSRecords(zoneId: string): Promise<CloudflareDNSRecord[]> {
    const response = await this.request<CloudflareDNSRecord[]>(
      'GET',
      `/zones/${zoneId}/dns_records`
    );
    return response.result;
  }

  async getDNSRecord(
    zoneId: string,
    recordId: string
  ): Promise<CloudflareDNSRecord> {
    const response = await this.request<CloudflareDNSRecord>(
      'GET',
      `/zones/${zoneId}/dns_records/${recordId}`
    );
    return response.result;
  }

  async createDNSRecord(
    zoneId: string,
    record: CloudflareDNSRecord
  ): Promise<CloudflareDNSRecord> {
    const response = await this.request<CloudflareDNSRecord>(
      'POST',
      `/zones/${zoneId}/dns_records`,
      record
    );
    return response.result;
  }

  async updateDNSRecord(
    zoneId: string,
    recordId: string,
    record: CloudflareDNSRecord
  ): Promise<CloudflareDNSRecord> {
    const response = await this.request<CloudflareDNSRecord>(
      'PUT',
      `/zones/${zoneId}/dns_records/${recordId}`,
      record
    );
    return response.result;
  }

  async deleteDNSRecord(
    zoneId: string,
    recordId: string
  ): Promise<{ id: string }> {
    const response = await this.request<{ id: string }>(
      'DELETE',
      `/zones/${zoneId}/dns_records/${recordId}`
    );
    return response.result;
  }

  /**
   * CSVレコードをCloudflare DNS形式に変換
   */
  convertCSVToCloudflareRecords(
    csvRecords: ICSVRecord[]
  ): CloudflareDNSRecord[] {
    return csvRecords.map(csvRecord => {
      let content = csvRecord.value;

      // MXレコードの場合、priorityをcontentに含める
      if (csvRecord.type === 'MX' && csvRecord.priority !== undefined) {
        content = `${csvRecord.priority} ${csvRecord.value}`;
      }

      // SRVレコードの場合、priority/weight/portをcontentに含める
      if (
        csvRecord.type === 'SRV' &&
        csvRecord.priority !== undefined &&
        csvRecord.weight !== undefined &&
        csvRecord.port !== undefined
      ) {
        content = `${csvRecord.priority} ${csvRecord.weight} ${csvRecord.port} ${csvRecord.value}`;
      }

      return {
        name: csvRecord.domain,
        type: csvRecord.type,
        content,
        ttl: csvRecord.ttl || 1, // CloudflareのTTL 1 = automatic
        priority: csvRecord.priority,
        proxied: false, // デフォルトはプロキシ無効
      };
    });
  }

  /**
   * Cloudflare DNSレコードをCSV形式に変換
   */
  convertCloudflareToCSVRecords(
    cfRecords: CloudflareDNSRecord[]
  ): ICSVRecord[] {
    return cfRecords.map(cfRecord => {
      let value = cfRecord.content;
      let priority = cfRecord.priority;

      // MXレコードの場合、contentから優先度を抽出
      if (cfRecord.type === 'MX') {
        const match = cfRecord.content.match(/^(\d+)\s+(.+)$/);
        if (match) {
          priority = parseInt(match[1], 10);
          value = match[2];
        }
      }

      // SRVレコードの場合、contentからweight/port/target情報を抽出
      if (cfRecord.type === 'SRV') {
        const match = cfRecord.content.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/);
        if (match) {
          priority = parseInt(match[1], 10);
          return {
            domain: cfRecord.name,
            type: cfRecord.type,
            value: match[4], // target
            ttl: cfRecord.proxied ? 1 : cfRecord.ttl || 300,
            priority,
            weight: parseInt(match[2], 10),
            port: parseInt(match[3], 10),
          };
        }
      }

      return {
        domain: cfRecord.name,
        type: cfRecord.type,
        value,
        ttl: cfRecord.proxied ? 1 : cfRecord.ttl || 300,
        priority,
        weight: undefined,
        port: undefined,
      };
    });
  }

  /**
   * ゾーンファイルのエクスポート
   */
  async exportZone(zoneId: string): Promise<string> {
    const response = await this.request<string>(
      'GET',
      `/zones/${zoneId}/dns_records/export`
    );
    return response.result;
  }

  /**
   * ゾーンファイルのインポート
   */
  async importZone(
    zoneId: string,
    zoneFile: string
  ): Promise<{
    recs_added: number;
    total_records_parsed: number;
  }> {
    const response = await this.request<{
      recs_added: number;
      total_records_parsed: number;
    }>('POST', `/zones/${zoneId}/dns_records/import`, {
      file: zoneFile,
    });
    return response.result;
  }

  /**
   * CSVレコードをインポート
   */
  async importRecords(
    zoneId: string,
    records: ICSVRecord[]
  ): Promise<{
    success: boolean;
    created: number;
    failed: number;
    errors: any[];
  }> {
    const results = {
      success: true,
      created: 0,
      failed: 0,
      errors: [] as any[],
    };

    const cloudflareRecords = this.convertCSVToCloudflareRecords(records);

    for (const record of cloudflareRecords) {
      try {
        await this.createDNSRecord(zoneId, record);
        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push(error);
        results.success = false;
      }
    }

    return results;
  }

  /**
   * レコードをエクスポート
   */
  async exportRecords(
    zoneId: string,
    _options?: { type?: string; name?: string }
  ): Promise<{ success: boolean; records: ICSVRecord[] }> {
    try {
      // TODO: optionsパラメータを使用してフィルタリングを実装
      const records = await this.listDNSRecords(zoneId);
      const csvRecords = this.convertCloudflareToCSVRecords(records);

      return {
        success: true,
        records: csvRecords,
      };
    } catch (error) {
      return {
        success: false,
        records: [],
      };
    }
  }
}
