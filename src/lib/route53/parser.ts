/**
 * Route53 XMLパーサー
 */

import type {
  Route53HostedZone,
  Route53Record,
  Route53ChangeInfo,
} from './types.js';
import type { DNSRecordType } from '../../types/index.js';

export class Route53Parser {
  /**
   * ホステッドゾーンXMLをパース
   */
  parseHostedZonesXml(xml: string): Route53HostedZone[] {
    const zones: Route53HostedZone[] = [];
    const hostedZoneMatches = xml.match(/<HostedZone>[\s\S]*?<\/HostedZone>/g);

    if (!hostedZoneMatches) {
      return zones;
    }

    for (const zoneXml of hostedZoneMatches) {
      const zone: Route53HostedZone = {
        Id: this.extractValue(zoneXml, 'Id') || '',
        Name: this.extractValue(zoneXml, 'Name') || '',
        Config: {
          Comment: this.extractValue(zoneXml, 'Comment'),
          PrivateZone: this.extractValue(zoneXml, 'PrivateZone') === 'true',
        },
        ResourceRecordSetCount: parseInt(
          this.extractValue(zoneXml, 'ResourceRecordSetCount') || '0',
          10
        ),
        CallerReference: this.extractValue(zoneXml, 'CallerReference') || '',
      };

      zones.push(zone);
    }

    return zones;
  }

  /**
   * レコードXMLをパース
   */
  parseRecordsXml(xml: string): Route53Record[] {
    const records: Route53Record[] = [];
    const recordMatches = xml.match(
      /<ResourceRecordSet>[\s\S]*?<\/ResourceRecordSet>/g
    );

    if (!recordMatches) {
      return records;
    }

    for (const recordXml of recordMatches) {
      const record: Route53Record = {
        Name: this.extractValue(recordXml, 'Name') || '',
        Type: this.extractValue(recordXml, 'Type') as DNSRecordType,
      };

      // TTLの抽出
      const ttl = this.extractValue(recordXml, 'TTL');
      if (ttl) {
        record.TTL = parseInt(ttl, 10);
      }

      // ResourceRecordsの抽出
      const resourceRecords = this.extractResourceRecords(recordXml);
      if (resourceRecords.length > 0) {
        record.ResourceRecords = resourceRecords;
      }

      // AliasTargetの抽出
      const aliasTarget = this.extractAliasTarget(recordXml);
      if (aliasTarget) {
        record.AliasTarget = aliasTarget;
      }

      // 重み付けルーティングの抽出
      const setIdentifier = this.extractValue(recordXml, 'SetIdentifier');
      if (setIdentifier) {
        record.SetIdentifier = setIdentifier;
      }

      const weight = this.extractValue(recordXml, 'Weight');
      if (weight) {
        record.Weight = parseInt(weight, 10);
      }

      // 地理的ルーティングの抽出
      const region = this.extractValue(recordXml, 'Region');
      if (region) {
        record.Region = region;
      }

      // フェイルオーバールーティングの抽出
      const failover = this.extractValue(recordXml, 'Failover');
      if (failover) {
        record.Failover = failover as 'PRIMARY' | 'SECONDARY';
      }

      // ヘルスチェックIDの抽出
      const healthCheckId = this.extractValue(recordXml, 'HealthCheckId');
      if (healthCheckId) {
        record.HealthCheckId = healthCheckId;
      }

      records.push(record);
    }

    return records;
  }

  /**
   * 変更情報XMLをパース
   */
  parseChangeInfoXml(xml: string): Route53ChangeInfo | null {
    const changeInfoMatch = xml.match(/<ChangeInfo>[\s\S]*?<\/ChangeInfo>/);
    if (!changeInfoMatch) {
      return null;
    }

    const changeInfoXml = changeInfoMatch[0];
    return {
      Id: this.extractValue(changeInfoXml, 'Id') || '',
      Status: this.extractValue(changeInfoXml, 'Status') as
        | 'PENDING'
        | 'INSYNC',
      SubmittedAt: this.extractValue(changeInfoXml, 'SubmittedAt') || '',
      Comment: this.extractValue(changeInfoXml, 'Comment'),
    };
  }

  /**
   * ResourceRecordsを抽出
   */
  private extractResourceRecords(xml: string): Array<{ Value: string }> {
    const resourceRecords: Array<{ Value: string }> = [];
    const resourceRecordMatches = xml.match(
      /<ResourceRecord>[\s\S]*?<\/ResourceRecord>/g
    );

    if (!resourceRecordMatches) {
      return resourceRecords;
    }

    for (const recordXml of resourceRecordMatches) {
      const value = this.extractValue(recordXml, 'Value');
      if (value) {
        resourceRecords.push({ Value: value });
      }
    }

    return resourceRecords;
  }

  /**
   * AliasTargetを抽出
   */
  private extractAliasTarget(xml: string): Route53Record['AliasTarget'] | null {
    const aliasTargetMatch = xml.match(/<AliasTarget>[\s\S]*?<\/AliasTarget>/);
    if (!aliasTargetMatch) {
      return null;
    }

    const aliasTargetXml = aliasTargetMatch[0];
    return {
      DNSName: this.extractValue(aliasTargetXml, 'DNSName') || '',
      EvaluateTargetHealth:
        this.extractValue(aliasTargetXml, 'EvaluateTargetHealth') === 'true',
      HostedZoneId: this.extractValue(aliasTargetXml, 'HostedZoneId') || '',
    };
  }

  /**
   * XMLから値を抽出
   */
  private extractValue(xml: string, tagName: string): string | undefined {
    const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
    const match = xml.match(regex);
    return match ? match[1].trim() : undefined;
  }
}
