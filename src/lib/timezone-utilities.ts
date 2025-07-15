/**
 * タイムゾーン変換ユーティリティ
 * タイムゾーン変換、計算、検証の共通機能を提供
 */

import { Logger } from './logger.js';

import type { TimezoneInfo } from './timezone-types.js';

export class TimezoneUtilities {
  private logger: Logger;
  private timezoneCache: Map<string, TimezoneInfo>;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ logLevel: 'info' });
    this.timezoneCache = new Map();
  }

  /**
   * タイムゾーン間の時差を計算
   */
  getTimezoneOffset(
    fromTimezone: string,
    toTimezone: string,
    date: Date = new Date()
  ): number {
    try {
      const fromOffset = this.getTimezoneOffsetMinutes(fromTimezone, date);
      const toOffset = this.getTimezoneOffsetMinutes(toTimezone, date);
      return toOffset - fromOffset; // 分単位
    } catch (error) {
      this.logger.error('タイムゾーンオフセット計算エラー', error as Error);
      return 0;
    }
  }

  /**
   * 特定タイムゾーンのUTCオフセットを取得（分単位）
   */
  getTimezoneOffsetMinutes(timezone: string, date: Date = new Date()): number {
    try {
      // DateTimeFormatを使用してタイムゾーンオフセットを計算
      const utcDate = new Date(
        date.toLocaleString('en-US', { timeZone: 'UTC' })
      );
      const tzDate = new Date(
        date.toLocaleString('en-US', { timeZone: timezone })
      );
      return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
    } catch (error) {
      this.logger.warn(`タイムゾーン ${timezone} のオフセット取得失敗`, {
        error: error as Error,
      });
      return 0;
    }
  }

  /**
   * 日付をタイムゾーン間で変換
   */
  convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    try {
      const offset = this.getTimezoneOffset(fromTimezone, toTimezone, date);
      const convertedDate = new Date(date.getTime() + offset * 60 * 1000);

      this.logger.debug('タイムゾーン変換', {
        original: date.toISOString(),
        from: fromTimezone,
        to: toTimezone,
        offset,
        converted: convertedDate.toISOString(),
      });

      return convertedDate;
    } catch (error) {
      this.logger.error('タイムゾーン変換エラー', error as Error);
      return date;
    }
  }

  /**
   * タイムゾーンの有効性を検証
   */
  isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * サポートされているタイムゾーンの一覧を取得
   */
  getSupportedTimezones(): string[] {
    // 主要なタイムゾーンのリスト
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'America/Vancouver',
      'America/Mexico_City',
      'America/Sao_Paulo',
      'America/Buenos_Aires',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Rome',
      'Europe/Madrid',
      'Europe/Amsterdam',
      'Europe/Stockholm',
      'Europe/Warsaw',
      'Europe/Moscow',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Asia/Shanghai',
      'Asia/Hong_Kong',
      'Asia/Singapore',
      'Asia/Bangkok',
      'Asia/Mumbai',
      'Asia/Dubai',
      'Asia/Jerusalem',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Perth',
      'Pacific/Auckland',
    ];
  }

  /**
   * タイムゾーン名の正規化
   */
  normalizeTimezoneName(timezone: string): string {
    // 一般的なエイリアスを正規名に変換
    const aliases: Record<string, string> = {
      EST: 'America/New_York',
      PST: 'America/Los_Angeles',
      CST: 'America/Chicago',
      MST: 'America/Denver',
      JST: 'Asia/Tokyo',
      GMT: 'UTC',
      BST: 'Europe/London',
      CET: 'Europe/Paris',
      EET: 'Europe/Helsinki',
    };

    return aliases[timezone.toUpperCase()] || timezone;
  }

  /**
   * タイムゾーン情報の取得（キャッシュ機能付き）
   */
  getTimezoneInfo(timezone: string): TimezoneInfo | null {
    const normalizedTz = this.normalizeTimezoneName(timezone);

    // キャッシュから取得
    if (this.timezoneCache.has(normalizedTz)) {
      return this.timezoneCache.get(normalizedTz)!;
    }

    try {
      const now = new Date();
      const offset = this.getTimezoneOffsetMinutes(normalizedTz, now);

      // DST（夏時間）の検出
      const winter = new Date(now.getFullYear(), 0, 1);
      const summer = new Date(now.getFullYear(), 6, 1);
      const winterOffset = this.getTimezoneOffsetMinutes(normalizedTz, winter);
      const summerOffset = this.getTimezoneOffsetMinutes(normalizedTz, summer);
      const supportsDST = winterOffset !== summerOffset;

      const info: TimezoneInfo = {
        timezone: normalizedTz,
        offset,
        region: this.getTimezoneRegion(normalizedTz),
        country: this.getTimezoneCountry(normalizedTz),
        city: this.getTimezoneCity(normalizedTz),
        utcOffset: this.formatUtcOffset(offset),
        abbreviation: this.getTimezoneAbbreviation(normalizedTz, now),
        supportsDST,
        isDST: supportsDST && offset === Math.max(winterOffset, summerOffset),
      };

      // キャッシュに保存（1時間後に期限切れ）
      this.timezoneCache.set(normalizedTz, info);
      setTimeout(
        () => {
          this.timezoneCache.delete(normalizedTz);
        },
        60 * 60 * 1000
      );

      return info;
    } catch (error) {
      this.logger.error(`タイムゾーン情報取得エラー: ${normalizedTz}`, {
        error: error as Error,
      });
      return null;
    }
  }

  /**
   * タイムゾーンの表示名を取得
   */
  private getTimezoneDisplayName(timezone: string): string {
    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
      // タイムゾーン名から地域を抽出
      const parts = timezone.split('/');
      if (parts.length > 1) {
        const region = parts[1].replace(/_/g, ' ');
        return region;
      }
      return timezone;
    } catch {
      return timezone;
    }
  }

  /**
   * タイムゾーンの略称を取得
   */
  private getTimezoneAbbreviation(timezone: string, date: Date): string {
    try {
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        timeZoneName: 'short',
      });

      const parts = formatter.formatToParts(date);
      const timeZonePart = parts.find(part => part.type === 'timeZoneName');
      return timeZonePart?.value || '';
    } catch {
      return '';
    }
  }

  /**
   * 現在時刻を複数のタイムゾーンで取得
   */
  getCurrentTimeInTimezones(timezones: string[]): Array<{
    timezone: string;
    time: Date;
    formatted: string;
    offset: number;
  }> {
    const now = new Date();

    return timezones.map(tz => {
      const normalizedTz = this.normalizeTimezoneName(tz);
      const offset = this.getTimezoneOffsetMinutes(normalizedTz, now);
      const time = new Date(now.getTime() + offset * 60 * 1000);

      return {
        timezone: normalizedTz,
        time,
        formatted: time.toLocaleString('en-US', {
          timeZone: normalizedTz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        offset,
      };
    });
  }

  /**
   * タイムゾーン変換の精度検証
   */
  validateConversion(
    originalDate: Date,
    fromTimezone: string,
    toTimezone: string,
    convertedDate: Date
  ): {
    isValid: boolean;
    expectedOffset: number;
    actualOffset: number;
    error?: string;
  } {
    try {
      const expectedOffset = this.getTimezoneOffset(
        fromTimezone,
        toTimezone,
        originalDate
      );
      const actualOffset =
        (convertedDate.getTime() - originalDate.getTime()) / (1000 * 60);
      const isValid = Math.abs(expectedOffset - actualOffset) < 1; // 1分の誤差まで許容

      return {
        isValid,
        expectedOffset,
        actualOffset,
      };
    } catch (error) {
      return {
        isValid: false,
        expectedOffset: 0,
        actualOffset: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 会議時間の最適化（複数タイムゾーンを考慮）
   */
  findOptimalMeetingTime(
    timezones: string[],
    businessHoursStart: number = 9, // 9 AM
    businessHoursEnd: number = 17, // 5 PM
    durationMinutes: number = 60
  ): Array<{
    utcTime: Date;
    timezoneDetails: Array<{
      timezone: string;
      localTime: string;
      isBusinessHours: boolean;
    }>;
  }> {
    const results: Array<{
      utcTime: Date;
      timezoneDetails: Array<{
        timezone: string;
        localTime: string;
        isBusinessHours: boolean;
      }>;
    }> = [];

    // 今日から7日間を検索
    const searchStart = new Date();
    const searchEnd = new Date(searchStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 30分間隔でチェック
    for (
      let time = searchStart.getTime();
      time <= searchEnd.getTime();
      time += 30 * 60 * 1000
    ) {
      const utcTime = new Date(time);

      const timezoneDetails = timezones.map(tz => {
        const localTime = utcTime.toLocaleString('en-US', {
          timeZone: tz,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });

        const localHour = parseInt(localTime.split(':')[0]);
        const isBusinessHours =
          localHour >= businessHoursStart && localHour < businessHoursEnd;

        return {
          timezone: tz,
          localTime,
          isBusinessHours,
        };
      });

      // すべてのタイムゾーンで営業時間内かチェック
      const allInBusinessHours = timezoneDetails.every(
        detail => detail.isBusinessHours
      );

      if (allInBusinessHours) {
        results.push({
          utcTime,
          timezoneDetails,
        });

        // 最大10件まで
        if (results.length >= 10) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * タイムゾーンキャッシュの統計情報
   */
  getCacheStatistics(): {
    size: number;
    timezones: string[];
    memoryUsage: string;
  } {
    const size = this.timezoneCache.size;
    const timezones = Array.from(this.timezoneCache.keys());

    // 簡易的なメモリ使用量の推定
    const avgEntrySize = 500; // バイト per entry
    const memoryBytes = size * avgEntrySize;
    const memoryUsage = this.formatBytes(memoryBytes);

    return {
      size,
      timezones,
      memoryUsage,
    };
  }

  /**
   * キャッシュのクリア
   */
  clearCache(): void {
    this.timezoneCache.clear();
    this.logger.info('タイムゾーンキャッシュをクリアしました');
  }

  /**
   * バイト数の書式化
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * タイムゾーンの地域を取得
   */
  private getTimezoneRegion(timezone: string): string {
    const parts = timezone.split('/');
    return parts[0] || 'Unknown';
  }

  /**
   * タイムゾーンの国を取得
   */
  private getTimezoneCountry(timezone: string): string {
    const parts = timezone.split('/');
    if (parts.length >= 2) {
      return parts[1].replace(/_/g, ' ');
    }
    return 'Unknown';
  }

  /**
   * タイムゾーンの都市を取得
   */
  private getTimezoneCity(timezone: string): string {
    const parts = timezone.split('/');
    if (parts.length >= 3) {
      return parts[2].replace(/_/g, ' ');
    }
    if (parts.length >= 2) {
      return parts[1].replace(/_/g, ' ');
    }
    return 'Unknown';
  }

  /**
   * UTCオフセットのフォーマット
   */
  private formatUtcOffset(offsetMinutes: number): string {
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;
    return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
