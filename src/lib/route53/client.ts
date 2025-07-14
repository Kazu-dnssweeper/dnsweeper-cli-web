/**
 * Route53 API クライアント
 */

import { Route53Auth } from './auth.js';
import { Route53Parser } from './parser.js';
import { Route53BatchProcessor } from './batch.js';
import type {
  Route53Config,
  Route53HostedZone,
  Route53Record,
  Route53Response,
  Route53ChangeBatch,
  Route53ChangeInfo,
  Route53BatchOptions,
  Route53BatchResult,
} from './types.js';

import type { ICSVRecord } from '../../types/index.js';

export class Route53Client {
  private config: Route53Config;
  private baseUrl: string;
  private auth: Route53Auth;
  private parser: Route53Parser;
  private batchProcessor: Route53BatchProcessor;

  constructor(config: Route53Config, batchOptions?: Route53BatchOptions) {
    this.config = {
      region: 'us-east-1',
      ...config,
    };
    this.baseUrl = `https://route53.amazonaws.com/2013-04-01`;
    this.auth = new Route53Auth(this.config);
    this.parser = new Route53Parser();
    this.batchProcessor = new Route53BatchProcessor(batchOptions);
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
      const zones = this.parser.parseHostedZonesXml(data);

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
  async getHostedZone(zoneId: string): Promise<Route53Response<Route53HostedZone>> {
    try {
      const cleanZoneId = this.cleanZoneId(zoneId);
      const response = await this.makeRequest('GET', `/hostedzone/${cleanZoneId}`);

      if (!response.ok) {
        return {
          error: `Failed to get hosted zone: ${response.status} ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const data = await response.text();
      const zones = this.parser.parseHostedZonesXml(data);

      return {
        data: zones[0],
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
  async listResourceRecordSets(zoneId: string): Promise<Route53Response<Route53Record[]>> {
    try {
      const cleanZoneId = this.cleanZoneId(zoneId);
      const response = await this.makeRequest('GET', `/hostedzone/${cleanZoneId}/rrset`);

      if (!response.ok) {
        return {
          error: `Failed to list resource record sets: ${response.status} ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const data = await response.text();
      const records = this.parser.parseRecordsXml(data);

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
      const body = this.buildChangeResourceRecordSetsXml(changeBatch);
      const response = await this.makeRequest(
        'POST',
        `/hostedzone/${cleanZoneId}/rrset`,
        body
      );

      if (!response.ok) {
        return {
          error: `Failed to change resource record sets: ${response.status} ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const data = await response.text();
      const changeInfo = this.parser.parseChangeInfoXml(data);

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
   * CSVレコードを一括インポート
   */
  async importFromCSV(
    zoneId: string,
    records: ICSVRecord[]
  ): Promise<Route53BatchResult> {
    return this.batchProcessor.processBatch(records, async (changes) => {
      const changeBatch: Route53ChangeBatch = {
        Comment: `Bulk import from CSV - ${new Date().toISOString()}`,
        Changes: changes,
      };

      const response = await this.changeResourceRecordSets(zoneId, changeBatch);
      return response.data || null;
    });
  }

  /**
   * 変更ステータスを取得
   */
  async getChangeStatus(changeId: string): Promise<Route53Response<Route53ChangeInfo>> {
    try {
      const cleanChangeId = this.cleanChangeId(changeId);
      const response = await this.makeRequest('GET', `/change/${cleanChangeId}`);

      if (!response.ok) {
        return {
          error: `Failed to get change status: ${response.status} ${response.statusText}`,
          statusCode: response.status,
        };
      }

      const data = await response.text();
      const changeInfo = this.parser.parseChangeInfoXml(data);

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
   * HTTPリクエストを作成
   */
  private async makeRequest(
    method: string,
    path: string,
    body?: string
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.auth.createAuthHeaders(method, path, body);

    return fetch(url, {
      method,
      headers,
      body: body || undefined,
    });
  }

  /**
   * ゾーンIDをクリーンアップ
   */
  private cleanZoneId(zoneId: string): string {
    return zoneId.replace(/^\/hostedzone\//, '');
  }

  /**
   * 変更IDをクリーンアップ
   */
  private cleanChangeId(changeId: string): string {
    return changeId.replace(/^\/change\//, '');
  }

  /**
   * Route53レコードをCSV形式に変換
   */
  convertRoute53ToCSVRecords(records: Route53Record[]): ICSVRecord[] {
    return records.map(record => ({
      id: `r53-${record.Name}-${record.Type}`,
      name: record.Name,
      type: record.Type,
      value: record.ResourceRecords?.[0]?.Value || record.AliasTarget?.DNSName || '',
      ttl: record.TTL || 300,
      priority: record.Type === 'MX' ? this.extractMXPriority(record.ResourceRecords?.[0]?.Value) : undefined,
      weight: record.Weight,
      created: new Date(),
      updated: new Date(),
      setIdentifier: record.SetIdentifier
    }));
  }

  /**
   * CSVレコードをRoute53形式に変換
   */
  convertCSVToRoute53(records: ICSVRecord[]): Route53Record[] {
    return records.map(record => {
      const r53Record: Route53Record = {
        Name: record.name,
        Type: record.type,
        TTL: record.ttl
      };

      // MXレコードの処理
      if (record.type === 'MX' && record.priority !== undefined) {
        r53Record.ResourceRecords = [{
          Value: `${record.priority} ${record.value}`
        }];
      } else {
        r53Record.ResourceRecords = [{
          Value: record.value
        }];
      }

      // オプションフィールド
      if (record.weight !== undefined) r53Record.Weight = record.weight;
      if (record.setIdentifier) r53Record.SetIdentifier = record.setIdentifier;

      return r53Record;
    });
  }

  /**
   * MXレコードから優先度を抽出
   */
  private extractMXPriority(value?: string): number | undefined {
    if (!value) return undefined;
    const match = value.match(/^(\d+)\s+/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * ChangeResourceRecordSets XMLを構築
   */
  private buildChangeResourceRecordSetsXml(changeBatch: Route53ChangeBatch): string {
    const changes = changeBatch.Changes.map(change => {
      const resourceRecords = change.ResourceRecordSet.ResourceRecords
        ? change.ResourceRecordSet.ResourceRecords.map(
            rr => `        <ResourceRecord><Value>${rr.Value}</Value></ResourceRecord>`
          ).join('\n')
        : '';

      const aliasTarget = change.ResourceRecordSet.AliasTarget
        ? `
        <AliasTarget>
          <DNSName>${change.ResourceRecordSet.AliasTarget.DNSName}</DNSName>
          <EvaluateTargetHealth>${change.ResourceRecordSet.AliasTarget.EvaluateTargetHealth}</EvaluateTargetHealth>
          <HostedZoneId>${change.ResourceRecordSet.AliasTarget.HostedZoneId}</HostedZoneId>
        </AliasTarget>`
        : '';

      return `
    <Change>
      <Action>${change.Action}</Action>
      <ResourceRecordSet>
        <Name>${change.ResourceRecordSet.Name}</Name>
        <Type>${change.ResourceRecordSet.Type}</Type>
        ${change.ResourceRecordSet.TTL ? `<TTL>${change.ResourceRecordSet.TTL}</TTL>` : ''}
        ${resourceRecords ? `<ResourceRecords>\n${resourceRecords}\n        </ResourceRecords>` : ''}
        ${aliasTarget}
        ${change.ResourceRecordSet.SetIdentifier ? `<SetIdentifier>${change.ResourceRecordSet.SetIdentifier}</SetIdentifier>` : ''}
        ${change.ResourceRecordSet.Weight ? `<Weight>${change.ResourceRecordSet.Weight}</Weight>` : ''}
        ${change.ResourceRecordSet.Region ? `<Region>${change.ResourceRecordSet.Region}</Region>` : ''}
        ${change.ResourceRecordSet.Failover ? `<Failover>${change.ResourceRecordSet.Failover}</Failover>` : ''}
        ${change.ResourceRecordSet.HealthCheckId ? `<HealthCheckId>${change.ResourceRecordSet.HealthCheckId}</HealthCheckId>` : ''}
      </ResourceRecordSet>
    </Change>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<ChangeResourceRecordSetsRequest xmlns="https://route53.amazonaws.com/doc/2013-04-01/">
  <ChangeBatch>
    ${changeBatch.Comment ? `<Comment>${changeBatch.Comment}</Comment>` : ''}
    <Changes>${changes}
    </Changes>
  </ChangeBatch>
</ChangeResourceRecordSetsRequest>`;
  }
}