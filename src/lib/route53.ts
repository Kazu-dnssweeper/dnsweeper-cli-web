/**
 * Amazon Route 53 API クライアント
 */

import type { DNSRecordType, ICSVRecord } from '../types/index.js';

/**
 * Route53認証設定
 */
export interface Route53Config {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  sessionToken?: string;
}

/**
 * Route53 レコード
 */
export interface Route53Record {
  Name: string;
  Type: DNSRecordType;
  TTL?: number;
  ResourceRecords?: Array<{ Value: string }>;
  AliasTarget?: {
    DNSName: string;
    EvaluateTargetHealth: boolean;
    HostedZoneId: string;
  };
  SetIdentifier?: string;
  Weight?: number;
  Region?: string;
  Failover?: 'PRIMARY' | 'SECONDARY';
  GeoLocation?: {
    ContinentCode?: string;
    CountryCode?: string;
    SubdivisionCode?: string;
  };
  HealthCheckId?: string;
}

/**
 * Route53 ホステッドゾーン
 */
export interface Route53HostedZone {
  Id: string;
  Name: string;
  Config: {
    Comment?: string;
    PrivateZone: boolean;
  };
  ResourceRecordSetCount: number;
  CallerReference: string;
}

/**
 * Route53 レコードセット変更
 */
export interface Route53Change {
  Action: 'CREATE' | 'DELETE' | 'UPSERT';
  ResourceRecordSet: Route53Record;
}

/**
 * Route53 レコードセット変更バッチ
 */
export interface Route53ChangeBatch {
  Comment?: string;
  Changes: Route53Change[];
}

/**
 * Route53 変更情報
 */
export interface Route53ChangeInfo {
  Id: string;
  Status: 'PENDING' | 'INSYNC';
  SubmittedAt: string;
  Comment?: string;
}

/**
 * Route53 API応答
 */
export interface Route53Response<T = any> {
  data?: T;
  error?: string;
  statusCode?: number;
  requestId?: string;
}

/**
 * Route53 API クライアント
 */
export class Route53Client {
  private config: Route53Config;
  private baseUrl: string;

  constructor(config: Route53Config) {
    this.config = {
      region: 'us-east-1',
      ...config,
    };
    this.baseUrl = `https://route53.amazonaws.com/2013-04-01`;
  }

  /**
   * ホステッドゾーン一覧を取得
   */
  async listHostedZones(): Promise<Route53Response<Route53HostedZone[]>> {
    try {
      const response = await this.makeRequest('GET', '/hostedzone');

      if (!response.ok) {
        return {
          error: `Failed to list hosted zones: ${response.status} ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const data = await response.text();
      const zones = this.parseHostedZonesXml(data);

      return {
        data: zones,
        statusCode: response.status,
        requestId: response.headers.get('x-amzn-requestid') || undefined,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
      };
    }
  }

  /**
   * 特定のホステッドゾーンを取得
   */
  async getHostedZone(
    zoneId: string
  ): Promise<Route53Response<Route53HostedZone>> {
    try {
      const cleanZoneId = this.cleanZoneId(zoneId);
      const response = await this.makeRequest(
        'GET',
        `/hostedzone/${cleanZoneId}`
      );

      if (!response.ok) {
        return {
          error: `Failed to get hosted zone: ${response.status} ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const data = await response.text();
      const zone = this.parseHostedZoneXml(data);

      return {
        data: zone,
        statusCode: response.status,
        requestId: response.headers.get('x-amzn-requestid') || undefined,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
      };
    }
  }

  /**
   * レコードセット一覧を取得
   */
  async listResourceRecordSets(
    zoneId: string,
    options: {
      type?: DNSRecordType;
      name?: string;
      maxItems?: number;
    } = {}
  ): Promise<Route53Response<Route53Record[]>> {
    try {
      const cleanZoneId = this.cleanZoneId(zoneId);
      const params = new URLSearchParams();

      if (options.type) params.set('type', options.type);
      if (options.name) params.set('name', options.name);
      if (options.maxItems) params.set('maxitems', options.maxItems.toString());

      const queryString = params.toString();
      const url = `/hostedzone/${cleanZoneId}/rrset${queryString ? `?${queryString}` : ''}`;

      const response = await this.makeRequest('GET', url);

      if (!response.ok) {
        return {
          error: `Failed to list resource record sets: ${response.status} ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const data = await response.text();
      const records = this.parseResourceRecordSetsXml(data);

      return {
        data: records,
        statusCode: response.status,
        requestId: response.headers.get('x-amzn-requestid') || undefined,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
      };
    }
  }

  /**
   * レコードセットを変更
   */
  async changeResourceRecordSets(
    zoneId: string,
    changeBatch: Route53ChangeBatch
  ): Promise<Route53Response<Route53ChangeInfo>> {
    try {
      const cleanZoneId = this.cleanZoneId(zoneId);
      const xml = this.buildChangeBatchXml(changeBatch);

      const response = await this.makeRequest(
        'POST',
        `/hostedzone/${cleanZoneId}/rrset`,
        xml,
        {
          'Content-Type': 'text/xml',
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          error: `Failed to change resource record sets: ${response.status} ${response.statusText}\n${errorText}`,
          statusCode: response.status,
        };
      }

      const data = await response.text();
      const changeInfo = this.parseChangeInfoXml(data);

      return {
        data: changeInfo,
        statusCode: response.status,
        requestId: response.headers.get('x-amzn-requestid') || undefined,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
      };
    }
  }

  /**
   * 変更状況を取得
   */
  async getChange(
    changeId: string
  ): Promise<Route53Response<Route53ChangeInfo>> {
    try {
      const cleanChangeId = changeId.startsWith('/change/')
        ? changeId.replace('/change/', '')
        : changeId;
      const response = await this.makeRequest(
        'GET',
        `/change/${cleanChangeId}`
      );

      if (!response.ok) {
        return {
          error: `Failed to get change: ${response.status} ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const data = await response.text();
      const changeInfo = this.parseChangeInfoXml(data);

      return {
        data: changeInfo,
        statusCode: response.status,
        requestId: response.headers.get('x-amzn-requestid') || undefined,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
      };
    }
  }

  /**
   * CSVレコードをRoute53レコードに変換
   */
  convertCSVToRoute53Records(csvRecords: ICSVRecord[]): Route53Record[] {
    return csvRecords.map(record => {
      const route53Record: Route53Record = {
        Name: record.domain.endsWith('.') ? record.domain : `${record.domain}.`,
        Type: record.type,
        TTL: record.ttl || 300,
        ResourceRecords: [{ Value: record.value }],
      };

      // MXレコードの場合、優先度を値に含める
      if (record.type === 'MX' && record.priority !== undefined) {
        route53Record.ResourceRecords = [
          { Value: `${record.priority} ${record.value}` },
        ];
      }

      // SRVレコードの場合、重み・優先度・ポートを値に含める
      if (
        record.type === 'SRV' &&
        record.priority !== undefined &&
        record.weight !== undefined &&
        record.port !== undefined
      ) {
        route53Record.ResourceRecords = [
          {
            Value: `${record.priority} ${record.weight} ${record.port} ${record.value}`,
          },
        ];
      }

      // 重みベースルーティングの設定
      if (record.weight !== undefined) {
        route53Record.Weight = record.weight;
        route53Record.SetIdentifier = `${record.domain}-${record.type}-${record.weight}`;
      }

      return route53Record;
    });
  }

  /**
   * Route53レコードをCSVレコードに変換
   */
  convertRoute53ToCSVRecords(route53Records: Route53Record[]): ICSVRecord[] {
    return route53Records.map(record => {
      let value = '';
      let priority: number | undefined;
      let weight: number | undefined;
      let port: number | undefined;

      // ResourceRecords または AliasTarget から値を取得
      if (record.ResourceRecords && record.ResourceRecords.length > 0) {
        value = record.ResourceRecords[0]?.Value || '';
      } else if (record.AliasTarget) {
        value = record.AliasTarget.DNSName;
      }

      // MXレコードの場合、優先度を分離
      if (record.Type === 'MX' && value.includes(' ')) {
        const parts = value.split(' ');
        const priorityStr = parts[0];
        if (priorityStr) {
          priority = parseInt(priorityStr, 10);
        }
        value = parts.slice(1).join(' ');
      }

      // SRVレコードの場合、優先度・重み・ポートを分離
      if (record.Type === 'SRV' && value.includes(' ')) {
        const parts = value.split(' ');
        if (parts.length >= 4) {
          const priorityStr = parts[0];
          const weightStr = parts[1];
          const portStr = parts[2];
          if (priorityStr) priority = parseInt(priorityStr, 10);
          if (weightStr) weight = parseInt(weightStr, 10);
          if (portStr) port = parseInt(portStr, 10);
          value = parts.slice(3).join(' ');
        }
      }

      // 重みベースルーティングの重みを取得
      if (record.Weight !== undefined) {
        weight = record.Weight;
      }

      return {
        domain: record.Name.endsWith('.')
          ? record.Name.slice(0, -1)
          : record.Name,
        type: record.Type,
        value,
        ttl: record.TTL || 300,
        priority,
        weight,
        port,
      };
    });
  }

  /**
   * レコードをインポート（一括作成）
   */
  async importRecords(
    zoneId: string,
    records: ICSVRecord[],
    options: {
      replace?: boolean;
      comment?: string;
      batchSize?: number;
    } = {}
  ): Promise<Route53Response<Route53ChangeInfo[]>> {
    try {
      const {
        replace = false,
        comment = 'Imported by DNSweeper',
        batchSize = 100,
      } = options;
      const route53Records = this.convertCSVToRoute53Records(records);
      const changeInfos: Route53ChangeInfo[] = [];

      // レコードをバッチサイズに分割
      for (let i = 0; i < route53Records.length; i += batchSize) {
        const batch = route53Records.slice(i, i + batchSize);

        const changes: Route53Change[] = batch.map(record => ({
          Action: replace ? 'UPSERT' : 'CREATE',
          ResourceRecordSet: record,
        }));

        const changeBatch: Route53ChangeBatch = {
          Comment: `${comment} (batch ${Math.floor(i / batchSize) + 1})`,
          Changes: changes,
        };

        const response = await this.changeResourceRecordSets(
          zoneId,
          changeBatch
        );

        if (response.error) {
          return {
            ...response,
            data: [] as Route53ChangeInfo[],
          };
        }

        if (response.data) {
          changeInfos.push(response.data);
        }
      }

      return {
        data: changeInfos,
        statusCode: 200,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
      };
    }
  }

  /**
   * レコードをエクスポート
   */
  async exportRecords(
    zoneId: string,
    options: {
      type?: DNSRecordType;
      format?: 'csv' | 'json';
    } = {}
  ): Promise<Route53Response<ICSVRecord[]>> {
    try {
      const response = await this.listResourceRecordSets(zoneId, {
        type: options.type,
      });

      if (response.error || !response.data) {
        return {
          ...response,
          data: [] as ICSVRecord[],
        };
      }

      const csvRecords = this.convertRoute53ToCSVRecords(response.data);

      return {
        data: csvRecords,
        statusCode: response.statusCode,
        requestId: response.requestId,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500,
      };
    }
  }

  /**
   * HTTP リクエストを実行
   */
  private async makeRequest(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: string,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const timestamp = new Date().toISOString();

    // AWS Signature Version 4 の簡易実装（実際には aws-sdk を使用すべき）
    const authHeaders = this.generateAuthHeaders();

    const requestHeaders = {
      Host: 'route53.amazonaws.com',
      'X-Amz-Date': timestamp.replace(/[:-]|\.\d{3}/g, ''),
      ...authHeaders,
      ...headers,
    };

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body) {
      requestOptions.body = body;
    }

    return fetch(url, requestOptions);
  }

  /**
   * AWS認証ヘッダーを生成（簡易実装）
   */
  private generateAuthHeaders(): Record<string, string> {
    // 注意: これは簡易実装です。実際のプロダクションでは aws-sdk を使用してください
    // AWS Signature Version 4 の完全な実装は複雑で、ここでは基本的な構造のみ示しています

    return {
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/20240101/${this.config.region}/route53/aws4_request, SignedHeaders=host;x-amz-date, Signature=placeholder`,
      'X-Amz-Security-Token': this.config.sessionToken || '',
    };
  }

  /**
   * ゾーンIDをクリーンアップ
   */
  private cleanZoneId(zoneId: string): string {
    return zoneId.startsWith('/hostedzone/')
      ? zoneId.replace('/hostedzone/', '')
      : zoneId;
  }

  /**
   * XML解析（簡易実装）
   */
  private parseHostedZonesXml(xml: string): Route53HostedZone[] {
    // 実際の実装では、xml2js などのライブラリを使用することを推奨
    const zones: Route53HostedZone[] = [];

    // 簡易的なXML解析（実際のプロダクションでは適切なXMLパーサーを使用）
    const zonePattern = /<HostedZone>(.*?)<\/HostedZone>/gs;
    let match;

    while ((match = zonePattern.exec(xml)) !== null) {
      const zoneXml = match[1];
      if (!zoneXml) continue;

      const zone: Route53HostedZone = {
        Id: this.extractXmlValue(zoneXml, 'Id') || '',
        Name: this.extractXmlValue(zoneXml, 'Name') || '',
        Config: {
          Comment: this.extractXmlValue(zoneXml, 'Comment'),
          PrivateZone: this.extractXmlValue(zoneXml, 'PrivateZone') === 'true',
        },
        ResourceRecordSetCount: parseInt(
          this.extractXmlValue(zoneXml, 'ResourceRecordSetCount') || '0',
          10
        ),
        CallerReference: this.extractXmlValue(zoneXml, 'CallerReference') || '',
      };

      zones.push(zone);
    }

    return zones;
  }

  private parseHostedZoneXml(xml: string): Route53HostedZone {
    // 簡易的なXML解析
    return {
      Id: this.extractXmlValue(xml, 'Id') || '',
      Name: this.extractXmlValue(xml, 'Name') || '',
      Config: {
        Comment: this.extractXmlValue(xml, 'Comment'),
        PrivateZone: this.extractXmlValue(xml, 'PrivateZone') === 'true',
      },
      ResourceRecordSetCount: parseInt(
        this.extractXmlValue(xml, 'ResourceRecordSetCount') || '0',
        10
      ),
      CallerReference: this.extractXmlValue(xml, 'CallerReference') || '',
    };
  }

  private parseResourceRecordSetsXml(xml: string): Route53Record[] {
    const records: Route53Record[] = [];

    const recordPattern = /<ResourceRecordSet>(.*?)<\/ResourceRecordSet>/gs;
    let match;

    while ((match = recordPattern.exec(xml)) !== null) {
      const recordXml = match[1];
      if (!recordXml) continue;

      const record: Route53Record = {
        Name: this.extractXmlValue(recordXml, 'Name') || '',
        Type: (this.extractXmlValue(recordXml, 'Type') as DNSRecordType) || 'A',
        TTL: parseInt(this.extractXmlValue(recordXml, 'TTL') || '300', 10),
      };

      // ResourceRecords を解析
      const resourceRecords = this.extractResourceRecords(recordXml);
      if (resourceRecords.length > 0) {
        record.ResourceRecords = resourceRecords;
      }

      records.push(record);
    }

    return records;
  }

  private parseChangeInfoXml(xml: string): Route53ChangeInfo {
    return {
      Id: this.extractXmlValue(xml, 'Id') || '',
      Status:
        (this.extractXmlValue(xml, 'Status') as 'PENDING' | 'INSYNC') ||
        'PENDING',
      SubmittedAt: this.extractXmlValue(xml, 'SubmittedAt') || '',
      Comment: this.extractXmlValue(xml, 'Comment'),
    };
  }

  private extractXmlValue(xml: string, tagName: string): string | undefined {
    const pattern = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
    const match = xml.match(pattern);
    return match?.[1]?.trim();
  }

  private extractResourceRecords(xml: string): Array<{ Value: string }> {
    const records: Array<{ Value: string }> = [];
    const valuePattern = /<Value>(.*?)<\/Value>/gs;
    let match;

    while ((match = valuePattern.exec(xml)) !== null) {
      const value = match[1];
      if (value) {
        records.push({ Value: value.trim() });
      }
    }

    return records;
  }

  private buildChangeBatchXml(changeBatch: Route53ChangeBatch): string {
    const changes = changeBatch.Changes.map(change => {
      const record = change.ResourceRecordSet;
      const resourceRecords =
        record.ResourceRecords?.map(
          rr => `<ResourceRecord><Value>${rr.Value}</Value></ResourceRecord>`
        ).join('') || '';

      return `
        <Change>
          <Action>${change.Action}</Action>
          <ResourceRecordSet>
            <Name>${record.Name}</Name>
            <Type>${record.Type}</Type>
            ${record.TTL ? `<TTL>${record.TTL}</TTL>` : ''}
            ${resourceRecords ? `<ResourceRecords>${resourceRecords}</ResourceRecords>` : ''}
            ${record.SetIdentifier ? `<SetIdentifier>${record.SetIdentifier}</SetIdentifier>` : ''}
            ${record.Weight ? `<Weight>${record.Weight}</Weight>` : ''}
          </ResourceRecordSet>
        </Change>
      `;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
      <ChangeResourceRecordSetsRequest xmlns="https://route53.amazonaws.com/doc/2013-04-01/">
        <ChangeBatch>
          ${changeBatch.Comment ? `<Comment>${changeBatch.Comment}</Comment>` : ''}
          <Changes>
            ${changes}
          </Changes>
        </ChangeBatch>
      </ChangeResourceRecordSetsRequest>`;
  }
}
