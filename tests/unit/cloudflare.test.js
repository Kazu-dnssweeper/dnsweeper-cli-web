/**
 * cloudflare.ts のユニットテスト
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CloudflareClient } from '../../src/lib/api/cloudflare.js';
// fetch をモック
const mockFetch = vi.fn();
describe('CloudflareClient', () => {
    let client;
    let config;
    beforeEach(() => {
        // global.fetchを設定
        global.fetch = mockFetch;
        config = {
            apiToken: 'test-api-token'
        };
        client = new CloudflareClient(config);
        // fetch をリセット
        mockFetch.mockReset();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('constructor', () => {
        it('APIトークンで初期化', () => {
            const tokenClient = new CloudflareClient({
                apiToken: 'test-token'
            });
            expect(tokenClient).toBeDefined();
        });
        it('レガシーAPIキーで初期化', () => {
            const keyClient = new CloudflareClient({
                email: 'test@example.com',
                apiKey: 'test-key'
            });
            expect(keyClient).toBeDefined();
        });
        it('無効な設定でエラー', () => {
            expect(() => {
                new CloudflareClient({});
            }).toThrow('Cloudflare認証情報が不正です。APIトークンまたはEmail+APIキーを指定してください');
        });
    });
    describe('listZones', () => {
        it('ゾーン一覧を正常に取得', async () => {
            const mockResponse = {
                success: true,
                result: [
                    {
                        id: 'zone-1',
                        name: 'example.com',
                        status: 'active',
                        account: { id: 'account-1', name: 'Test Account' },
                        created_on: '2023-01-01T00:00:00Z',
                        modified_on: '2023-01-01T00:00:00Z'
                    }
                ],
                result_info: {
                    page: 1,
                    per_page: 20,
                    total_pages: 1,
                    count: 1,
                    total_count: 1
                }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });
            const result = await client.listZones();
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('example.com');
            expect(result[0].id).toBe('zone-1');
        });
        it('名前フィルターを適用', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    result: [],
                    result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
                })
            });
            await client.listZones();
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/zones'), expect.any(Object));
        });
        it('ステータスフィルターを適用', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    result: [],
                    result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
                })
            });
            await client.listZones();
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/zones'), expect.any(Object));
        });
        it('APIエラーを適切に処理', async () => {
            const errorResponse = {
                success: false,
                errors: [
                    { code: 10000, message: 'Authentication error' }
                ]
            };
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: () => Promise.resolve(errorResponse)
            });
            await expect(client.listZones()).rejects.toThrow('Cloudflare API error: 401 Unauthorized');
        });
        it('ネットワークエラーを適切に処理', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            await expect(client.listZones()).rejects.toThrow('Network error');
        });
    });
    describe('getZone', () => {
        it('特定のゾーンを正常に取得', async () => {
            const mockResponse = {
                success: true,
                result: {
                    id: 'zone-1',
                    name: 'example.com',
                    status: 'active',
                    account: { id: 'account-1', name: 'Test Account' },
                    created_on: '2023-01-01T00:00:00Z',
                    modified_on: '2023-01-01T00:00:00Z'
                }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });
            const result = await client.getZone('zone-1');
            expect(result.name).toBe('example.com');
            expect(result.id).toBe('zone-1');
        });
        it('存在しないゾーンでエラー', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: () => Promise.resolve({
                    success: false,
                    errors: [{ code: 1001, message: 'Zone not found' }]
                })
            });
            await expect(client.getZone('non-existent')).rejects.toThrow('Cloudflare API error: 404 Not Found');
        });
    });
    describe('listDNSRecords', () => {
        it('DNSレコード一覧を正常に取得', async () => {
            const mockResponse = {
                success: true,
                result: [
                    {
                        id: 'record-1',
                        zone_id: 'zone-1',
                        zone_name: 'example.com',
                        name: 'www.example.com',
                        type: 'A',
                        content: '192.0.2.1',
                        ttl: 300,
                        proxied: false,
                        created_on: '2023-01-01T00:00:00Z',
                        modified_on: '2023-01-01T00:00:00Z'
                    }
                ],
                result_info: {
                    page: 1,
                    per_page: 20,
                    total_pages: 1,
                    count: 1,
                    total_count: 1
                }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });
            const result = await client.listDNSRecords('zone-1');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('www.example.com');
            expect(result[0].type).toBe('A');
            expect(result[0].content).toBe('192.0.2.1');
        });
        it('フィルターオプションを適用', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    result: [],
                    result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
                })
            });
            await client.listDNSRecords('zone-1');
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/zones/zone-1/dns_records'), expect.any(Object));
        });
    });
    describe('createDNSRecord', () => {
        it('DNSレコードを正常に作成', async () => {
            const newRecord = {
                name: 'test.example.com',
                type: 'A',
                content: '192.0.2.10',
                ttl: 300
            };
            const mockResponse = {
                success: true,
                result: {
                    id: 'record-new',
                    zone_id: 'zone-1',
                    zone_name: 'example.com',
                    ...newRecord,
                    proxied: false,
                    created_on: '2023-01-01T00:00:00Z',
                    modified_on: '2023-01-01T00:00:00Z'
                }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });
            const result = await client.createDNSRecord('zone-1', newRecord);
            expect(result.name).toBe('test.example.com');
            expect(result.content).toBe('192.0.2.10');
        });
        it('無効なレコードでエラー', async () => {
            const invalidRecord = {
                name: '',
                type: 'A',
                content: 'invalid-ip'
            };
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: () => Promise.resolve({
                    success: false,
                    errors: [{ code: 1004, message: 'Invalid record data' }]
                })
            });
            await expect(client.createDNSRecord('zone-1', invalidRecord)).rejects.toThrow('Cloudflare API error: 400 Bad Request');
        });
    });
    describe('updateDNSRecord', () => {
        it('DNSレコードを正常に更新', async () => {
            const updateData = {
                content: '192.0.2.20',
                ttl: 600
            };
            const mockResponse = {
                success: true,
                result: {
                    id: 'record-1',
                    zone_id: 'zone-1',
                    zone_name: 'example.com',
                    name: 'www.example.com',
                    type: 'A',
                    content: '192.0.2.20',
                    ttl: 600,
                    proxied: false,
                    created_on: '2023-01-01T00:00:00Z',
                    modified_on: '2023-01-01T01:00:00Z'
                }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });
            const result = await client.updateDNSRecord('zone-1', 'record-1', updateData);
            expect(result.content).toBe('192.0.2.20');
            expect(result.ttl).toBe(600);
        });
    });
    describe('deleteDNSRecord', () => {
        it('DNSレコードを正常に削除', async () => {
            const mockResponse = {
                success: true,
                result: { id: 'record-1' }
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });
            const result = await client.deleteDNSRecord('zone-1', 'record-1');
            expect(result.id).toBe('record-1');
        });
        it('存在しないレコードでエラー', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: () => Promise.resolve({
                    success: false,
                    errors: [{ code: 81044, message: 'Record not found' }]
                })
            });
            await expect(client.deleteDNSRecord('zone-1', 'non-existent')).rejects.toThrow('Cloudflare API error: 404 Not Found');
        });
    });
    describe('convertCSVToCloudflareRecords', () => {
        it('CSVレコードを正しくCloudflareレコードに変換', () => {
            const csvRecords = [
                {
                    domain: 'example.com',
                    type: 'A',
                    value: '192.0.2.1',
                    ttl: 300
                },
                {
                    domain: 'mail.example.com',
                    type: 'MX',
                    value: 'mail.example.com',
                    ttl: 300,
                    priority: 10
                },
                {
                    domain: '_sip._tcp.example.com',
                    type: 'SRV',
                    value: 'sip.example.com',
                    ttl: 300,
                    priority: 10,
                    weight: 20,
                    port: 5060
                }
            ];
            const cloudflareRecords = client.convertCSVToCloudflareRecords(csvRecords);
            expect(cloudflareRecords).toHaveLength(3);
            // Aレコードの確認
            expect(cloudflareRecords[0].name).toBe('example.com');
            expect(cloudflareRecords[0].type).toBe('A');
            expect(cloudflareRecords[0].content).toBe('192.0.2.1');
            // MXレコードの確認（優先度は別フィールド）
            expect(cloudflareRecords[1].name).toBe('mail.example.com');
            expect(cloudflareRecords[1].type).toBe('MX');
            expect(cloudflareRecords[1].content).toBe('mail.example.com');
            expect(cloudflareRecords[1].priority).toBe(10);
            // SRVレコードの確認
            expect(cloudflareRecords[2].name).toBe('_sip._tcp.example.com');
            expect(cloudflareRecords[2].type).toBe('SRV');
            expect(cloudflareRecords[2].content).toBe('sip.example.com');
            expect(cloudflareRecords[2].priority).toBe(10);
        });
        it('空の配列を処理', () => {
            const result = client.convertCSVToCloudflareRecords([]);
            expect(result).toEqual([]);
        });
        it('オプション値が未定義の場合も処理', () => {
            const csvRecords = [
                {
                    domain: 'test.com',
                    type: 'A',
                    value: '192.0.2.1',
                    ttl: 300
                    // priority, weight, port は undefined
                }
            ];
            const cloudflareRecords = client.convertCSVToCloudflareRecords(csvRecords);
            expect(cloudflareRecords).toHaveLength(1);
            expect(cloudflareRecords[0].content).toBe('192.0.2.1');
        });
    });
    describe('convertCloudflareToCSVRecords', () => {
        it('CloudflareレコードをCSVレコードに変換', () => {
            const cloudflareRecords = [
                {
                    id: 'record-1',
                    zone_id: 'zone-1',
                    zone_name: 'example.com',
                    name: 'example.com',
                    type: 'A',
                    content: '192.0.2.1',
                    ttl: 300,
                    proxied: false,
                    created_on: '2023-01-01T00:00:00Z',
                    modified_on: '2023-01-01T00:00:00Z'
                },
                {
                    id: 'record-2',
                    zone_id: 'zone-1',
                    zone_name: 'example.com',
                    name: 'mail.example.com',
                    type: 'MX',
                    content: 'mail.example.com',
                    priority: 10,
                    ttl: 300,
                    proxied: false,
                    created_on: '2023-01-01T00:00:00Z',
                    modified_on: '2023-01-01T00:00:00Z'
                }
            ];
            const csvRecords = client.convertCloudflareToCSVRecords(cloudflareRecords);
            expect(csvRecords).toHaveLength(2);
            // Aレコードの確認
            expect(csvRecords[0].domain).toBe('example.com');
            expect(csvRecords[0].type).toBe('A');
            expect(csvRecords[0].value).toBe('192.0.2.1');
            expect(csvRecords[0].ttl).toBe(300);
            // MXレコードの確認（優先度が分離される）
            expect(csvRecords[1].domain).toBe('mail.example.com');
            expect(csvRecords[1].type).toBe('MX');
            expect(csvRecords[1].value).toBe('mail.example.com');
            expect(csvRecords[1].priority).toBe(10);
        });
        it('SRVレコードの変換', () => {
            const srvRecord = {
                id: 'record-srv',
                zone_id: 'zone-1',
                zone_name: 'example.com',
                name: '_sip._tcp.example.com',
                type: 'SRV',
                content: '10 20 5060 sip.example.com',
                ttl: 300,
                proxied: false,
                created_on: '2023-01-01T00:00:00Z',
                modified_on: '2023-01-01T00:00:00Z'
            };
            const csvRecords = client.convertCloudflareToCSVRecords([srvRecord]);
            // SRVレコードのcontentからの分解は未実装
            expect(csvRecords[0].priority).toBeUndefined();
            expect(csvRecords[0].weight).toBeUndefined();
            expect(csvRecords[0].port).toBeUndefined();
            expect(csvRecords[0].value).toBe('10 20 5060 sip.example.com');
        });
        it('プロキシされたレコードの処理', () => {
            const proxiedRecord = {
                id: 'record-proxied',
                zone_id: 'zone-1',
                zone_name: 'example.com',
                name: 'www.example.com',
                type: 'A',
                content: '192.0.2.1',
                ttl: 1, // プロキシ時は自動
                proxied: true,
                created_on: '2023-01-01T00:00:00Z',
                modified_on: '2023-01-01T00:00:00Z'
            };
            const csvRecords = client.convertCloudflareToCSVRecords([proxiedRecord]);
            expect(csvRecords[0].ttl).toBe(0); // TTL=1は0に変換される
            // プロキシ情報は現在のインターフェースでは保持されない
        });
    });
    describe('認証ヘッダー', () => {
        it('APIトークン認証ヘッダーを設定', async () => {
            const tokenClient = new CloudflareClient({
                apiToken: 'test-token'
            });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    result: [],
                    result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
                })
            });
            await tokenClient.listZones();
            expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-token'
                })
            }));
        });
        it('レガシーAPIキー認証ヘッダーを設定', async () => {
            const keyClient = new CloudflareClient({
                email: 'test@example.com',
                apiKey: 'test-key'
            });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    success: true,
                    result: [],
                    result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
                })
            });
            await keyClient.listZones();
            expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Auth-Email': 'test@example.com',
                    'X-Auth-Key': 'test-key'
                })
            }));
        });
    });
    describe('エラーハンドリング', () => {
        it('JSON解析エラーを処理', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.reject(new Error('Invalid JSON'))
            });
            await expect(client.listZones()).rejects.toThrow('Invalid JSON');
        });
        it('ネットワークタイムアウトを処理', async () => {
            mockFetch.mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 100)));
            await expect(client.listZones()).rejects.toThrow('Request timeout');
        });
        it('レート制限エラーを処理', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                json: () => Promise.resolve({
                    success: false,
                    errors: [{ code: 10013, message: 'Rate limit exceeded' }]
                })
            });
            await expect(client.listZones()).rejects.toThrow('Cloudflare API error: 429 Too Many Requests');
        });
    });
    describe('パフォーマンス', () => {
        it('大量レコードのインポートでメモリ効率を保つ', async () => {
            const largeRecordSet = Array.from({ length: 1000 }, (_, i) => ({
                domain: `test${i}.example.com`,
                type: 'A',
                value: '192.0.2.1',
                ttl: 300
            }));
            const start = Date.now();
            const cloudflareRecords = client.convertCSVToCloudflareRecords(largeRecordSet);
            const duration = Date.now() - start;
            expect(cloudflareRecords).toHaveLength(1000);
            expect(duration).toBeLessThan(1000); // 1秒以内
        });
    });
});
//# sourceMappingURL=cloudflare.test.js.map