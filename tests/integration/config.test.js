import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, saveConfig, validateConfig } from '../../src/lib/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
describe('設定ファイル読み込み統合テスト', () => {
    const testDir = path.join(os.tmpdir(), 'dnsweeper-test-' + Date.now());
    const configPath = path.join(testDir, '.dnsweeper.json');
    beforeEach(() => {
        // テスト用ディレクトリを作成
        fs.mkdirSync(testDir, { recursive: true });
        process.chdir(testDir);
    });
    afterEach(() => {
        // テスト用ディレクトリをクリーンアップ
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });
    describe('loadConfig', () => {
        it('デフォルト設定を読み込む', async () => {
            const config = await loadConfig();
            expect(config.dns?.timeout).toBe(5000);
            expect(config.dns?.retries).toBe(3);
            expect(config.csv?.delimiter).toBe(',');
            expect(config.output?.format).toBe('table');
        });
        it('設定ファイルから読み込む', async () => {
            const customConfig = {
                dns: {
                    timeout: 10000,
                    servers: ['1.1.1.1', '8.8.8.8']
                },
                output: {
                    format: 'json',
                    colors: false
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(customConfig, null, 2));
            const config = await loadConfig();
            expect(config.dns?.timeout).toBe(10000);
            expect(config.dns?.servers).toEqual(['1.1.1.1', '8.8.8.8']);
            expect(config.output?.format).toBe('json');
            expect(config.output?.colors).toBe(false);
        });
        it('環境変数から設定を上書き', async () => {
            process.env.DNSWEEPER_DNS_TIMEOUT = '7000';
            process.env.DNSWEEPER_OUTPUT_FORMAT = 'csv';
            process.env.NO_COLOR = '1';
            const config = await loadConfig();
            expect(config.dns?.timeout).toBe(7000);
            expect(config.output?.format).toBe('csv');
            expect(config.output?.colors).toBe(false);
            // 環境変数をクリーンアップ
            delete process.env.DNSWEEPER_DNS_TIMEOUT;
            delete process.env.DNSWEEPER_OUTPUT_FORMAT;
            delete process.env.NO_COLOR;
        });
        it('指定されたパスから設定ファイルを読み込む', async () => {
            const customPath = path.join(testDir, 'custom-config.json');
            const customConfig = {
                risk: {
                    thresholds: {
                        high: 80,
                        medium: 50
                    }
                }
            };
            fs.writeFileSync(customPath, JSON.stringify(customConfig, null, 2));
            const config = await loadConfig(customPath);
            expect(config.risk?.thresholds?.high).toBe(80);
            expect(config.risk?.thresholds?.medium).toBe(50);
        });
        it('親ディレクトリから設定ファイルを検索', async () => {
            const parentConfig = {
                csv: {
                    encoding: 'utf16le'
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(parentConfig, null, 2));
            // サブディレクトリに移動
            const subDir = path.join(testDir, 'subdir');
            fs.mkdirSync(subDir);
            process.chdir(subDir);
            const config = await loadConfig();
            expect(config.csv?.encoding).toBe('utf16le');
        });
        it('不正なJSONファイルでエラー', async () => {
            fs.writeFileSync(configPath, '{ invalid json }');
            await expect(loadConfig()).rejects.toThrow();
        });
    });
    describe('saveConfig', () => {
        it('設定をファイルに保存', async () => {
            const config = {
                dns: {
                    timeout: 8000,
                    concurrent: 20
                },
                api: {
                    cloudflare: {
                        apiKey: 'test-key',
                        email: 'test@example.com'
                    }
                }
            };
            await saveConfig(config, configPath);
            const savedContent = fs.readFileSync(configPath, 'utf8');
            const savedConfig = JSON.parse(savedContent);
            expect(savedConfig.dns.timeout).toBe(8000);
            expect(savedConfig.dns.concurrent).toBe(20);
            expect(savedConfig.api.cloudflare.apiKey).toBe('test-key');
        });
        it('指定されたパスに設定を保存', async () => {
            const customPath = path.join(testDir, 'output-config.json');
            const config = {
                output: {
                    format: 'csv',
                    verbose: true
                }
            };
            await saveConfig(config, customPath);
            expect(fs.existsSync(customPath)).toBe(true);
            const savedContent = fs.readFileSync(customPath, 'utf8');
            const savedConfig = JSON.parse(savedContent);
            expect(savedConfig.output.format).toBe('csv');
        });
    });
    describe('validateConfig', () => {
        it('有効な設定を検証', () => {
            const config = {
                dns: {
                    timeout: 5000,
                    retries: 3
                },
                risk: {
                    weights: {
                        unusedDays: 0.4,
                        namingPattern: 0.3,
                        ttl: 0.3
                    },
                    thresholds: {
                        high: 70,
                        medium: 40
                    }
                }
            };
            expect(() => validateConfig(config)).not.toThrow();
        });
        it('負のタイムアウト値でエラー', () => {
            const config = {
                dns: {
                    timeout: -1000
                }
            };
            expect(() => validateConfig(config)).toThrow('DNS timeout must be positive');
        });
        it('リスク重みの合計が1.0でない場合エラー', () => {
            const config = {
                risk: {
                    weights: {
                        unusedDays: 0.5,
                        namingPattern: 0.3,
                        ttl: 0.3 // 合計1.1
                    }
                }
            };
            expect(() => validateConfig(config)).toThrow('Risk weights must sum to 1.0');
        });
        it('高リスクしきい値が中リスクより低い場合エラー', () => {
            const config = {
                risk: {
                    thresholds: {
                        high: 30,
                        medium: 50
                    }
                }
            };
            expect(() => validateConfig(config)).toThrow('High risk threshold must be greater than medium threshold');
        });
    });
    describe('深いマージ', () => {
        it('ネストされたオブジェクトを正しくマージ', async () => {
            const fileConfig = {
                dns: {
                    timeout: 6000,
                    servers: ['1.1.1.1']
                },
                output: {
                    format: 'json'
                }
            };
            fs.writeFileSync(configPath, JSON.stringify(fileConfig, null, 2));
            process.env.DNSWEEPER_DNS_SERVERS = '8.8.8.8,8.8.4.4';
            process.env.DNSWEEPER_OUTPUT_FORMAT = 'csv';
            const config = await loadConfig();
            // 環境変数が優先される
            expect(config.dns?.servers).toEqual(['8.8.8.8', '8.8.4.4']);
            expect(config.output?.format).toBe('csv');
            // ファイルの設定は保持される
            expect(config.dns?.timeout).toBe(6000);
            // デフォルト値も保持される
            expect(config.dns?.retries).toBe(3);
            delete process.env.DNSWEEPER_DNS_SERVERS;
            delete process.env.DNSWEEPER_OUTPUT_FORMAT;
        });
    });
    describe('API認証情報の環境変数', () => {
        it('Cloudflare認証情報を環境変数から読み込み', async () => {
            process.env.CLOUDFLARE_API_KEY = 'test-api-key';
            process.env.CLOUDFLARE_EMAIL = 'test@example.com';
            const config = await loadConfig();
            expect(config.api?.cloudflare?.apiKey).toBe('test-api-key');
            expect(config.api?.cloudflare?.email).toBe('test@example.com');
            delete process.env.CLOUDFLARE_API_KEY;
            delete process.env.CLOUDFLARE_EMAIL;
        });
        it('AWS認証情報を環境変数から読み込み', async () => {
            process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
            process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
            const config = await loadConfig();
            expect(config.api?.route53?.accessKeyId).toBe('test-access-key');
            expect(config.api?.route53?.secretAccessKey).toBe('test-secret-key');
            delete process.env.AWS_ACCESS_KEY_ID;
            delete process.env.AWS_SECRET_ACCESS_KEY;
        });
    });
});
//# sourceMappingURL=config.test.js.map