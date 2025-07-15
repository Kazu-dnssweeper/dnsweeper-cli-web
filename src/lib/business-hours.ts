/**
 * 業務時間管理システム
 *
 * 業務時間判定、祝日管理、営業日計算機能
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type { BusinessHours } from './timezone-types.js';

export class BusinessHoursManager extends EventEmitter {
  private logger: Logger;
  private businessHoursCache: Map<string, BusinessHours>;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger({ logLevel: 'info' });
    this.businessHoursCache = new Map();
    this.initializeBusinessHours();
  }

  /**
   * 業務時間の初期化
   */
  private initializeBusinessHours(): void {
    const businessHours: { [timezone: string]: BusinessHours } = {
      'America/New_York': {
        timezone: 'America/New_York',
        regularHours: {
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: '10:00', close: '14:00', isOpen: true },
          sunday: { open: '00:00', close: '00:00', isOpen: false },
        },
        specialHours: [],
        holidays: [
          {
            date: '2024-01-01',
            name: "New Year's Day",
            isRecurring: true,
            region: 'US',
          },
          {
            date: '2024-07-04',
            name: 'Independence Day',
            isRecurring: true,
            region: 'US',
          },
          {
            date: '2024-12-25',
            name: 'Christmas Day',
            isRecurring: true,
            region: 'US',
          },
        ],
      },
      'Europe/London': {
        timezone: 'Europe/London',
        regularHours: {
          monday: { open: '09:00', close: '17:30', isOpen: true },
          tuesday: { open: '09:00', close: '17:30', isOpen: true },
          wednesday: { open: '09:00', close: '17:30', isOpen: true },
          thursday: { open: '09:00', close: '17:30', isOpen: true },
          friday: { open: '09:00', close: '17:30', isOpen: true },
          saturday: { open: '00:00', close: '00:00', isOpen: false },
          sunday: { open: '00:00', close: '00:00', isOpen: false },
        },
        specialHours: [],
        holidays: [
          {
            date: '2024-01-01',
            name: "New Year's Day",
            isRecurring: true,
            region: 'UK',
          },
          {
            date: '2024-12-25',
            name: 'Christmas Day',
            isRecurring: true,
            region: 'UK',
          },
          {
            date: '2024-12-26',
            name: 'Boxing Day',
            isRecurring: true,
            region: 'UK',
          },
        ],
      },
      'Asia/Tokyo': {
        timezone: 'Asia/Tokyo',
        regularHours: {
          monday: { open: '09:00', close: '18:00', isOpen: true },
          tuesday: { open: '09:00', close: '18:00', isOpen: true },
          wednesday: { open: '09:00', close: '18:00', isOpen: true },
          thursday: { open: '09:00', close: '18:00', isOpen: true },
          friday: { open: '09:00', close: '18:00', isOpen: true },
          saturday: { open: '00:00', close: '00:00', isOpen: false },
          sunday: { open: '00:00', close: '00:00', isOpen: false },
        },
        specialHours: [
          {
            date: '2024-12-28',
            open: '09:00',
            close: '15:00',
            isOpen: true,
            reason: '年末短縮営業',
          },
        ],
        holidays: [
          {
            date: '2024-01-01',
            name: '元日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-01-08',
            name: '成人の日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-02-11',
            name: '建国記念の日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-02-23',
            name: '天皇誕生日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-03-20',
            name: '春分の日',
            isRecurring: false,
            region: 'JP',
          },
          {
            date: '2024-04-29',
            name: '昭和の日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-05-03',
            name: '憲法記念日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-05-04',
            name: 'みどりの日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-05-05',
            name: 'こどもの日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-07-15',
            name: '海の日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-08-11',
            name: '山の日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-09-16',
            name: '敬老の日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-09-22',
            name: '秋分の日',
            isRecurring: false,
            region: 'JP',
          },
          {
            date: '2024-10-14',
            name: 'スポーツの日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-11-03',
            name: '文化の日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-11-23',
            name: '勤労感謝の日',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-12-29',
            name: '年末年始',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-12-30',
            name: '年末年始',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-12-31',
            name: '年末年始',
            isRecurring: true,
            region: 'JP',
          },
        ],
      },
      'Europe/Berlin': {
        timezone: 'Europe/Berlin',
        regularHours: {
          monday: { open: '08:00', close: '16:00', isOpen: true },
          tuesday: { open: '08:00', close: '16:00', isOpen: true },
          wednesday: { open: '08:00', close: '16:00', isOpen: true },
          thursday: { open: '08:00', close: '16:00', isOpen: true },
          friday: { open: '08:00', close: '16:00', isOpen: true },
          saturday: { open: '00:00', close: '00:00', isOpen: false },
          sunday: { open: '00:00', close: '00:00', isOpen: false },
        },
        specialHours: [],
        holidays: [
          {
            date: '2024-01-01',
            name: 'Neujahr',
            isRecurring: true,
            region: 'DE',
          },
          {
            date: '2024-12-25',
            name: 'Weihnachtstag',
            isRecurring: true,
            region: 'DE',
          },
          {
            date: '2024-12-26',
            name: 'Zweiter Weihnachtstag',
            isRecurring: true,
            region: 'DE',
          },
        ],
      },
      'Australia/Sydney': {
        timezone: 'Australia/Sydney',
        regularHours: {
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: '00:00', close: '00:00', isOpen: false },
          sunday: { open: '00:00', close: '00:00', isOpen: false },
        },
        specialHours: [],
        holidays: [
          {
            date: '2024-01-01',
            name: "New Year's Day",
            isRecurring: true,
            region: 'AU',
          },
          {
            date: '2024-01-26',
            name: 'Australia Day',
            isRecurring: true,
            region: 'AU',
          },
          {
            date: '2024-12-25',
            name: 'Christmas Day',
            isRecurring: true,
            region: 'AU',
          },
          {
            date: '2024-12-26',
            name: 'Boxing Day',
            isRecurring: true,
            region: 'AU',
          },
        ],
      },
    };

    Object.entries(businessHours).forEach(([timezone, hours]) => {
      this.businessHoursCache.set(timezone, hours);
    });

    this.logger.info('業務時間初期化完了', {
      timezones: Object.keys(businessHours).length,
    });
  }

  /**
   * 業務時間の判定
   */
  isBusinessHours(date: Date = new Date(), timezone: string = 'UTC'): boolean {
    try {
      const businessHours = this.businessHoursCache.get(timezone);

      if (!businessHours) {
        this.logger.warn(`業務時間設定が見つかりません: ${timezone}`);
        return false;
      }

      // 祝日チェック
      if (this.isHoliday(date, businessHours)) {
        return false;
      }

      // 特別営業時間チェック
      const specialHours = this.getSpecialHours(date, businessHours);
      if (specialHours) {
        if (!specialHours.isOpen) {
          return false;
        }

        if (specialHours.open && specialHours.close) {
          const timeStr = date.toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          });
          return timeStr >= specialHours.open && timeStr <= specialHours.close;
        }
      }

      // 通常営業時間チェック
      const dayOfWeek = date
        .toLocaleDateString('en-US', {
          weekday: 'long',
          timeZone: timezone,
        })
        .toLowerCase();

      const dayHours = businessHours.regularHours[dayOfWeek];
      if (!dayHours || !dayHours.isOpen) {
        return false;
      }

      // 時刻の判定
      const timeStr = date.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      return timeStr >= dayHours.open && timeStr <= dayHours.close;
    } catch (error) {
      this.logger.error(
        '業務時間判定エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * 祝日の判定
   */
  isHoliday(date: Date, businessHours?: BusinessHours): boolean {
    try {
      if (!businessHours) {
        return false;
      }

      const dateStr = date.toISOString().split('T')[0];
      const holiday = businessHours.holidays.find(
        holiday => holiday.date === dateStr
      );

      if (holiday) {
        this.logger.debug('祝日検出', { date: dateStr, holiday: holiday.name });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        '祝日判定エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * 特別営業時間の取得
   */
  private getSpecialHours(
    date: Date,
    businessHours: BusinessHours
  ): BusinessHours['specialHours'][0] | null {
    const dateStr = date.toISOString().split('T')[0];
    return (
      businessHours.specialHours.find(special => special.date === dateStr) ||
      null
    );
  }

  /**
   * 次の営業日の取得
   */
  getNextBusinessDay(date: Date = new Date(), timezone: string = 'UTC'): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // 最大30日先まで検索（無限ループ防止）
    let attempts = 0;
    while (!this.isBusinessDay(nextDay, timezone) && attempts < 30) {
      nextDay.setDate(nextDay.getDate() + 1);
      attempts++;
    }

    if (attempts >= 30) {
      this.logger.warn('次の営業日が見つかりませんでした', {
        startDate: date,
        timezone,
      });
    }

    return nextDay;
  }

  /**
   * 前の営業日の取得
   */
  getPreviousBusinessDay(
    date: Date = new Date(),
    timezone: string = 'UTC'
  ): Date {
    const prevDay = new Date(date);
    prevDay.setDate(prevDay.getDate() - 1);

    // 最大30日前まで検索（無限ループ防止）
    let attempts = 0;
    while (!this.isBusinessDay(prevDay, timezone) && attempts < 30) {
      prevDay.setDate(prevDay.getDate() - 1);
      attempts++;
    }

    if (attempts >= 30) {
      this.logger.warn('前の営業日が見つかりませんでした', {
        startDate: date,
        timezone,
      });
    }

    return prevDay;
  }

  /**
   * 営業日の判定（時刻は考慮しない）
   */
  isBusinessDay(date: Date, timezone: string = 'UTC'): boolean {
    try {
      const businessHours = this.businessHoursCache.get(timezone);

      if (!businessHours) {
        this.logger.warn(`業務時間設定が見つかりません: ${timezone}`);
        return false;
      }

      // 祝日チェック
      if (this.isHoliday(date, businessHours)) {
        return false;
      }

      // 特別営業時間チェック
      const specialHours = this.getSpecialHours(date, businessHours);
      if (specialHours) {
        return specialHours.isOpen;
      }

      // 通常営業日チェック
      const dayOfWeek = date
        .toLocaleDateString('en-US', {
          weekday: 'long',
          timeZone: timezone,
        })
        .toLowerCase();

      const dayHours = businessHours.regularHours[dayOfWeek];
      return dayHours ? dayHours.isOpen : false;
    } catch (error) {
      this.logger.error(
        '営業日判定エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * 営業時間の残り時間を計算
   */
  getTimeUntilClose(
    date: Date = new Date(),
    timezone: string = 'UTC'
  ): number | null {
    try {
      if (!this.isBusinessHours(date, timezone)) {
        return null;
      }

      const businessHours = this.businessHoursCache.get(timezone);
      if (!businessHours) {
        return null;
      }

      // 特別営業時間チェック
      const specialHours = this.getSpecialHours(date, businessHours);
      let closeTime: string;

      if (specialHours && specialHours.close) {
        closeTime = specialHours.close;
      } else {
        const dayOfWeek = date
          .toLocaleDateString('en-US', {
            weekday: 'long',
            timeZone: timezone,
          })
          .toLowerCase();

        const dayHours = businessHours.regularHours[dayOfWeek];
        if (!dayHours) {
          return null;
        }
        closeTime = dayHours.close;
      }

      // 現在時刻の取得
      const currentTime = date.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      // 時刻を分に変換
      const [currentHour, currentMin] = currentTime.split(':').map(Number);
      const [closeHour, closeMin] = closeTime.split(':').map(Number);

      const currentMinutes = currentHour * 60 + currentMin;
      const closeMinutes = closeHour * 60 + closeMin;

      return Math.max(0, closeMinutes - currentMinutes);
    } catch (error) {
      this.logger.error(
        '営業終了時刻計算エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * 次の営業開始時刻を計算
   */
  getTimeUntilOpen(
    date: Date = new Date(),
    timezone: string = 'UTC'
  ): number | null {
    try {
      if (this.isBusinessHours(date, timezone)) {
        return 0; // すでに営業中
      }

      const nextOpenDay = this.getNextBusinessDay(date, timezone);
      const businessHours = this.businessHoursCache.get(timezone);

      if (!businessHours) {
        return null;
      }

      const dayOfWeek = nextOpenDay
        .toLocaleDateString('en-US', {
          weekday: 'long',
          timeZone: timezone,
        })
        .toLowerCase();

      const dayHours = businessHours.regularHours[dayOfWeek];
      if (!dayHours || !dayHours.isOpen) {
        return null;
      }

      // 次の営業日の開始時刻を設定
      const [openHour, openMin] = dayHours.open.split(':').map(Number);
      const nextOpen = new Date(nextOpenDay);
      nextOpen.setHours(openHour, openMin, 0, 0);

      return Math.max(0, nextOpen.getTime() - date.getTime()) / (1000 * 60); // 分単位で返す
    } catch (error) {
      this.logger.error(
        '営業開始時刻計算エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * 営業日数を計算
   */
  getBusinessDaysBetween(
    startDate: Date,
    endDate: Date,
    timezone: string = 'UTC'
  ): number {
    try {
      let count = 0;
      const current = new Date(startDate);

      while (current <= endDate) {
        if (this.isBusinessDay(current, timezone)) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }

      return count;
    } catch (error) {
      this.logger.error(
        '営業日数計算エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return 0;
    }
  }

  /**
   * APIメソッド
   */
  getBusinessHours(timezone: string): BusinessHours | undefined {
    return this.businessHoursCache.get(timezone);
  }

  getAllBusinessHours(): BusinessHours[] {
    return Array.from(this.businessHoursCache.values());
  }

  setBusinessHours(timezone: string, hours: BusinessHours): void {
    this.businessHoursCache.set(timezone, hours);
    this.emit('business-hours-updated', { timezone, hours });
  }

  hasBusinessHours(timezone: string): boolean {
    return this.businessHoursCache.has(timezone);
  }

  getHolidays(timezone: string): BusinessHours['holidays'] {
    const businessHours = this.businessHoursCache.get(timezone);
    return businessHours?.holidays || [];
  }

  addHoliday(timezone: string, holiday: BusinessHours['holidays'][0]): boolean {
    const businessHours = this.businessHoursCache.get(timezone);
    if (!businessHours) {
      return false;
    }

    businessHours.holidays.push(holiday);
    this.emit('holiday-added', { timezone, holiday });
    return true;
  }
}
