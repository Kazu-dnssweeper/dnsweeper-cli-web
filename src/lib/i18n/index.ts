/**
 * 国際化システム - エクスポート
 */

// Core types
export * from './core/types.js';

// Language definitions
export {
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
  getEnabledLanguages,
  getLanguagesByRegion,
  getRTLLanguages,
} from './languages/language-definitions.js';

// Regional settings
export {
  REGIONAL_SETTINGS,
  getRegionalSettingsByCode,
  getRegionalSettingsByTimezone,
  getRegionalSettingsByCurrency,
  getGDPRRegions,
} from './regions/regional-settings.js';

// Translation manager
export { TranslationManager } from './translations/translation-manager.js';

// Formatter
export { I18nFormatter } from './formatters/formatter.js';

// Re-export the main manager for backward compatibility
export { I18nManager } from '../i18n-manager.js';
