/**
 * 国際化 React Hook
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { I18nManager, SupportedLanguage, LocalizationContext } from '../../../src/lib/i18n-manager.js';

interface I18nState {
  currentLanguage: string;
  currentRegion: string;
  supportedLanguages: SupportedLanguage[];
  localizationContext: LocalizationContext;
  loading: boolean;
  error: string | null;
}

interface UseI18nReturn {
  // 状態
  currentLanguage: string;
  currentRegion: string;
  supportedLanguages: SupportedLanguage[];
  localizationContext: LocalizationContext;
  loading: boolean;
  error: string | null;
  
  // メソッド
  translate: (key: string, namespace?: string, options?: {
    interpolations?: { [key: string]: string | number };
    count?: number;
    context?: string;
    fallback?: string;
  }) => string;
  
  formatNumber: (value: number, options?: {
    precision?: number;
    currency?: boolean;
    percentage?: boolean;
  }) => string;
  
  formatDate: (date: Date, options?: {
    format?: string;
    timezone?: string;
    relative?: boolean;
  }) => string;
  
  formatTime: (date: Date, options?: {
    format?: string;
    timezone?: string;
  }) => string;
  
  changeLanguage: (languageCode: string) => Promise<void>;
  
  // ユーティリティ
  isRTL: boolean;
  getRegionalSettings: () => any;
  getTranslationStatistics: () => any;
  generateCompletionReport: () => any;
}

// グローバルなi18nManagerインスタンス
let i18nManager: I18nManager | null = null;

const initializeI18nManager = () => {
  if (!i18nManager) {
    i18nManager = new I18nManager(undefined, {
      defaultLanguage: 'ja', // 日本語をデフォルトに
      fallbackLanguage: 'en',
      autoDetectLanguage: true,
      enablePluralHandling: true,
      enableInterpolation: true,
      translationCacheSize: 10000,
      missingKeyHandling: 'warning',
      enableRTL: true,
      enableRegionalSettings: true
    });
    
    // 基本的な翻訳を追加
    initializeBaseTranslations();
  }
  return i18nManager;
};

const initializeBaseTranslations = async () => {
  if (!i18nManager) return;
  
  // 日本語翻訳
  const japaneseTranslations = {
    // 共通
    common: {
      // ボタン
      ok: 'OK',
      cancel: 'キャンセル',
      save: '保存',
      delete: '削除',
      edit: '編集',
      add: '追加',
      close: '閉じる',
      back: '戻る',
      next: '次へ',
      submit: '送信',
      reset: 'リセット',
      refresh: '更新',
      
      // ナビゲーション
      home: 'ホーム',
      dashboard: 'ダッシュボード',
      settings: '設定',
      help: 'ヘルプ',
      about: 'について',
      
      // フォーム
      name: '名前',
      email: 'メールアドレス',
      password: 'パスワード',
      confirm_password: 'パスワード確認',
      username: 'ユーザー名',
      
      // 状態
      loading: '読み込み中...',
      error: 'エラー',
      success: '成功',
      warning: '警告',
      info: '情報',
      
      // 言語設定
      language: '言語',
      change_language: '言語を変更',
      select_language: '言語を選択',
      current_language: '現在の言語',
      available_languages: '利用可能な言語',
      beta_languages: 'ベータ言語',
      show_beta_languages: 'ベータ言語を表示',
      language_settings: '言語設定',
      translation_completeness: '翻訳完成度',
      regional_settings: '地域設定',
      timezone: 'タイムゾーン',
      currency: '通貨',
      date_format: '日付形式',
      time_format: '時刻形式',
      region: '地域',
      direction: '文字方向',
      disabled: '無効',
      beta: 'ベータ',
      languages_available: '言語利用可能',
      translation_help_text: 'より多くの言語サポートについては、コミュニティに参加して翻訳にご協力ください。',
      
      // 時間
      today: '今日',
      yesterday: '昨日',
      days_ago: '{{count}}日前',
      
      // 数値
      items: '項目',
      item: '項目',
      count: '{{count}}個'
    },
    
    // DNS機能
    dns: {
      resolution: 'DNS解決',
      records: 'DNSレコード',
      analysis: 'DNS分析',
      optimization: 'DNS最適化',
      security: 'DNSセキュリティ',
      domain: 'ドメイン',
      domains: 'ドメイン',
      record_type: 'レコードタイプ',
      value: '値',
      ttl: 'TTL',
      priority: '優先度',
      
      // レコードタイプ
      a_record: 'Aレコード',
      aaaa_record: 'AAAAレコード',
      cname_record: 'CNAMEレコード',
      mx_record: 'MXレコード',
      ns_record: 'NSレコード',
      txt_record: 'TXTレコード',
      ptr_record: 'PTRレコード',
      soa_record: 'SOAレコード',
      
      // 分析
      analyze_domain: 'ドメインを分析',
      analysis_results: '分析結果',
      security_threats: 'セキュリティ脅威',
      performance_metrics: 'パフォーマンス指標',
      optimization_suggestions: '最適化提案'
    },
    
    // ダッシュボード
    dashboard: {
      title: 'ダッシュボード',
      metrics: 'メトリクス',
      charts: 'チャート',
      alerts: 'アラート',
      reports: 'レポート',
      monitoring: '監視',
      overview: '概要',
      
      // メトリクス
      total_domains: '総ドメイン数',
      total_records: '総レコード数',
      total_queries: '総クエリ数',
      active_threats: 'アクティブな脅威',
      response_time: '応答時間',
      uptime: '稼働時間',
      error_rate: 'エラー率',
      
      // 時間範囲
      last_hour: '過去1時間',
      last_24_hours: '過去24時間',
      last_7_days: '過去7日',
      last_30_days: '過去30日',
      custom_range: 'カスタム範囲'
    },
    
    // エンタープライズ
    enterprise: {
      tenants: 'テナント',
      users: 'ユーザー',
      permissions: '権限',
      audit: '監査',
      orchestration: 'オーケストレーション',
      
      // テナント管理
      tenant_management: 'テナント管理',
      create_tenant: 'テナント作成',
      edit_tenant: 'テナント編集',
      delete_tenant: 'テナント削除',
      tenant_name: 'テナント名',
      organization_id: '組織ID',
      
      // ユーザー管理
      user_management: 'ユーザー管理',
      create_user: 'ユーザー作成',
      edit_user: 'ユーザー編集',
      delete_user: 'ユーザー削除',
      user_roles: 'ユーザー役割',
      
      // 権限
      permissions_management: '権限管理',
      role_based_access: 'ロールベースアクセス',
      access_control: 'アクセス制御',
      
      // 監査
      audit_log: '監査ログ',
      audit_trail: '監査証跡',
      compliance: 'コンプライアンス',
      
      // オーケストレーション
      job_queue: 'ジョブキュー',
      scheduled_tasks: 'スケジュールタスク',
      workflow: 'ワークフロー'
    },
    
    // セキュリティ
    security: {
      threats: '脅威',
      policies: 'ポリシー',
      compliance: 'コンプライアンス',
      access: 'アクセス',
      authentication: '認証',
      
      // 脅威
      malware: 'マルウェア',
      phishing: 'フィッシング',
      typosquatting: 'タイポスクワッティング',
      dga: 'DGA',
      fastflux: 'Fast Flux',
      dns_hijacking: 'DNSハイジャック',
      cache_poisoning: 'キャッシュポイズニング',
      subdomain_takeover: 'サブドメイン乗っ取り',
      
      // 重要度
      critical: '重要',
      high: '高',
      medium: '中',
      low: '低',
      
      // 状態
      active: 'アクティブ',
      resolved: '解決済み',
      investigating: '調査中',
      false_positive: '誤検知'
    },
    
    // レポート
    reports: {
      generation: 'レポート生成',
      export: 'エクスポート',
      scheduling: 'スケジュール',
      templates: 'テンプレート',
      visualization: '可視化',
      
      // 形式
      pdf: 'PDF',
      excel: 'Excel',
      csv: 'CSV',
      json: 'JSON',
      
      // 種類
      security_report: 'セキュリティレポート',
      performance_report: 'パフォーマンスレポート',
      compliance_report: 'コンプライアンスレポート',
      summary_report: 'サマリーレポート'
    },
    
    // 設定
    settings: {
      preferences: '設定',
      configuration: '設定',
      integrations: '統合',
      api: 'API',
      advanced: '高度な設定',
      
      // 一般設定
      general: '一般',
      appearance: '外観',
      notifications: '通知',
      privacy: 'プライバシー',
      
      // API設定
      api_keys: 'APIキー',
      api_documentation: 'APIドキュメント',
      webhooks: 'Webhook',
      
      // 統合
      cloudflare: 'Cloudflare',
      route53: 'Route53',
      third_party: 'サードパーティ'
    },
    
    // ヘルプ
    help: {
      documentation: 'ドキュメント',
      tutorials: 'チュートリアル',
      faq: 'よくある質問',
      support: 'サポート',
      contact: 'お問い合わせ',
      
      // サポート
      get_help: 'ヘルプを取得',
      contact_support: 'サポートに連絡',
      community: 'コミュニティ',
      feedback: 'フィードバック'
    }
  };
  
  // 英語翻訳
  const englishTranslations = {
    // 共通
    common: {
      // ボタン
      ok: 'OK',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      reset: 'Reset',
      refresh: 'Refresh',
      
      // ナビゲーション
      home: 'Home',
      dashboard: 'Dashboard',
      settings: 'Settings',
      help: 'Help',
      about: 'About',
      
      // フォーム
      name: 'Name',
      email: 'Email',
      password: 'Password',
      confirm_password: 'Confirm Password',
      username: 'Username',
      
      // 状態
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
      
      // 言語設定
      language: 'Language',
      change_language: 'Change Language',
      select_language: 'Select Language',
      current_language: 'Current Language',
      available_languages: 'Available Languages',
      beta_languages: 'Beta Languages',
      show_beta_languages: 'Show Beta Languages',
      language_settings: 'Language Settings',
      translation_completeness: 'Translation Completeness',
      regional_settings: 'Regional Settings',
      timezone: 'Timezone',
      currency: 'Currency',
      date_format: 'Date Format',
      time_format: 'Time Format',
      region: 'Region',
      direction: 'Direction',
      disabled: 'Disabled',
      beta: 'Beta',
      languages_available: 'languages available',
      translation_help_text: 'For more language support, join our community and help with translations.',
      
      // 時間
      today: 'Today',
      yesterday: 'Yesterday',
      days_ago: '{{count}} days ago',
      
      // 数値
      items: 'items',
      item: 'item',
      count: '{{count}} items'
    },
    
    // DNS機能
    dns: {
      resolution: 'DNS Resolution',
      records: 'DNS Records',
      analysis: 'DNS Analysis',
      optimization: 'DNS Optimization',
      security: 'DNS Security',
      domain: 'Domain',
      domains: 'Domains',
      record_type: 'Record Type',
      value: 'Value',
      ttl: 'TTL',
      priority: 'Priority',
      
      // レコードタイプ
      a_record: 'A Record',
      aaaa_record: 'AAAA Record',
      cname_record: 'CNAME Record',
      mx_record: 'MX Record',
      ns_record: 'NS Record',
      txt_record: 'TXT Record',
      ptr_record: 'PTR Record',
      soa_record: 'SOA Record',
      
      // 分析
      analyze_domain: 'Analyze Domain',
      analysis_results: 'Analysis Results',
      security_threats: 'Security Threats',
      performance_metrics: 'Performance Metrics',
      optimization_suggestions: 'Optimization Suggestions'
    },
    
    // ダッシュボード
    dashboard: {
      title: 'Dashboard',
      metrics: 'Metrics',
      charts: 'Charts',
      alerts: 'Alerts',
      reports: 'Reports',
      monitoring: 'Monitoring',
      overview: 'Overview',
      
      // メトリクス
      total_domains: 'Total Domains',
      total_records: 'Total Records',
      total_queries: 'Total Queries',
      active_threats: 'Active Threats',
      response_time: 'Response Time',
      uptime: 'Uptime',
      error_rate: 'Error Rate',
      
      // 時間範囲
      last_hour: 'Last Hour',
      last_24_hours: 'Last 24 Hours',
      last_7_days: 'Last 7 Days',
      last_30_days: 'Last 30 Days',
      custom_range: 'Custom Range'
    },
    
    // エンタープライズ
    enterprise: {
      tenants: 'Tenants',
      users: 'Users',
      permissions: 'Permissions',
      audit: 'Audit',
      orchestration: 'Orchestration',
      
      // テナント管理
      tenant_management: 'Tenant Management',
      create_tenant: 'Create Tenant',
      edit_tenant: 'Edit Tenant',
      delete_tenant: 'Delete Tenant',
      tenant_name: 'Tenant Name',
      organization_id: 'Organization ID',
      
      // ユーザー管理
      user_management: 'User Management',
      create_user: 'Create User',
      edit_user: 'Edit User',
      delete_user: 'Delete User',
      user_roles: 'User Roles',
      
      // 権限
      permissions_management: 'Permissions Management',
      role_based_access: 'Role-Based Access',
      access_control: 'Access Control',
      
      // 監査
      audit_log: 'Audit Log',
      audit_trail: 'Audit Trail',
      compliance: 'Compliance',
      
      // オーケストレーション
      job_queue: 'Job Queue',
      scheduled_tasks: 'Scheduled Tasks',
      workflow: 'Workflow'
    },
    
    // セキュリティ
    security: {
      threats: 'Threats',
      policies: 'Policies',
      compliance: 'Compliance',
      access: 'Access',
      authentication: 'Authentication',
      
      // 脅威
      malware: 'Malware',
      phishing: 'Phishing',
      typosquatting: 'Typosquatting',
      dga: 'DGA',
      fastflux: 'Fast Flux',
      dns_hijacking: 'DNS Hijacking',
      cache_poisoning: 'Cache Poisoning',
      subdomain_takeover: 'Subdomain Takeover',
      
      // 重要度
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
      
      // 状態
      active: 'Active',
      resolved: 'Resolved',
      investigating: 'Investigating',
      false_positive: 'False Positive'
    },
    
    // レポート
    reports: {
      generation: 'Report Generation',
      export: 'Export',
      scheduling: 'Scheduling',
      templates: 'Templates',
      visualization: 'Visualization',
      
      // 形式
      pdf: 'PDF',
      excel: 'Excel',
      csv: 'CSV',
      json: 'JSON',
      
      // 種類
      security_report: 'Security Report',
      performance_report: 'Performance Report',
      compliance_report: 'Compliance Report',
      summary_report: 'Summary Report'
    },
    
    // 設定
    settings: {
      preferences: 'Preferences',
      configuration: 'Configuration',
      integrations: 'Integrations',
      api: 'API',
      advanced: 'Advanced',
      
      // 一般設定
      general: 'General',
      appearance: 'Appearance',
      notifications: 'Notifications',
      privacy: 'Privacy',
      
      // API設定
      api_keys: 'API Keys',
      api_documentation: 'API Documentation',
      webhooks: 'Webhooks',
      
      // 統合
      cloudflare: 'Cloudflare',
      route53: 'Route53',
      third_party: 'Third Party'
    },
    
    // ヘルプ
    help: {
      documentation: 'Documentation',
      tutorials: 'Tutorials',
      faq: 'FAQ',
      support: 'Support',
      contact: 'Contact',
      
      // サポート
      get_help: 'Get Help',
      contact_support: 'Contact Support',
      community: 'Community',
      feedback: 'Feedback'
    }
  };
  
  // 翻訳を追加
  try {
    for (const [namespace, keys] of Object.entries(japaneseTranslations)) {
      for (const [key, value] of Object.entries(keys as any)) {
        await i18nManager.addTranslation('ja', namespace, key, value);
      }
    }
    
    for (const [namespace, keys] of Object.entries(englishTranslations)) {
      for (const [key, value] of Object.entries(keys as any)) {
        await i18nManager.addTranslation('en', namespace, key, value);
      }
    }
  } catch (error) {
    console.error('翻訳の初期化に失敗しました:', error);
  }
};

export const useI18n = (): UseI18nReturn => {
  const manager = useMemo(() => initializeI18nManager(), []);
  
  const [state, setState] = useState<I18nState>({
    currentLanguage: manager.getCurrentLanguage(),
    currentRegion: manager.getCurrentRegion(),
    supportedLanguages: manager.getSupportedLanguages(),
    localizationContext: manager.getLocalizationContext(),
    loading: false,
    error: null
  });
  
  // 言語変更の監視
  useEffect(() => {
    const handleLanguageChange = (event: any) => {
      setState(prev => ({
        ...prev,
        currentLanguage: event.to,
        currentRegion: event.region,
        localizationContext: event.context
      }));
    };
    
    manager.on('language-changed', handleLanguageChange);
    
    return () => {
      manager.off('language-changed', handleLanguageChange);
    };
  }, [manager]);
  
  // 翻訳関数
  const translate = useCallback((
    key: string,
    namespace: string = 'common',
    options?: {
      interpolations?: { [key: string]: string | number };
      count?: number;
      context?: string;
      fallback?: string;
    }
  ): string => {
    try {
      return manager.translate(key, namespace, options);
    } catch (error) {
      console.error('翻訳エラー:', error);
      return options?.fallback || `[${namespace}:${key}]`;
    }
  }, [manager]);
  
  // 数値フォーマット関数
  const formatNumber = useCallback((
    value: number,
    options?: {
      precision?: number;
      currency?: boolean;
      percentage?: boolean;
    }
  ): string => {
    try {
      return manager.formatNumber(value, options);
    } catch (error) {
      console.error('数値フォーマットエラー:', error);
      return String(value);
    }
  }, [manager]);
  
  // 日付フォーマット関数
  const formatDate = useCallback((
    date: Date,
    options?: {
      format?: string;
      timezone?: string;
      relative?: boolean;
    }
  ): string => {
    try {
      return manager.formatDate(date, options);
    } catch (error) {
      console.error('日付フォーマットエラー:', error);
      return date.toLocaleDateString();
    }
  }, [manager]);
  
  // 時刻フォーマット関数
  const formatTime = useCallback((
    date: Date,
    options?: {
      format?: string;
      timezone?: string;
    }
  ): string => {
    try {
      return manager.formatTime(date, options);
    } catch (error) {
      console.error('時刻フォーマットエラー:', error);
      return date.toLocaleTimeString();
    }
  }, [manager]);
  
  // 言語変更関数
  const changeLanguage = useCallback(async (languageCode: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await manager.changeLanguage(languageCode);
      setState(prev => ({
        ...prev,
        currentLanguage: languageCode,
        currentRegion: manager.getCurrentRegion(),
        localizationContext: manager.getLocalizationContext(),
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '言語変更に失敗しました',
        loading: false
      }));
      throw error;
    }
  }, [manager]);
  
  // RTL判定
  const isRTL = useMemo(() => {
    return state.localizationContext.rtl;
  }, [state.localizationContext.rtl]);
  
  // 地域設定取得
  const getRegionalSettings = useCallback(() => {
    return manager.getRegionalSettings();
  }, [manager]);
  
  // 翻訳統計取得
  const getTranslationStatistics = useCallback(() => {
    return manager.getTranslationStatistics();
  }, [manager]);
  
  // 完成度レポート取得
  const generateCompletionReport = useCallback(() => {
    return manager.generateCompletionReport();
  }, [manager]);
  
  return {
    // 状態
    currentLanguage: state.currentLanguage,
    currentRegion: state.currentRegion,
    supportedLanguages: state.supportedLanguages,
    localizationContext: state.localizationContext,
    loading: state.loading,
    error: state.error,
    
    // メソッド
    translate,
    formatNumber,
    formatDate,
    formatTime,
    changeLanguage,
    
    // ユーティリティ
    isRTL,
    getRegionalSettings,
    getTranslationStatistics,
    generateCompletionReport
  };
};

export default useI18n;