/**
 * タイムゾーン検出・情報管理システム
 *
 * タイムゾーンの自動検出、DST判定、オフセット計算機能
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type { TimezoneInfo } from './timezone-types.js';

export class TimezoneDetector extends EventEmitter {
  private logger: Logger;
  private timezoneCache: Map<string, TimezoneInfo>;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger({ logLevel: 'info' });
    this.timezoneCache = new Map();
    this.initializeTimezones();
  }

  /**
   * タイムゾーン情報の初期化
   */
  private initializeTimezones(): void {
    const timezones: TimezoneInfo[] = [
      // 北アメリカ
      {
        timezone: 'America/New_York',
        offset: -5,
        abbreviation: 'EST',
        isDST: false,
        dstOffset: -4,
        region: 'North America',
        country: 'United States',
        city: 'New York',
        utcOffset: 'UTC-5',
      },
      {
        timezone: 'America/Chicago',
        offset: -6,
        abbreviation: 'CST',
        isDST: false,
        dstOffset: -5,
        region: 'North America',
        country: 'United States',
        city: 'Chicago',
        utcOffset: 'UTC-6',
      },
      {
        timezone: 'America/Denver',
        offset: -7,
        abbreviation: 'MST',
        isDST: false,
        dstOffset: -6,
        region: 'North America',
        country: 'United States',
        city: 'Denver',
        utcOffset: 'UTC-7',
      },
      {
        timezone: 'America/Los_Angeles',
        offset: -8,
        abbreviation: 'PST',
        isDST: false,
        dstOffset: -7,
        region: 'North America',
        country: 'United States',
        city: 'Los Angeles',
        utcOffset: 'UTC-8',
      },
      {
        timezone: 'America/Toronto',
        offset: -5,
        abbreviation: 'EST',
        isDST: false,
        dstOffset: -4,
        region: 'North America',
        country: 'Canada',
        city: 'Toronto',
        utcOffset: 'UTC-5',
      },

      // ヨーロッパ
      {
        timezone: 'Europe/London',
        offset: 0,
        abbreviation: 'GMT',
        isDST: false,
        dstOffset: 1,
        region: 'Europe',
        country: 'United Kingdom',
        city: 'London',
        utcOffset: 'UTC+0',
      },
      {
        timezone: 'Europe/Paris',
        offset: 1,
        abbreviation: 'CET',
        isDST: false,
        dstOffset: 2,
        region: 'Europe',
        country: 'France',
        city: 'Paris',
        utcOffset: 'UTC+1',
      },
      {
        timezone: 'Europe/Berlin',
        offset: 1,
        abbreviation: 'CET',
        isDST: false,
        dstOffset: 2,
        region: 'Europe',
        country: 'Germany',
        city: 'Berlin',
        utcOffset: 'UTC+1',
      },
      {
        timezone: 'Europe/Rome',
        offset: 1,
        abbreviation: 'CET',
        isDST: false,
        dstOffset: 2,
        region: 'Europe',
        country: 'Italy',
        city: 'Rome',
        utcOffset: 'UTC+1',
      },
      {
        timezone: 'Europe/Stockholm',
        offset: 1,
        abbreviation: 'CET',
        isDST: false,
        dstOffset: 2,
        region: 'Europe',
        country: 'Sweden',
        city: 'Stockholm',
        utcOffset: 'UTC+1',
      },

      // アジア太平洋
      {
        timezone: 'Asia/Tokyo',
        offset: 9,
        abbreviation: 'JST',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Japan',
        city: 'Tokyo',
        utcOffset: 'UTC+9',
      },
      {
        timezone: 'Asia/Shanghai',
        offset: 8,
        abbreviation: 'CST',
        isDST: false,
        region: 'Asia Pacific',
        country: 'China',
        city: 'Shanghai',
        utcOffset: 'UTC+8',
      },
      {
        timezone: 'Asia/Singapore',
        offset: 8,
        abbreviation: 'SGT',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Singapore',
        city: 'Singapore',
        utcOffset: 'UTC+8',
      },
      {
        timezone: 'Asia/Hong_Kong',
        offset: 8,
        abbreviation: 'HKT',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Hong Kong',
        city: 'Hong Kong',
        utcOffset: 'UTC+8',
      },
      {
        timezone: 'Asia/Seoul',
        offset: 9,
        abbreviation: 'KST',
        isDST: false,
        region: 'Asia Pacific',
        country: 'South Korea',
        city: 'Seoul',
        utcOffset: 'UTC+9',
      },
      {
        timezone: 'Asia/Mumbai',
        offset: 5.5,
        abbreviation: 'IST',
        isDST: false,
        region: 'Asia Pacific',
        country: 'India',
        city: 'Mumbai',
        utcOffset: 'UTC+5:30',
      },
      {
        timezone: 'Asia/Bangkok',
        offset: 7,
        abbreviation: 'ICT',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Thailand',
        city: 'Bangkok',
        utcOffset: 'UTC+7',
      },
      {
        timezone: 'Asia/Jakarta',
        offset: 7,
        abbreviation: 'WIB',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Indonesia',
        city: 'Jakarta',
        utcOffset: 'UTC+7',
      },
      {
        timezone: 'Asia/Manila',
        offset: 8,
        abbreviation: 'PHT',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Philippines',
        city: 'Manila',
        utcOffset: 'UTC+8',
      },

      // オセアニア
      {
        timezone: 'Australia/Sydney',
        offset: 10,
        abbreviation: 'AEST',
        isDST: false,
        dstOffset: 11,
        region: 'Oceania',
        country: 'Australia',
        city: 'Sydney',
        utcOffset: 'UTC+10',
      },
      {
        timezone: 'Australia/Melbourne',
        offset: 10,
        abbreviation: 'AEST',
        isDST: false,
        dstOffset: 11,
        region: 'Oceania',
        country: 'Australia',
        city: 'Melbourne',
        utcOffset: 'UTC+10',
      },
      {
        timezone: 'Pacific/Auckland',
        offset: 12,
        abbreviation: 'NZST',
        isDST: false,
        dstOffset: 13,
        region: 'Oceania',
        country: 'New Zealand',
        city: 'Auckland',
        utcOffset: 'UTC+12',
      },

      // 中東・アフリカ
      {
        timezone: 'Asia/Dubai',
        offset: 4,
        abbreviation: 'GST',
        isDST: false,
        region: 'Middle East',
        country: 'United Arab Emirates',
        city: 'Dubai',
        utcOffset: 'UTC+4',
      },
      {
        timezone: 'Asia/Riyadh',
        offset: 3,
        abbreviation: 'AST',
        isDST: false,
        region: 'Middle East',
        country: 'Saudi Arabia',
        city: 'Riyadh',
        utcOffset: 'UTC+3',
      },
      {
        timezone: 'Asia/Jerusalem',
        offset: 2,
        abbreviation: 'IST',
        isDST: false,
        dstOffset: 3,
        region: 'Middle East',
        country: 'Israel',
        city: 'Jerusalem',
        utcOffset: 'UTC+2',
      },

      // 南米
      {
        timezone: 'America/Sao_Paulo',
        offset: -3,
        abbreviation: 'BRT',
        isDST: false,
        dstOffset: -2,
        region: 'South America',
        country: 'Brazil',
        city: 'São Paulo',
        utcOffset: 'UTC-3',
      },
      {
        timezone: 'America/Argentina/Buenos_Aires',
        offset: -3,
        abbreviation: 'ART',
        isDST: false,
        region: 'South America',
        country: 'Argentina',
        city: 'Buenos Aires',
        utcOffset: 'UTC-3',
      },
      {
        timezone: 'America/Mexico_City',
        offset: -6,
        abbreviation: 'CST',
        isDST: false,
        dstOffset: -5,
        region: 'North America',
        country: 'Mexico',
        city: 'Mexico City',
        utcOffset: 'UTC-6',
      },

      // グローバル
      {
        timezone: 'UTC',
        offset: 0,
        abbreviation: 'UTC',
        isDST: false,
        region: 'Global',
        country: 'Global',
        city: 'UTC',
        utcOffset: 'UTC+0',
      },
    ];

    timezones.forEach(timezone => {
      this.timezoneCache.set(timezone.timezone, timezone);
    });

    this.logger.info('タイムゾーン情報初期化完了', {
      count: timezones.length,
    });
  }

  /**
   * タイムゾーンの自動検出
   */
  detectTimezone(): string | null {
    try {
      // ブラウザ環境での検出
      if (typeof globalThis !== 'undefined' && globalThis.Intl) {
        const detectedTimezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (this.timezoneCache.has(detectedTimezone)) {
          this.logger.info(`タイムゾーン自動検出: ${detectedTimezone}`);
          this.emit('timezone-detected', {
            timezone: detectedTimezone,
            method: 'browser',
          });
          return detectedTimezone;
        }
      }

      // Node.js環境での検出
      if (typeof process !== 'undefined' && process.env.TZ) {
        const envTimezone = process.env.TZ;
        if (this.timezoneCache.has(envTimezone)) {
          this.logger.info(`環境変数からタイムゾーン検出: ${envTimezone}`);
          this.emit('timezone-detected', {
            timezone: envTimezone,
            method: 'environment',
          });
          return envTimezone;
        }
      }

      return null;
    } catch (error) {
      this.logger.error(
        'タイムゾーン検出エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * DST状態の判定
   */
  isDSTActive(date: Date, timezone: string): boolean {
    try {
      const timezoneInfo = this.timezoneCache.get(timezone);
      if (!timezoneInfo || timezoneInfo.dstOffset === undefined) {
        return false;
      }

      // 簡易的なDST判定（実際の実装では詳細なルールが必要）
      const dateInTimezone = new Date(
        date.toLocaleString('en-US', { timeZone: timezone })
      );
      const januaryOffset = this.getTimezoneOffsetForDate(
        new Date(dateInTimezone.getFullYear(), 0, 1),
        timezone
      );
      const julyOffset = this.getTimezoneOffsetForDate(
        new Date(dateInTimezone.getFullYear(), 6, 1),
        timezone
      );
      const currentOffset = this.getTimezoneOffsetForDate(date, timezone);

      return currentOffset !== Math.max(januaryOffset, julyOffset);
    } catch (error) {
      this.logger.error(
        'DST判定エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * 特定日付のタイムゾーンオフセット取得
   */
  private getTimezoneOffsetForDate(date: Date, timezone: string): number {
    try {
      const utcDate = new Date(date.toISOString());
      const timezoneDate = new Date(
        date.toLocaleString('en-US', { timeZone: timezone })
      );
      return (utcDate.getTime() - timezoneDate.getTime()) / (1000 * 60);
    } catch (error) {
      this.logger.error(
        'タイムゾーンオフセット計算エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return 0;
    }
  }

  /**
   * タイムゾーンオフセット取得
   */
  getTimezoneOffset(date: Date, timezone: string): number {
    try {
      const localDate = new Date(
        date.toLocaleString('en-US', { timeZone: 'UTC' })
      );
      const timezoneDate = new Date(
        date.toLocaleString('en-US', { timeZone: timezone })
      );
      return (timezoneDate.getTime() - localDate.getTime()) / (1000 * 60);
    } catch (error) {
      this.logger.error(
        'タイムゾーンオフセット取得エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return 0;
    }
  }

  /**
   * DST状態の更新
   */
  updateDSTStatus(): void {
    this.timezoneCache.forEach((timezoneInfo, timezone) => {
      if (timezoneInfo.dstOffset !== undefined) {
        const now = new Date();
        const isDST = this.isDSTActive(now, timezone);

        if (timezoneInfo.isDST !== isDST) {
          timezoneInfo.isDST = isDST;
          this.logger.info(
            `DST状態更新: ${timezone} -> ${isDST ? 'DST' : 'Standard'}`
          );
          this.emit('dst-status-updated', { timezone, isDST });
        }
      }
    });
  }

  /**
   * タイムゾーン変換
   */
  convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    try {
      // 元のタイムゾーンでの時刻文字列を取得
      const dateStr = date.toLocaleString('en-US', { timeZone: fromTimezone });

      // 対象タイムゾーンでのDateオブジェクトを作成
      const convertedDate = new Date(dateStr);

      // タイムゾーンオフセットを調整
      const fromOffset = this.getTimezoneOffset(date, fromTimezone);
      const toOffset = this.getTimezoneOffset(date, toTimezone);
      const offsetDiff = (toOffset - fromOffset) * 60 * 1000;

      return new Date(convertedDate.getTime() + offsetDiff);
    } catch (error) {
      this.logger.error(
        'タイムゾーン変換エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return date;
    }
  }

  /**
   * APIメソッド
   */
  getTimezoneInfo(timezone: string): TimezoneInfo | undefined {
    return this.timezoneCache.get(timezone);
  }

  getAllTimezones(): TimezoneInfo[] {
    return Array.from(this.timezoneCache.values());
  }

  hasTimezone(timezone: string): boolean {
    return this.timezoneCache.has(timezone);
  }

  getTimezonesByRegion(region: string): TimezoneInfo[] {
    return Array.from(this.timezoneCache.values()).filter(
      tz => tz.region === region
    );
  }

  getTimezonesByCountry(country: string): TimezoneInfo[] {
    return Array.from(this.timezoneCache.values()).filter(
      tz => tz.country === country
    );
  }
}
