/**
 * Settings Service
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

export interface AppSettings {
  analysis: {
    riskThresholds: {
      ttl: {
        low: number;
        high: number;
      };
      naming: {
        riskPatterns: string[];
        safePatterns: string[];
      };
    };
    dns: {
      timeout: number;
      retries: number;
      servers: string[];
      enableCache: boolean;
    };
    performance: {
      maxConcurrency: number;
      batchSize: number;
      memoryWarningThreshold: number;
    };
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: 'en' | 'ja';
    dateFormat: string;
    timezone: string;
  };
  api: {
    maxFileSize: number;
    allowedFormats: string[];
    rateLimit: {
      windowMs: number;
      max: number;
    };
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  analysis: {
    riskThresholds: {
      ttl: {
        low: 3600,  // 1時間以上は低リスク
        high: 300   // 5分以下は高リスク
      },
      naming: {
        riskPatterns: [
          'test', 'dev', 'development', 'staging', 'temp', 'temporary',
          'old', 'deprecated', 'legacy', 'backup', 'archive'
        ],
        safePatterns: [
          'www', 'api', 'mail', 'smtp', 'ftp', 'cdn', 'static'
        ]
      }
    },
    dns: {
      timeout: 5000,
      retries: 3,
      servers: ['8.8.8.8', '1.1.1.1', '8.8.4.4'],
      enableCache: true
    },
    performance: {
      maxConcurrency: 20,
      batchSize: 100,
      memoryWarningThreshold: 512
    }
  },
  ui: {
    theme: 'auto',
    language: 'en',
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    timezone: 'UTC'
  },
  api: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedFormats: ['csv'],
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分
      max: 100 // リクエスト数制限
    }
  }
};

export class SettingsService {
  private settingsPath = 'data/settings.json';
  private settings: AppSettings = { ...DEFAULT_SETTINGS };

  constructor() {
    this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    try {
      // データディレクトリの作成
      await fs.mkdir('data', { recursive: true });

      // 設定ファイルの読み込み
      const data = await fs.readFile(this.settingsPath, 'utf-8');
      const loadedSettings = JSON.parse(data);
      
      // デフォルト設定とマージ
      this.settings = this.mergeSettings(DEFAULT_SETTINGS, loadedSettings);
      
      logger.info('Settings loaded successfully');
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // ファイルが存在しない場合はデフォルト設定を保存
        await this.saveSettings();
        logger.info('Default settings created');
      } else {
        logger.error('Failed to load settings:', error);
        // エラーの場合はデフォルト設定を使用
        this.settings = { ...DEFAULT_SETTINGS };
      }
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await fs.mkdir('data', { recursive: true });
      await fs.writeFile(
        this.settingsPath,
        JSON.stringify(this.settings, null, 2),
        'utf-8'
      );
      logger.info('Settings saved successfully');
    } catch (error) {
      logger.error('Failed to save settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  private mergeSettings(defaults: AppSettings, loaded: any): AppSettings {
    // 深いマージを実行（簡単な実装）
    const merged = JSON.parse(JSON.stringify(defaults));
    
    const mergeObject = (target: any, source: any) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          mergeObject(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };

    mergeObject(merged, loaded);
    return merged;
  }

  async getSettings(): Promise<AppSettings> {
    return { ...this.settings };
  }

  async updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    // 設定を更新
    this.settings = this.mergeSettings(this.settings, newSettings);
    
    // ファイルに保存
    await this.saveSettings();
    
    return { ...this.settings };
  }

  async getDefaultSettings(): Promise<AppSettings> {
    return { ...DEFAULT_SETTINGS };
  }

  async resetSettings(): Promise<AppSettings> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.saveSettings();
    return { ...this.settings };
  }

  // 特定の設定セクションを取得
  async getAnalysisSettings() {
    return this.settings.analysis;
  }

  async getUISettings() {
    return this.settings.ui;
  }

  async getAPISettings() {
    return this.settings.api;
  }

  // 設定検証
  private validateSettings(settings: any): boolean {
    try {
      // 必須フィールドの確認
      if (!settings.analysis || !settings.ui || !settings.api) {
        return false;
      }

      // TTL閾値の確認
      if (settings.analysis.riskThresholds.ttl.low <= settings.analysis.riskThresholds.ttl.high) {
        return false;
      }

      // 並行処理数の確認
      if (settings.analysis.performance.maxConcurrency < 1 || settings.analysis.performance.maxConcurrency > 100) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}