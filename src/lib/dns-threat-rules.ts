/**
 * DNS 脅威検出ルールエンジン
 * カスタムルール管理、パターンマッチング、ルール評価を担当
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type {
  SecurityThreat,
  SecurityConfig,
} from './security-types.js';
import type { IDNSRecord as DNSRecord } from '../types/index.js';

export interface ThreatRule {
  id: string;
  name: string;
  description: string;
  type: SecurityThreat['type'];
  severity: SecurityThreat['severity'];
  enabled: boolean;
  conditions: ThreatCondition[];
  actions: ThreatAction[];
  metadata: {
    author: string;
    version: string;
    created: Date;
    lastModified: Date;
    tags: string[];
  };
}

export interface ThreatCondition {
  field: 'domain' | 'record_type' | 'record_value' | 'ttl' | 'ip_address';
  operator: 'equals' | 'contains' | 'matches' | 'startswith' | 'endswith' | 'gt' | 'lt' | 'in';
  value: string | number | string[];
  caseSensitive?: boolean;
}

export interface ThreatAction {
  type: 'alert' | 'block' | 'log' | 'quarantine' | 'notify';
  parameters: Record<string, unknown>;
}

export interface RuleEvaluationResult {
  ruleId: string;
  matched: boolean;
  confidence: number;
  matchedConditions: number;
  totalConditions: number;
  executedActions: string[];
}

export class DNSThreatRules extends EventEmitter {
  private logger: Logger;
  private rules: Map<string, ThreatRule>;
  private config: SecurityConfig;

  constructor(logger?: Logger, config?: SecurityConfig) {
    super();
    this.logger = logger || new Logger({ verbose: false });
    this.rules = new Map();
    this.config = config || this.getDefaultConfig();
    
    this.loadDefaultRules();
  }

  /**
   * ルールの追加
   */
  addRule(rule: ThreatRule): void {
    try {
      this.rules.set(rule.id, rule);
      this.emit('rule-added', rule);
      this.logger.info('脅威検出ルールを追加しました', {
        ruleId: rule.id,
        name: rule.name,
        type: rule.type,
      });
    } catch (error) {
      this.logger.error('ルール追加エラー', error as Error);
      throw error;
    }
  }

  /**
   * ルールの削除
   */
  removeRule(ruleId: string): boolean {
    try {
      const deleted = this.rules.delete(ruleId);
      if (deleted) {
        this.emit('rule-removed', { ruleId });
        this.logger.info('脅威検出ルールを削除しました', { ruleId });
      }
      return deleted;
    } catch (error) {
      this.logger.error('ルール削除エラー', error as Error);
      throw error;
    }
  }

  /**
   * ルールの更新
   */
  updateRule(ruleId: string, updates: Partial<ThreatRule>): boolean {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule) {
        return false;
      }

      const updatedRule = {
        ...rule,
        ...updates,
        metadata: {
          ...rule.metadata,
          lastModified: new Date(),
        },
      };

      this.rules.set(ruleId, updatedRule);
      this.emit('rule-updated', { ruleId, updates });
      this.logger.info('脅威検出ルールを更新しました', { ruleId });
      return true;
    } catch (error) {
      this.logger.error('ルール更新エラー', error as Error);
      throw error;
    }
  }

  /**
   * ルールの有効/無効切り替え
   */
  toggleRule(ruleId: string, enabled: boolean): boolean {
    return this.updateRule(ruleId, { enabled });
  }

  /**
   * ルールの取得
   */
  getRule(ruleId: string): ThreatRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * 全ルールの取得
   */
  getAllRules(): ThreatRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 有効なルールの取得
   */
  getEnabledRules(): ThreatRule[] {
    return this.getAllRules().filter(rule => rule.enabled);
  }

  /**
   * タイプ別ルールの取得
   */
  getRulesByType(type: SecurityThreat['type']): ThreatRule[] {
    return this.getAllRules().filter(rule => rule.type === type);
  }

  /**
   * ドメインに対するルール評価
   */
  async evaluateRules(
    domain: string,
    records: DNSRecord[]
  ): Promise<RuleEvaluationResult[]> {
    try {
      this.logger.debug('ルール評価開始', { domain, rulesCount: this.rules.size });

      const enabledRules = this.getEnabledRules();
      const results: RuleEvaluationResult[] = [];

      for (const rule of enabledRules) {
        const result = await this.evaluateRule(rule, domain, records);
        results.push(result);

        if (result.matched) {
          this.logger.debug('ルールマッチ', {
            ruleId: rule.id,
            ruleName: rule.name,
            domain,
            confidence: result.confidence,
          });

          // アクションの実行
          await this.executeActions(rule, domain, records);
        }
      }

      this.logger.debug('ルール評価完了', {
        domain,
        totalRules: enabledRules.length,
        matchedRules: results.filter(r => r.matched).length,
      });

      return results;
    } catch (error) {
      this.logger.error('ルール評価エラー', error as Error);
      throw error;
    }
  }

  /**
   * 単一ルールの評価
   */
  private async evaluateRule(
    rule: ThreatRule,
    domain: string,
    records: DNSRecord[]
  ): Promise<RuleEvaluationResult> {
    let matchedConditions = 0;
    const totalConditions = rule.conditions.length;

    for (const condition of rule.conditions) {
      const matched = this.evaluateCondition(condition, domain, records);
      if (matched) {
        matchedConditions++;
      }
    }

    const matched = matchedConditions === totalConditions;
    const confidence = totalConditions > 0 ? (matchedConditions / totalConditions) : 0;

    const result: RuleEvaluationResult = {
      ruleId: rule.id,
      matched,
      confidence,
      matchedConditions,
      totalConditions,
      executedActions: [],
    };

    return result;
  }

  /**
   * 条件の評価
   */
  private evaluateCondition(
    condition: ThreatCondition,
    domain: string,
    records: DNSRecord[]
  ): boolean {
    try {
      const { field, operator, value, caseSensitive = false } = condition;

      switch (field) {
        case 'domain':
          return this.evaluateStringCondition(domain, operator, value as string, caseSensitive);
        
        case 'record_type':
          return records.some(record => 
            this.evaluateStringCondition(record.type, operator, value as string, caseSensitive)
          );
        
        case 'record_value':
          return records.some(record => 
            this.evaluateStringCondition(record.value, operator, value as string, caseSensitive)
          );
        
        case 'ttl':
          return records.some(record => 
            this.evaluateNumericCondition(record.ttl, operator, value as number)
          );
        
        case 'ip_address':
          return records.some(record => {
            if (record.type === 'A' || record.type === 'AAAA') {
              return this.evaluateStringCondition(record.value, operator, value as string, caseSensitive);
            }
            return false;
          });

        default:
          this.logger.warn('未知の条件フィールド', { field });
          return false;
      }
    } catch (error) {
      this.logger.error('条件評価エラー', error as Error);
      return false;
    }
  }

  /**
   * 文字列条件の評価
   */
  private evaluateStringCondition(
    fieldValue: string,
    operator: ThreatCondition['operator'],
    conditionValue: string | string[],
    caseSensitive: boolean
  ): boolean {
    const field = caseSensitive ? fieldValue : fieldValue.toLowerCase();
    
    switch (operator) {
      case 'equals':
        const value = caseSensitive ? conditionValue as string : (conditionValue as string).toLowerCase();
        return field === value;
      
      case 'contains':
        const containsValue = caseSensitive ? conditionValue as string : (conditionValue as string).toLowerCase();
        return field.includes(containsValue);
      
      case 'startswith':
        const startsValue = caseSensitive ? conditionValue as string : (conditionValue as string).toLowerCase();
        return field.startsWith(startsValue);
      
      case 'endswith':
        const endsValue = caseSensitive ? conditionValue as string : (conditionValue as string).toLowerCase();
        return field.endsWith(endsValue);
      
      case 'matches':
        try {
          const regex = new RegExp(conditionValue as string, caseSensitive ? '' : 'i');
          return regex.test(field);
        } catch {
          return false;
        }
      
      case 'in':
        const arrayValue = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        const compareArray = caseSensitive ? arrayValue : arrayValue.map(v => v.toLowerCase());
        return compareArray.includes(field);
      
      default:
        return false;
    }
  }

  /**
   * 数値条件の評価
   */
  private evaluateNumericCondition(
    fieldValue: number,
    operator: ThreatCondition['operator'],
    conditionValue: number
  ): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'gt':
        return fieldValue > conditionValue;
      case 'lt':
        return fieldValue < conditionValue;
      default:
        return false;
    }
  }

  /**
   * アクションの実行
   */
  private async executeActions(
    rule: ThreatRule,
    domain: string,
    records: DNSRecord[]
  ): Promise<string[]> {
    const executedActions: string[] = [];

    for (const action of rule.actions) {
      try {
        await this.executeAction(action, rule, domain, records);
        executedActions.push(action.type);
      } catch (error) {
        this.logger.error('アクション実行エラー', error as Error);
      }
    }

    return executedActions;
  }

  /**
   * 単一アクションの実行
   */
  private async executeAction(
    action: ThreatAction,
    rule: ThreatRule,
    domain: string,
    _records: DNSRecord[]
  ): Promise<void> {
    switch (action.type) {
      case 'alert':
        this.emit('threat-alert', {
          ruleId: rule.id,
          ruleName: rule.name,
          domain,
          severity: rule.severity,
          type: rule.type,
          parameters: action.parameters,
        });
        break;

      case 'log':
        this.logger.warn('脅威検出', {
          ruleId: rule.id,
          ruleName: rule.name,
          domain,
          severity: rule.severity,
          type: rule.type,
        });
        break;

      case 'block':
        this.emit('threat-block', {
          ruleId: rule.id,
          domain,
          action: 'block',
          parameters: action.parameters,
        });
        break;

      case 'quarantine':
        this.emit('threat-quarantine', {
          ruleId: rule.id,
          domain,
          action: 'quarantine',
          parameters: action.parameters,
        });
        break;

      case 'notify':
        this.emit('threat-notification', {
          ruleId: rule.id,
          ruleName: rule.name,
          domain,
          severity: rule.severity,
          parameters: action.parameters,
        });
        break;

      default:
        this.logger.warn('未知のアクションタイプ', { actionType: action.type });
    }
  }

  /**
   * デフォルトルールの読み込み
   */
  private loadDefaultRules(): void {
    const defaultRules: ThreatRule[] = [
      {
        id: 'malware-suspicious-domain',
        name: 'Suspicious Malware Domain',
        description: 'Detects domains with malware-like characteristics',
        type: 'malware',
        severity: 'high',
        enabled: true,
        conditions: [
          {
            field: 'domain',
            operator: 'matches',
            value: '.*\\.tk$|.*\\.ml$|.*\\.ga$|.*\\.cf$', // 無料ドメイン
          },
        ],
        actions: [
          { type: 'alert', parameters: {} },
          { type: 'log', parameters: {} },
        ],
        metadata: {
          author: 'DNSweeper',
          version: '1.0',
          created: new Date(),
          lastModified: new Date(),
          tags: ['malware', 'suspicious-tld'],
        },
      },
      {
        id: 'phishing-lookalike',
        name: 'Phishing Lookalike Domain',
        description: 'Detects domains that look like popular services',
        type: 'phishing',
        severity: 'critical',
        enabled: true,
        conditions: [
          {
            field: 'domain',
            operator: 'matches',
            value: '.*(paypal|amazon|google|microsoft|apple).*\\.(tk|ml|ga|cf|click|loan)$',
          },
        ],
        actions: [
          { type: 'alert', parameters: { priority: 'high' } },
          { type: 'block', parameters: {} },
          { type: 'log', parameters: {} },
        ],
        metadata: {
          author: 'DNSweeper',
          version: '1.0',
          created: new Date(),
          lastModified: new Date(),
          tags: ['phishing', 'lookalike'],
        },
      },
      {
        id: 'dga-long-random',
        name: 'DGA Long Random Domain',
        description: 'Detects long randomized domain names typical of DGA',
        type: 'dga',
        severity: 'medium',
        enabled: true,
        conditions: [
          {
            field: 'domain',
            operator: 'matches',
            value: '^[a-z0-9]{20,}\\.[a-z]{2,}$', // 20文字以上のランダム文字列
          },
        ],
        actions: [
          { type: 'alert', parameters: {} },
          { type: 'log', parameters: {} },
        ],
        metadata: {
          author: 'DNSweeper',
          version: '1.0',
          created: new Date(),
          lastModified: new Date(),
          tags: ['dga', 'random'],
        },
      },
      {
        id: 'fastflux-low-ttl',
        name: 'Fast Flux Low TTL',
        description: 'Detects domains with suspiciously low TTL values',
        type: 'fastflux',
        severity: 'medium',
        enabled: true,
        conditions: [
          {
            field: 'ttl',
            operator: 'lt',
            value: 300, // 5分未満のTTL
          },
          {
            field: 'record_type',
            operator: 'equals',
            value: 'A',
          },
        ],
        actions: [
          { type: 'alert', parameters: {} },
          { type: 'log', parameters: {} },
        ],
        metadata: {
          author: 'DNSweeper',
          version: '1.0',
          created: new Date(),
          lastModified: new Date(),
          tags: ['fastflux', 'low-ttl'],
        },
      },
    ];

    defaultRules.forEach(rule => {
      this.addRule(rule);
    });

    this.logger.info('デフォルト脅威検出ルールを読み込みました', {
      rulesCount: defaultRules.length,
    });
  }

  /**
   * デフォルト設定の取得
   */
  private getDefaultConfig(): SecurityConfig {
    return {
      threatDetection: {
        enabledAnalyzers: [
          'malware',
          'phishing',
          'typosquatting',
          'dga',
          'fastflux',
          'dns_hijacking',
          'cache_poisoning',
        ],
        confidence: {
          minimum: 0.7,
          malware: 0.8,
          phishing: 0.9,
          typosquatting: 0.6,
          dga: 0.7,
          fastflux: 0.8,
          dns_hijacking: 0.9,
          cache_poisoning: 0.9,
        },
      },
      monitoring: {
        enabled: true,
        interval: 300000, // 5分
        alertThresholds: {
          critical: 1,
          high: 5,
          medium: 10,
          low: 20,
        },
      },
      response: {
        autoBlock: false,
        autoQuarantine: true,
        notificationEnabled: true,
        logLevel: 'info',
      },
    };
  }

  /**
   * ルール統計の取得
   */
  getRuleStatistics(): {
    totalRules: number;
    enabledRules: number;
    rulesByType: Record<string, number>;
    rulesBySeverity: Record<string, number>;
  } {
    const allRules = this.getAllRules();
    const enabledRules = this.getEnabledRules();

    const rulesByType: Record<string, number> = {};
    const rulesBySeverity: Record<string, number> = {};

    allRules.forEach(rule => {
      rulesByType[rule.type] = (rulesByType[rule.type] || 0) + 1;
      rulesBySeverity[rule.severity] = (rulesBySeverity[rule.severity] || 0) + 1;
    });

    return {
      totalRules: allRules.length,
      enabledRules: enabledRules.length,
      rulesByType,
      rulesBySeverity,
    };
  }
}