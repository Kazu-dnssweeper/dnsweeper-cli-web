/**
 * タイムゾーンシステムの型定義
 */

export interface TimezoneInfo {
  timezone: string;
  offset: number;
  abbreviation: string;
  isDST: boolean;
  dstOffset?: number;
  region: string;
  country: string;
  city: string;
  utcOffset: string;
}

export interface LocaleDateTimeFormat {
  dateFormat: string;
  timeFormat: string;
  dateTimeFormat: string;
  shortDateFormat: string;
  longDateFormat: string;
  timeFormat12: string;
  timeFormat24: string;
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  firstWeekContainsDate: 1 | 4; // 1 = Jan 1st, 4 = First Thursday
}

export interface BusinessHours {
  timezone: string;
  regularHours: {
    [day: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  specialHours: {
    date: string;
    open?: string;
    close?: string;
    isOpen: boolean;
    reason?: string;
  }[];
  holidays: {
    date: string;
    name: string;
    isRecurring: boolean;
    region?: string;
  }[];
}

export interface RelativeTimeOptions {
  style: 'long' | 'short' | 'narrow';
  numeric: 'always' | 'auto';
  unit?: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
}

export interface DateTimeLocalizerOptions {
  defaultTimezone?: string;
  autoDetectTimezone?: boolean;
  enableDST?: boolean;
  defaultLocale?: string;
  fallbackLocale?: string;
  fallbackTimezone?: string;
  enableBusinessHours?: boolean;
  enableHolidays?: boolean;
  enableRelativeTime?: boolean;
  enableAutoDetection?: boolean;
  enableCaching?: boolean;
  strictValidation?: boolean;
  cacheSize?: number;
  updateInterval?: number;
  autoUpdateInterval?: number;
}

export interface DateFormatOptions {
  timezone?: string;
  locale?: string;
  format?: 'short' | 'long' | 'custom';
  customFormat?: string;
}

export interface TimeFormatOptions {
  timezone?: string;
  locale?: string;
  format?: '12' | '24';
  showSeconds?: boolean;
}

export interface DateTimeFormatOptions {
  timezone?: string;
  locale?: string;
  dateFormat?: 'short' | 'long' | 'custom';
  timeFormat?: '12' | '24';
  showSeconds?: boolean;
}
