/**
 * analyze コマンドのユニットテスト
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
// コマンド実行のテスト用モック
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined);
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => { });
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
describe('analyze command', () => {
    let tempFiles = [];
    beforeEach(() => {
        vi.clearAllMocks();
        mockExit.mockClear();
        mockConsoleLog.mockClear();
        mockConsoleError.mockClear();
    });
    afterEach(async () => {
        // テスト用一時ファイルをクリーンアップ
        for (const file of tempFiles) {
            try {
                if (existsSync(file)) {
                    await unlink(file);
                }
            }
            catch {
                // ファイルが存在しない場合は無視
            }
        }
        tempFiles = [];
        vi.restoreAllMocks();
    });
    const createTempCsvFile = async (content) => {
        const filePath = join(tmpdir(), `test-analyze-${Date.now()}-${Math.random().toString(36).substring(2)}.csv`);
        tempFiles.push(filePath);
        await writeFile(filePath, content, 'utf-8');
        return filePath;
    };
    describe('リスクスコア分析', () => {
        it('基本的なリスクスコア分析を実行', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
www.example.com,A,192.0.2.1,300,,,
test-server.example.com,A,192.0.2.2,60,,,
mail.example.com,MX,mail.example.com,3600,10,,
old-service.example.com,A,192.0.2.3,86400,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                verbose: false
            });
            // 分析結果が出力されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Risk Analysis'));
            expect(mockExit).not.toHaveBeenCalled();
        });
        it('高リスクドメインを特定', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
dev-test.example.com,A,192.0.2.1,60,,,
staging-old.example.com,A,192.0.2.2,60,,,
production.example.com,A,192.0.2.3,3600,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                verbose: true
            });
            // 高リスクドメインが特定されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('HIGH'));
        });
        it('TTL値による分析', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
short-ttl.example.com,A,192.0.2.1,30,,,
normal-ttl.example.com,A,192.0.2.2,300,,,
long-ttl.example.com,A,192.0.2.3,86400,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                verbose: true
            });
            // TTL分析結果が出力されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('TTL'));
        });
        it('命名パターンによるリスク評価', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
test-api.example.com,A,192.0.2.1,300,,,
dev-service.example.com,A,192.0.2.2,300,,,
old-system.example.com,A,192.0.2.3,300,,,
api.example.com,A,192.0.2.4,300,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                verbose: true
            });
            // 命名パターンリスクが評価されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Pattern'));
        });
    });
    describe('出力フォーマット', () => {
        const sampleCsvContent = `domain,record_type,value,ttl,priority,weight,port
www.example.com,A,192.0.2.1,300,,,
api.example.com,A,192.0.2.2,300,,,`;
        it('テーブル形式で出力', async () => {
            const filePath = await createTempCsvFile(sampleCsvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                verbose: false
            });
            // テーブル形式の出力を確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('│'));
        });
        it('JSON形式で出力', async () => {
            const filePath = await createTempCsvFile(sampleCsvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'json',
                verbose: false
            });
            // JSON形式の出力を確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('{'));
        });
        it('CSV形式で出力', async () => {
            const filePath = await createTempCsvFile(sampleCsvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'csv',
                verbose: false
            });
            // CSV形式のヘッダーを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('domain,'));
        });
    });
    describe('フィルタリング', () => {
        it('リスクレベルフィルター', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
high-risk-test.example.com,A,192.0.2.1,30,,,
low-risk.example.com,A,192.0.2.2,3600,,,
medium-risk-dev.example.com,A,192.0.2.3,300,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                minRisk: 'high',
                verbose: false
            });
            // 高リスクレコードのみ表示されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('high-risk-test'));
        });
        it('レコードタイプフィルター', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
www.example.com,A,192.0.2.1,300,,,
mail.example.com,MX,mail.example.com,300,10,,
ns.example.com,NS,ns1.example.com,3600,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                type: 'A',
                verbose: false
            });
            // Aレコードのみ表示されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('www.example.com'));
        });
        it('ドメインパターンフィルター', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
api.example.com,A,192.0.2.1,300,,,
web.example.com,A,192.0.2.2,300,,,
api.test.com,A,192.0.2.3,300,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                domain: '*example.com',
                verbose: false
            });
            // example.comドメインのみ表示されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('example.com'));
        });
    });
    describe('統計情報', () => {
        it('全体統計を表示', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
www.example.com,A,192.0.2.1,300,,,
api.example.com,A,192.0.2.2,600,,,
mail.example.com,MX,mail.example.com,1200,10,,
test.example.com,A,192.0.2.3,60,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                stats: true,
                verbose: false
            });
            // 統計情報が表示されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Statistics'));
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Total records'));
        });
        it('レコードタイプ別統計', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
www.example.com,A,192.0.2.1,300,,,
api.example.com,A,192.0.2.2,300,,,
mail.example.com,MX,mail.example.com,300,10,,
ns.example.com,NS,ns1.example.com,3600,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                stats: true,
                verbose: true
            });
            // レコードタイプ別統計が表示されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('A records'));
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('MX records'));
        });
        it('TTL分布統計', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
short.example.com,A,192.0.2.1,60,,,
normal.example.com,A,192.0.2.2,300,,,
long.example.com,A,192.0.2.3,3600,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                stats: true,
                verbose: true
            });
            // TTL分布統計が表示されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('TTL distribution'));
        });
    });
    describe('CSV形式サポート', () => {
        it('Cloudflare形式のCSVを分析', async () => {
            const csvContent = `Name,Type,Content,TTL,Priority
www.example.com,A,192.0.2.1,300,
mail.example.com,MX,mail.example.com,300,10
test-service.example.com,A,192.0.2.2,60,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'cloudflare',
                output: 'table',
                verbose: false
            });
            expect(mockExit).not.toHaveBeenCalled();
        });
        it('Route53形式のCSVを分析', async () => {
            const csvContent = `Name,Type,Value,TTL,Weight,SetIdentifier
www.example.com,A,192.0.2.1,300,,
mail.example.com,MX,"10 mail.example.com",300,,
dev-api.example.com,A,192.0.2.2,60,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'route53',
                output: 'table',
                verbose: false
            });
            expect(mockExit).not.toHaveBeenCalled();
        });
        it('フォーマット自動検出', async () => {
            const csvContent = `Name,Type,Content,TTL,Priority
auto.example.com,A,192.0.2.1,300,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'auto',
                output: 'table',
                verbose: false
            });
            expect(mockExit).not.toHaveBeenCalled();
        });
    });
    describe('エラーハンドリング', () => {
        it('存在しないファイルでエラー', async () => {
            const nonExistentFile = '/non/existent/file.csv';
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await expect(async () => {
                await analyzeCommand.action(nonExistentFile, {
                    format: 'generic',
                    output: 'table',
                    verbose: false
                });
            }).rejects.toThrow();
        });
        it('無効なCSVファイルでエラー', async () => {
            const invalidCsvContent = `Invalid,CSV,Format
missing,required,columns`;
            const filePath = await createTempCsvFile(invalidCsvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await expect(async () => {
                await analyzeCommand.action(filePath, {
                    format: 'generic',
                    output: 'table',
                    verbose: false
                });
            }).rejects.toThrow();
        });
        it('空のCSVファイル', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                verbose: false
            });
            // 空のファイルでもエラーにならないことを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No records'));
        });
        it('不正な出力フォーマットでエラー', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
test.example.com,A,192.0.2.1,300,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await expect(async () => {
                await analyzeCommand.action(filePath, {
                    format: 'generic',
                    output: 'invalid-format',
                    verbose: false
                });
            }).rejects.toThrow();
        });
    });
    describe('パフォーマンス', () => {
        it('大容量CSVファイルの分析', async () => {
            // 1000行のCSVファイルを生成
            const headers = 'domain,record_type,value,ttl,priority,weight,port';
            const rows = Array.from({ length: 1000 }, (_, i) => `test${i}.example.com,A,192.0.2.${Math.floor(i / 254) + 1},${300 + (i % 100)},,,`);
            const csvContent = [headers, ...rows].join('\n');
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            const start = Date.now();
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                verbose: false
            });
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(3000); // 3秒以内
            expect(mockExit).not.toHaveBeenCalled();
        }, 10000);
    });
    describe('カスタム設定', () => {
        it('設定ファイルからリスク評価基準を読み込み', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
custom.example.com,A,192.0.2.1,300,,,`;
            const filePath = await createTempCsvFile(csvContent);
            // カスタム設定ファイル
            const configPath = join(tmpdir(), '.dnsweeper.json');
            tempFiles.push(configPath);
            await writeFile(configPath, JSON.stringify({
                analysis: {
                    riskThresholds: {
                        ttl: { low: 3600, high: 300 },
                        naming: { riskPatterns: ['custom-', 'temp-'] }
                    }
                }
            }));
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                verbose: false
            });
            expect(mockExit).not.toHaveBeenCalled();
        });
    });
    describe('レポート生成', () => {
        it('詳細レポートを生成', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
critical-test.example.com,A,192.0.2.1,30,,,
high-dev.example.com,A,192.0.2.2,60,,,
medium.example.com,A,192.0.2.3,600,,,
low.example.com,A,192.0.2.4,3600,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                report: true,
                verbose: true
            });
            // 詳細レポートが生成されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Analysis Report'));
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Recommendations'));
        });
        it('セキュリティレポートを生成', async () => {
            const csvContent = `domain,record_type,value,ttl,priority,weight,port
admin.example.com,A,192.0.2.1,300,,,
test-admin.example.com,A,192.0.2.2,300,,,
old-api.example.com,A,192.0.2.3,300,,,`;
            const filePath = await createTempCsvFile(csvContent);
            const { analyzeCommand } = await import('../../src/commands/analyze.js');
            await analyzeCommand.action(filePath, {
                format: 'generic',
                output: 'table',
                security: true,
                verbose: true
            });
            // セキュリティ分析結果が出力されることを確認
            expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Security Analysis'));
        });
    });
});
//# sourceMappingURL=analyze-command.test.js.map