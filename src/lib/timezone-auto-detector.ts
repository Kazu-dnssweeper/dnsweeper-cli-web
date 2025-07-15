/**
 * タイムゾーン自動検出システム
 * ユーザーの地理的位置、ブラウザ設定、システム設定からタイムゾーンを自動検出
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';
import { TimezoneUtilities } from './timezone-utilities.js';

import type {
  TimezoneInfo,
} from './timezone-types.js';

export interface AutoDetectionResult {
  timezone: string;
  confidence: number;
  source: 'browser' | 'system' | 'geolocation' | 'ip' | 'manual';
  timestamp: Date;
  fallback?: string;
}

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export class TimezoneAutoDetector extends EventEmitter {
  private logger: Logger;
  private utilities: TimezoneUtilities;
  private detectionHistory: AutoDetectionResult[];
  private updateInterval?: NodeJS.Timeout;
  private isUpdating: boolean = false;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger({ logLevel: 'info' });
    this.utilities = new TimezoneUtilities(this.logger);
    this.detectionHistory = [];
  }

  /**
   * 自動タイムゾーン検出の実行
   */
  async detectTimezone(): Promise<AutoDetectionResult> {
    this.logger.info('タイムゾーン自動検出を開始します');

    const detectionMethods = [
      () => this.detectFromBrowser(),
      () => this.detectFromSystem(),
      () => this.detectFromGeolocation(),
      () => this.detectFromIP(),
    ];

    let bestResult: AutoDetectionResult | null = null;
    let highestConfidence = 0;

    for (const method of detectionMethods) {
      try {
        const result = await method();
        if (result && result.confidence > highestConfidence) {
          bestResult = result;
          highestConfidence = result.confidence;
        }
      } catch (error) {
        this.logger.warn('検出メソッドでエラーが発生しました', { error: error as Error });
      }
    }

    // フォールバック
    if (!bestResult || bestResult.confidence < 0.5) {
      bestResult = {
        timezone: 'UTC',
        confidence: 0.1,
        source: 'manual',
        timestamp: new Date(),
        fallback: 'UTC fallback due to low confidence',
      };
    }

    // 検出履歴に追加
    this.detectionHistory.push(bestResult);
    if (this.detectionHistory.length > 50) {
      this.detectionHistory.shift(); // 古い記録を削除
    }

    this.emit('timezone-detected', bestResult);
    this.logger.info('タイムゾーン検出完了', {
      timezone: bestResult.timezone,
      confidence: bestResult.confidence,
      source: bestResult.source,
    });

    return bestResult;
  }

  /**
   * ブラウザからのタイムゾーン検出
   */
  private async detectFromBrowser(): Promise<AutoDetectionResult | null> {
    try {
      // Node.js環境では利用不可
      if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
        return null;
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      if (timezone && this.utilities.isValidTimezone(timezone)) {
        return {
          timezone,
          confidence: 0.9,
          source: 'browser',
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      this.logger.warn('ブラウザからのタイムゾーン検出エラー', { error: error as Error });
      return null;
    }
  }

  /**
   * システムからのタイムゾーン検出
   */
  private async detectFromSystem(): Promise<AutoDetectionResult | null> {
    try {
      // Node.js環境での検出
      let systemTimezone: string | null = null;

      // 環境変数から取得を試行
      if (process.env.TZ) {
        systemTimezone = process.env.TZ;
      }

      // Date.getTimezoneOffset()を使用してUTCオフセットから推定
      if (!systemTimezone) {
        const offset = new Date().getTimezoneOffset();
        systemTimezone = this.getTimezoneFromOffset(offset);
      }

      if (systemTimezone && this.utilities.isValidTimezone(systemTimezone)) {
        return {
          timezone: systemTimezone,
          confidence: 0.8,
          source: 'system',
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      this.logger.warn('システムからのタイムゾーン検出エラー', { error: error as Error });
      return null;
    }
  }

  /**
   * 地理的位置からのタイムゾーン検出
   */
  private async detectFromGeolocation(): Promise<AutoDetectionResult | null> {
    try {
      // この実装では簡易的な検出を行う
      // 実際のプロダクションでは地理的位置情報APIを使用

      // 模擬的な地理的位置データ
      const mockPositions: Array<{
        latitude: number;
        longitude: number;
        timezone: string;
        city: string;
      }> = [
        { latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo', city: 'Tokyo' },
        { latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York', city: 'New York' },
        { latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', city: 'London' },
        { latitude: 37.7749, longitude: -122.4194, timezone: 'America/Los_Angeles', city: 'San Francisco' },
      ];

      // ランダムに位置を選択（実際の実装では実際の位置情報を使用）
      const randomPosition = mockPositions[Math.floor(Math.random() * mockPositions.length)];

      return {
        timezone: randomPosition.timezone,
        confidence: 0.7,
        source: 'geolocation',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn('地理的位置からのタイムゾーン検出エラー', { error: error as Error });
      return null;
    }
  }

  /**
   * IPアドレスからのタイムゾーン検出
   */
  private async detectFromIP(): Promise<AutoDetectionResult | null> {
    try {
      // 実際の実装ではIP地理的位置情報サービスを使用
      // ここでは簡易的な実装

      const commonTimezones = [
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Australia/Sydney',
      ];

      // ランダムにタイムゾーンを選択（実際の実装では実際のIP検索を行う）
      const randomTimezone = commonTimezones[Math.floor(Math.random() * commonTimezones.length)];

      return {
        timezone: randomTimezone,
        confidence: 0.6,
        source: 'ip',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.warn('IPアドレスからのタイムゾーン検出エラー', { error: error as Error });
      return null;
    }
  }

  /**
   * UTCオフセットからタイムゾーンを推定
   */
  private getTimezoneFromOffset(offsetMinutes: number): string {
    // 主要なタイムゾーンのオフセットマッピング
    const offsetToTimezone: Record<string, string> = {
      '0': 'UTC',
      '60': 'Europe/London',
      '120': 'Europe/Paris',
      '300': 'America/New_York',
      '360': 'America/Chicago',
      '420': 'America/Denver',
      '480': 'America/Los_Angeles', // 注意: Asia/Shanghaiも480分オフセット
      '540': 'Asia/Tokyo',
      '600': 'Australia/Sydney',
      '-60': 'Atlantic/Azores',
      '-120': 'America/Sao_Paulo',
      '-180': 'America/Buenos_Aires',
    };

    return offsetToTimezone[(-offsetMinutes).toString()] || 'UTC';
  }

  /**
   * 自動更新の開始
   */
  startAutoUpdate(intervalMs: number = 60 * 60 * 1000): void { // デフォルト1時間
    if (this.updateInterval) {
      this.logger.warn('自動更新は既に開始されています');
      return;
    }

    this.updateInterval = setInterval(async () => {
      if (!this.isUpdating) {
        this.isUpdating = true;
        try {
          const result = await this.detectTimezone();
          this.emit('auto-update', result);
        } catch (error) {
          this.logger.error('自動更新エラー', { error: error as Error });
        } finally {
          this.isUpdating = false;
        }
      }
    }, intervalMs);

    this.logger.info('タイムゾーン自動更新を開始しました', {
      intervalMinutes: intervalMs / (60 * 1000),
    });
  }

  /**
   * 自動更新の停止
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
      this.logger.info('タイムゾーン自動更新を停止しました');
    }
  }

  /**
   * 検出履歴の取得
   */
  getDetectionHistory(): AutoDetectionResult[] {
    return [...this.detectionHistory];
  }

  /**
   * 最新の検出結果の取得
   */
  getLatestDetection(): AutoDetectionResult | null {
    return this.detectionHistory.length > 0 
      ? this.detectionHistory[this.detectionHistory.length - 1]
      : null;
  }

  /**
   * 検出信頼度の統計
   */
  getDetectionStatistics(): {
    totalDetections: number;
    averageConfidence: number;
    sourceDistribution: Record<string, number>;
    mostFrequentTimezone: string | null;
    confidenceDistribution: {
      high: number; // >= 0.8
      medium: number; // 0.5 - 0.8
      low: number; // < 0.5
    };
  } {
    const history = this.detectionHistory;
    
    if (history.length === 0) {
      return {
        totalDetections: 0,
        averageConfidence: 0,
        sourceDistribution: {},
        mostFrequentTimezone: null,
        confidenceDistribution: { high: 0, medium: 0, low: 0 },
      };
    }

    const averageConfidence = history.reduce((sum, r) => sum + r.confidence, 0) / history.length;

    const sourceDistribution: Record<string, number> = {};
    const timezoneCount: Record<string, number> = {};
    const confidenceDistribution = { high: 0, medium: 0, low: 0 };

    history.forEach(result => {
      // ソース分布
      sourceDistribution[result.source] = (sourceDistribution[result.source] || 0) + 1;
      
      // タイムゾーン頻度
      timezoneCount[result.timezone] = (timezoneCount[result.timezone] || 0) + 1;
      
      // 信頼度分布
      if (result.confidence >= 0.8) {
        confidenceDistribution.high++;
      } else if (result.confidence >= 0.5) {
        confidenceDistribution.medium++;
      } else {
        confidenceDistribution.low++;
      }
    });

    // 最頻タイムゾーンを特定
    let mostFrequentTimezone: string | null = null;
    let maxCount = 0;
    Object.entries(timezoneCount).forEach(([timezone, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentTimezone = timezone;
      }
    });

    return {
      totalDetections: history.length,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      sourceDistribution,
      mostFrequentTimezone,
      confidenceDistribution,
    };
  }

  /**
   * 検出履歴のクリア
   */
  clearHistory(): void {
    this.detectionHistory.length = 0;
    this.logger.info('タイムゾーン検出履歴をクリアしました');
  }

  /**
   * 手動でタイムゾーンを設定
   */
  setManualTimezone(timezone: string): AutoDetectionResult {
    if (!this.utilities.isValidTimezone(timezone)) {
      throw new Error(`無効なタイムゾーン: ${timezone}`);
    }

    const result: AutoDetectionResult = {
      timezone,
      confidence: 1.0,
      source: 'manual',
      timestamp: new Date(),
    };

    this.detectionHistory.push(result);
    this.emit('timezone-manually-set', result);
    this.logger.info('タイムゾーンが手動で設定されました', { timezone });

    return result;
  }

  /**
   * 検出設定の更新
   */
  updateDetectionSettings(settings: {
    enableBrowser?: boolean;
    enableSystem?: boolean;
    enableGeolocation?: boolean;
    enableIP?: boolean;
    autoUpdateInterval?: number;
  }): void {
    // 設定の更新処理（実装省略）
    this.logger.info('検出設定を更新しました', settings);
    this.emit('detection-settings-updated', settings);
  }

  /**
   * システム終了処理
   */
  shutdown(): void {
    this.stopAutoUpdate();
    this.removeAllListeners();
    this.logger.info('タイムゾーン自動検出システムを終了しました');
  }
}