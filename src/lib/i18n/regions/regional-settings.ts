/**
 * 地域設定管理
 */

import type { RegionalSettings } from '../core/types.js';

export const REGIONAL_SETTINGS: RegionalSettings[] = [
  // 北米
  {
    region: 'US',
    name: 'United States',
    languages: ['en', 'es'],
    defaultLanguage: 'en',
    timezone: 'America/New_York',
    currency: 'USD',
    dnsServers: ['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1'],
    legalRequirements: {
      gdpr: false,
      ccpa: true,
      dataLocalization: false,
      auditLog: true
    },
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York'
    },
    supportContacts: {
      email: 'support-us@dnsweeper.com',
      phone: '+1-800-DNS-SWEEP',
      hours: '24/7'
    }
  },
  {
    region: 'CA',
    name: 'Canada',
    languages: ['en', 'fr'],
    defaultLanguage: 'en',
    timezone: 'America/Toronto',
    currency: 'CAD',
    dnsServers: ['8.8.8.8', '8.8.4.4'],
    legalRequirements: {
      gdpr: false,
      ccpa: false,
      dataLocalization: false,
      auditLog: true
    },
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'America/Toronto'
    },
    supportContacts: {
      email: 'support-ca@dnsweeper.com',
      phone: '+1-800-DNS-SWEEP',
      hours: 'Mon-Fri 9AM-5PM EST'
    }
  },
  // ヨーロッパ
  {
    region: 'EU',
    name: 'European Union',
    languages: ['en', 'de', 'fr', 'es', 'it'],
    defaultLanguage: 'en',
    timezone: 'Europe/Brussels',
    currency: 'EUR',
    dnsServers: ['1.1.1.1', '1.0.0.1', '9.9.9.9'],
    legalRequirements: {
      gdpr: true,
      ccpa: false,
      dataLocalization: true,
      auditLog: true
    },
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'Europe/Brussels'
    },
    supportContacts: {
      email: 'support-eu@dnsweeper.com',
      phone: '+32-2-DNS-SWEEP',
      hours: 'Mon-Fri 9AM-5PM CET'
    }
  },
  {
    region: 'UK',
    name: 'United Kingdom',
    languages: ['en'],
    defaultLanguage: 'en',
    timezone: 'Europe/London',
    currency: 'GBP',
    dnsServers: ['8.8.8.8', '8.8.4.4'],
    legalRequirements: {
      gdpr: true,
      ccpa: false,
      dataLocalization: false,
      auditLog: true
    },
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'Europe/London'
    },
    supportContacts: {
      email: 'support-uk@dnsweeper.com',
      phone: '+44-20-DNS-SWEEP',
      hours: 'Mon-Fri 9AM-5PM GMT'
    }
  },
  // アジア太平洋
  {
    region: 'JP',
    name: 'Japan',
    languages: ['ja', 'en'],
    defaultLanguage: 'ja',
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    dnsServers: ['8.8.8.8', '8.8.4.4', '1.1.1.1'],
    legalRequirements: {
      gdpr: false,
      ccpa: false,
      dataLocalization: true,
      auditLog: true
    },
    businessHours: {
      start: '09:00',
      end: '18:00',
      timezone: 'Asia/Tokyo'
    },
    supportContacts: {
      email: 'support-jp@dnsweeper.com',
      phone: '+81-3-DNS-SWEEP',
      hours: '月-金 9:00-18:00 JST'
    }
  },
  {
    region: 'CN',
    name: 'China',
    languages: ['zh', 'en'],
    defaultLanguage: 'zh',
    timezone: 'Asia/Shanghai',
    currency: 'CNY',
    dnsServers: ['223.5.5.5', '223.6.6.6', '114.114.114.114'],
    legalRequirements: {
      gdpr: false,
      ccpa: false,
      dataLocalization: true,
      auditLog: true
    },
    businessHours: {
      start: '09:00',
      end: '18:00',
      timezone: 'Asia/Shanghai'
    },
    supportContacts: {
      email: 'support-cn@dnsweeper.com',
      phone: '+86-10-DNS-SWEEP',
      hours: '周一至周五 9:00-18:00 CST'
    }
  },
  {
    region: 'KR',
    name: 'South Korea',
    languages: ['ko', 'en'],
    defaultLanguage: 'ko',
    timezone: 'Asia/Seoul',
    currency: 'KRW',
    dnsServers: ['8.8.8.8', '8.8.4.4', '168.126.63.1'],
    legalRequirements: {
      gdpr: false,
      ccpa: false,
      dataLocalization: true,
      auditLog: true
    },
    businessHours: {
      start: '09:00',
      end: '18:00',
      timezone: 'Asia/Seoul'
    },
    supportContacts: {
      email: 'support-kr@dnsweeper.com',
      phone: '+82-2-DNS-SWEEP',
      hours: '월-금 9:00-18:00 KST'
    }
  },
  {
    region: 'AU',
    name: 'Australia',
    languages: ['en'],
    defaultLanguage: 'en',
    timezone: 'Australia/Sydney',
    currency: 'AUD',
    dnsServers: ['8.8.8.8', '8.8.4.4', '1.1.1.1'],
    legalRequirements: {
      gdpr: false,
      ccpa: false,
      dataLocalization: false,
      auditLog: true
    },
    businessHours: {
      start: '09:00',
      end: '17:00',
      timezone: 'Australia/Sydney'
    },
    supportContacts: {
      email: 'support-au@dnsweeper.com',
      phone: '+61-2-DNS-SWEEP',
      hours: 'Mon-Fri 9AM-5PM AEST'
    }
  },
  // 南米
  {
    region: 'BR',
    name: 'Brazil',
    languages: ['pt', 'en'],
    defaultLanguage: 'pt',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    dnsServers: ['8.8.8.8', '8.8.4.4'],
    legalRequirements: {
      gdpr: false,
      ccpa: false,
      dataLocalization: true,
      auditLog: true
    },
    businessHours: {
      start: '09:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo'
    },
    supportContacts: {
      email: 'support-br@dnsweeper.com',
      phone: '+55-11-DNS-SWEEP',
      hours: 'Seg-Sex 9:00-18:00 BRT'
    }
  },
  // 中東
  {
    region: 'AE',
    name: 'United Arab Emirates',
    languages: ['ar', 'en'],
    defaultLanguage: 'en',
    timezone: 'Asia/Dubai',
    currency: 'AED',
    dnsServers: ['8.8.8.8', '8.8.4.4'],
    legalRequirements: {
      gdpr: false,
      ccpa: false,
      dataLocalization: true,
      auditLog: true
    },
    businessHours: {
      start: '09:00',
      end: '18:00',
      timezone: 'Asia/Dubai'
    },
    supportContacts: {
      email: 'support-ae@dnsweeper.com',
      phone: '+971-4-DNS-SWEEP',
      hours: 'Sun-Thu 9AM-6PM GST'
    }
  }
];

export function getRegionalSettingsByCode(code: string): RegionalSettings | undefined {
  return REGIONAL_SETTINGS.find(settings => settings.region === code);
}

export function getRegionalSettingsByTimezone(timezone: string): RegionalSettings[] {
  return REGIONAL_SETTINGS.filter(settings => settings.timezone === timezone);
}

export function getRegionalSettingsByCurrency(currency: string): RegionalSettings[] {
  return REGIONAL_SETTINGS.filter(settings => settings.currency === currency);
}

export function getGDPRRegions(): RegionalSettings[] {
  return REGIONAL_SETTINGS.filter(settings => settings.legalRequirements.gdpr);
}