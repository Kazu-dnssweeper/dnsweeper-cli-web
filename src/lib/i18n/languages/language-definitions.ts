/**
 * サポート言語定義
 */

import type { SupportedLanguage } from '../core/types.js';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  // 主要言語
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    region: 'US',
    direction: 'ltr',
    flag: '🇺🇸',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    numberFormat: { decimal: '.', thousand: ',', currency: '$' },
    pluralRules: [
      { rule: 'one', forms: ['singular'], examples: [1] },
      { rule: 'other', forms: ['plural'], examples: [0, 2, 3, 4, 5] }
    ],
    enabled: true,
    completeness: 100
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    region: 'JP',
    direction: 'ltr',
    flag: '🇯🇵',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousand: ',', currency: '¥' },
    pluralRules: [
      { rule: 'other', forms: ['invariant'], examples: [0, 1, 2, 3, 4, 5] }
    ],
    enabled: true,
    completeness: 100
  },
  {
    code: 'zh',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    region: 'CN',
    direction: 'ltr',
    flag: '🇨🇳',
    dateFormat: 'YYYY/MM/DD',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousand: ',', currency: '¥' },
    pluralRules: [
      { rule: 'other', forms: ['invariant'], examples: [0, 1, 2, 3, 4, 5] }
    ],
    enabled: true,
    completeness: 95
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    region: 'ES',
    direction: 'ltr',
    flag: '🇪🇸',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousand: '.', currency: '€' },
    pluralRules: [
      { rule: 'one', forms: ['singular'], examples: [1] },
      { rule: 'other', forms: ['plural'], examples: [0, 2, 3, 4, 5] }
    ],
    enabled: true,
    completeness: 90
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    region: 'FR',
    direction: 'ltr',
    flag: '🇫🇷',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousand: ' ', currency: '€' },
    pluralRules: [
      { rule: 'one', forms: ['singular'], examples: [0, 1] },
      { rule: 'other', forms: ['plural'], examples: [2, 3, 4, 5] }
    ],
    enabled: true,
    completeness: 85
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    region: 'DE',
    direction: 'ltr',
    flag: '🇩🇪',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousand: '.', currency: '€' },
    pluralRules: [
      { rule: 'one', forms: ['singular'], examples: [1] },
      { rule: 'other', forms: ['plural'], examples: [0, 2, 3, 4, 5] }
    ],
    enabled: true,
    completeness: 85
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    region: 'BR',
    direction: 'ltr',
    flag: '🇧🇷',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousand: '.', currency: 'R$' },
    pluralRules: [
      { rule: 'one', forms: ['singular'], examples: [0, 1] },
      { rule: 'other', forms: ['plural'], examples: [2, 3, 4, 5] }
    ],
    enabled: true,
    completeness: 80
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    region: 'KR',
    direction: 'ltr',
    flag: '🇰🇷',
    dateFormat: 'YYYY.MM.DD',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousand: ',', currency: '₩' },
    pluralRules: [
      { rule: 'other', forms: ['invariant'], examples: [0, 1, 2, 3, 4, 5] }
    ],
    enabled: true,
    completeness: 75
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    region: 'IT',
    direction: 'ltr',
    flag: '🇮🇹',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousand: '.', currency: '€' },
    pluralRules: [
      { rule: 'one', forms: ['singular'], examples: [1] },
      { rule: 'other', forms: ['plural'], examples: [0, 2, 3, 4, 5] }
    ],
    enabled: true,
    completeness: 70
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    region: 'RU',
    direction: 'ltr',
    flag: '🇷🇺',
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousand: ' ', currency: '₽' },
    pluralRules: [
      { rule: 'one', forms: ['singular'], examples: [1, 21, 31, 41] },
      { rule: 'few', forms: ['few'], examples: [2, 3, 4, 22, 23, 24] },
      { rule: 'other', forms: ['many'], examples: [0, 5, 6, 7, 8, 9] }
    ],
    enabled: true,
    completeness: 65
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    region: 'SA',
    direction: 'rtl',
    flag: '🇸🇦',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousand: ',', currency: 'ر.س' },
    pluralRules: [
      { rule: 'zero', forms: ['zero'], examples: [0] },
      { rule: 'one', forms: ['singular'], examples: [1] },
      { rule: 'two', forms: ['dual'], examples: [2] },
      { rule: 'few', forms: ['few'], examples: [3, 4, 5, 6, 7, 8, 9, 10] },
      { rule: 'many', forms: ['many'], examples: [11, 12, 13] },
      { rule: 'other', forms: ['other'], examples: [100, 101, 102] }
    ],
    enabled: false,
    completeness: 50
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    region: 'IN',
    direction: 'ltr',
    flag: '🇮🇳',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousand: ',', currency: '₹' },
    pluralRules: [
      { rule: 'one', forms: ['singular'], examples: [0, 1] },
      { rule: 'other', forms: ['plural'], examples: [2, 3, 4, 5] }
    ],
    enabled: false,
    completeness: 40
  }
];

export function getLanguageByCode(code: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

export function getEnabledLanguages(): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES.filter(lang => lang.enabled);
}

export function getLanguagesByRegion(region: string): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES.filter(lang => lang.region === region);
}

export function getRTLLanguages(): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES.filter(lang => lang.direction === 'rtl');
}