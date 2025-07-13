import { describe, it, expect, vi } from 'vitest';
import { DnsSweeperError, DnsResolutionError, CsvProcessingError, ConfigurationError, ValidationError, ApiError, FileOperationError, TimeoutError, ErrorHandler } from '../../src/lib/errors.js';
import { withRetry, withTimeout } from '../../src/utils/retry.js';
describe('エラーハンドリング統合テスト', () => {
    describe('カスタムエラークラス', () => {
        it('DnsSweeperError の基本動作', () => {
            const error = new DnsSweeperError('テストエラー', 'TEST_ERROR', {
                detail: 'テスト詳細'
            });
            expect(error.message).toBe('テストエラー');
            expect(error.code).toBe('TEST_ERROR');
            expect(error.details?.detail).toBe('テスト詳細');
            expect(error.name).toBe('DnsSweeperError');
        });
        it('toDetailedString メソッドで詳細情報を表示', () => {
            const error = new DnsSweeperError('エラーメッセージ', 'ERROR_CODE', {
                file: 'test.csv',
                line: 42
            });
            const detailed = error.toDetailedString();
            expect(detailed).toContain('DnsSweeperError [ERROR_CODE]: エラーメッセージ');
            expect(detailed).toContain('file: "test.csv"');
            expect(detailed).toContain('line: 42');
        });
        it('各種エラークラスのインスタンス生成', () => {
            const dnsError = new DnsResolutionError('DNS解決失敗');
            expect(dnsError.code).toBe('DNS_RESOLUTION_ERROR');
            const csvError = new CsvProcessingError('CSV解析エラー');
            expect(csvError.code).toBe('CSV_PROCESSING_ERROR');
            const configError = new ConfigurationError('設定エラー');
            expect(configError.code).toBe('CONFIGURATION_ERROR');
            const validationError = new ValidationError('検証エラー');
            expect(validationError.code).toBe('VALIDATION_ERROR');
            const apiError = new ApiError('APIエラー', 404);
            expect(apiError.code).toBe('API_ERROR');
            expect(apiError.statusCode).toBe(404);
            const fileError = new FileOperationError('ファイルエラー');
            expect(fileError.code).toBe('FILE_OPERATION_ERROR');
            const timeoutError = new TimeoutError('タイムアウト');
            expect(timeoutError.code).toBe('TIMEOUT_ERROR');
        });
    });
    describe('ErrorHandler ユーティリティ', () => {
        it('エラーをラップして詳細情報を追加', () => {
            const originalError = new Error('元のエラー');
            const wrapped = ErrorHandler.wrap(originalError, 'コンテキスト', {
                additionalInfo: 'test'
            });
            expect(wrapped.message).toBe('コンテキスト: 元のエラー');
            expect(wrapped.code).toBe('WRAPPED_ERROR');
            expect(wrapped.details?.originalError).toBe('Error');
            expect(wrapped.details?.additionalInfo).toBe('test');
        });
        it('DnsSweeperError をラップする場合は詳細を保持', () => {
            const originalError = new DnsResolutionError('DNS失敗', { domain: 'example.com' });
            const wrapped = ErrorHandler.wrap(originalError, '新しいコンテキスト', {
                retry: 3
            });
            expect(wrapped.message).toBe('新しいコンテキスト: DNS失敗');
            expect(wrapped.code).toBe('DNS_RESOLUTION_ERROR');
            expect(wrapped.details?.domain).toBe('example.com');
            expect(wrapped.details?.retry).toBe(3);
        });
        it('未知のエラータイプをラップ', () => {
            const wrapped = ErrorHandler.wrap('文字列エラー', 'コンテキスト');
            expect(wrapped.message).toBe('コンテキスト: 不明なエラーが発生しました');
            expect(wrapped.code).toBe('UNKNOWN_ERROR');
            expect(wrapped.details?.error).toBe('文字列エラー');
        });
        it('ユーザーフレンドリーなメッセージを生成', () => {
            const dnsError = new DnsResolutionError('ENOTFOUND');
            expect(ErrorHandler.getUserFriendlyMessage(dnsError))
                .toBe('DNS解決エラー: ENOTFOUND');
            const apiError = new ApiError('Unauthorized', 401);
            expect(ErrorHandler.getUserFriendlyMessage(apiError))
                .toBe('APIエラー: Unauthorized (ステータスコード: 401)');
            const unknownError = new Error('Something went wrong');
            expect(ErrorHandler.getUserFriendlyMessage(unknownError))
                .toBe('エラー: Something went wrong');
            expect(ErrorHandler.getUserFriendlyMessage('文字列'))
                .toBe('予期しないエラーが発生しました');
        });
        it('リトライ可能なエラーを判定', () => {
            const timeoutError = new TimeoutError('タイムアウト');
            expect(ErrorHandler.isRetryable(timeoutError)).toBe(true);
            const dnsRetryableError = new DnsResolutionError('一時的エラー', { code: 'ETIMEDOUT' });
            expect(ErrorHandler.isRetryable(dnsRetryableError)).toBe(true);
            const dnsNonRetryableError = new DnsResolutionError('恒久的エラー', { code: 'NXDOMAIN' });
            expect(ErrorHandler.isRetryable(dnsNonRetryableError)).toBe(false);
            const apiRetryableError = new ApiError('Server Error', 503);
            expect(ErrorHandler.isRetryable(apiRetryableError)).toBe(true);
            const apiRateLimitError = new ApiError('Too Many Requests', 429);
            expect(ErrorHandler.isRetryable(apiRateLimitError)).toBe(true);
            const apiNonRetryableError = new ApiError('Bad Request', 400);
            expect(ErrorHandler.isRetryable(apiNonRetryableError)).toBe(false);
        });
        it('エラーの重要度を判定', () => {
            const configError = new ConfigurationError('設定ミス');
            expect(ErrorHandler.getSeverity(configError)).toBe('critical');
            const validationError = new ValidationError('入力エラー');
            expect(ErrorHandler.getSeverity(validationError)).toBe('critical');
            const serverError = new ApiError('Server Error', 500);
            expect(ErrorHandler.getSeverity(serverError)).toBe('error');
            const timeoutError = new TimeoutError('タイムアウト');
            expect(ErrorHandler.getSeverity(timeoutError)).toBe('warning');
            const genericError = new Error('一般的なエラー');
            expect(ErrorHandler.getSeverity(genericError)).toBe('error');
        });
    });
    describe('リトライ機能', () => {
        it('成功するまでリトライ', async () => {
            let attempts = 0;
            const fn = vi.fn(async () => {
                attempts++;
                if (attempts < 3) {
                    throw new TimeoutError('タイムアウト');
                }
                return 'success';
            });
            const result = await withRetry(fn, {
                maxAttempts: 3,
                delay: 10
            });
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(3);
        });
        it('リトライ不可能なエラーでは即座に失敗', async () => {
            const fn = vi.fn(async () => {
                throw new ValidationError('検証エラー');
            });
            await expect(withRetry(fn, {
                maxAttempts: 3,
                delay: 10
            })).rejects.toThrow('検証エラー');
            expect(fn).toHaveBeenCalledTimes(1);
        });
        it('最大試行回数を超えたら最後のエラーを投げる', async () => {
            const fn = vi.fn(async () => {
                throw new TimeoutError('タイムアウト');
            });
            await expect(withRetry(fn, {
                maxAttempts: 2,
                delay: 10
            })).rejects.toThrow('タイムアウト');
            expect(fn).toHaveBeenCalledTimes(2);
        });
        it('リトライコールバックが呼ばれる', async () => {
            const onRetry = vi.fn();
            const fn = vi.fn(async () => {
                throw new TimeoutError('タイムアウト');
            });
            await expect(withRetry(fn, {
                maxAttempts: 2,
                delay: 10,
                onRetry
            })).rejects.toThrow();
            expect(onRetry).toHaveBeenCalledTimes(1);
            expect(onRetry).toHaveBeenCalledWith(1, expect.any(TimeoutError));
        });
        it('指数バックオフ', async () => {
            const startTime = Date.now();
            let attempts = 0;
            const fn = vi.fn(async () => {
                attempts++;
                if (attempts < 3) {
                    throw new TimeoutError('タイムアウト');
                }
                return 'success';
            });
            await withRetry(fn, {
                maxAttempts: 3,
                delay: 50,
                backoff: 'exponential'
            });
            const elapsed = Date.now() - startTime;
            // 50ms (1回目) + 100ms (2回目) = 150ms 以上（ジッター考慮）
            expect(elapsed).toBeGreaterThan(120);
        });
    });
    describe('タイムアウト機能', () => {
        it('タイムアウト前に完了', async () => {
            const fn = async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return 'completed';
            };
            const result = await withTimeout(fn, 100);
            expect(result).toBe('completed');
        });
        it('タイムアウトでエラー', async () => {
            const fn = async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
                return 'completed';
            };
            await expect(withTimeout(fn, 100, 'カスタムタイムアウトメッセージ'))
                .rejects.toThrow('カスタムタイムアウトメッセージ');
        });
    });
    describe('実際の使用例', () => {
        it('DNS解決でのエラーハンドリング', async () => {
            // DNS解決をシミュレート
            const resolveDns = async (domain) => {
                if (domain === 'timeout.example.com') {
                    throw new TimeoutError('DNS解決タイムアウト', { domain });
                }
                if (domain === 'invalid.example.com') {
                    throw new DnsResolutionError('NXDOMAIN', { domain, code: 'NXDOMAIN' });
                }
                return { address: '192.168.1.1' };
            };
            // タイムアウトエラーはリトライ可能
            const timeoutFn = () => resolveDns('timeout.example.com');
            await expect(withRetry(timeoutFn, { maxAttempts: 2, delay: 10 }))
                .rejects.toThrow('DNS解決タイムアウト');
            // NXDOMAINはリトライ不可
            const invalidFn = () => resolveDns('invalid.example.com');
            await expect(withRetry(invalidFn, { maxAttempts: 3, delay: 10 }))
                .rejects.toThrow('NXDOMAIN');
        });
        it('CSV処理でのエラーハンドリング', async () => {
            const processCsv = async (path) => {
                if (path === 'not-found.csv') {
                    throw new FileOperationError('ファイルが見つかりません', { path });
                }
                if (path === 'invalid.csv') {
                    throw new CsvProcessingError('不正なCSV形式', { path, line: 5 });
                }
                return { records: 100 };
            };
            try {
                await processCsv('invalid.csv');
            }
            catch (error) {
                const message = ErrorHandler.getUserFriendlyMessage(error);
                expect(message).toBe('CSV処理エラー: 不正なCSV形式');
                if (error instanceof CsvProcessingError) {
                    expect(error.details?.line).toBe(5);
                }
            }
        });
    });
});
//# sourceMappingURL=error-handling.test.js.map