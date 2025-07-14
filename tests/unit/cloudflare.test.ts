/**
 * cloudflare.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CloudflareClient,
  type CloudflareConfig,
  type CloudflareZone,
  type CloudflareDNSRecord,
  type CloudflareResponse
} from '../../src/lib/api/cloudflare.js';
import type { ICSVRecord } from '../../src/types/index.js';

// fetch をモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe.skip('CloudflareClient', () => {
  let client: CloudflareClient;
  let config: CloudflareConfig;

  beforeEach(() => {
    config = {
      apiToken: 'test-api-token',
      email: 'test@example.com',
      apiKey: 'test-api-key'
    };
    client = new CloudflareClient(config);
    
    // fetch をリセットして初期化
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ success: true, result: {} })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('APIトークンで初期化', () => {
      const tokenClient = new CloudflareClient({
        apiToken: 'test-token'
      } as any);
      
      expect(tokenClient).toBeDefined();
    });

    it('レガシーAPIキーで初期化', () => {
      const keyClient = new CloudflareClient({
        email: 'test@example.com',
        apiKey: 'test-key'
      } as any);
      
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
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.listZones();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe('example.com');
      expect(result.data![0].id).toBe('zone-1');
    });

    it('名前フィルターを適用', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          result: [],
          result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
        })
      } as any);

      await client.listZones({ name: 'test.com' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('name=test.com'),
        expect.any(Object)
      );
    });

    it('ステータスフィルターを適用', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          result: [],
          result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
        })
      } as any);

      await client.listZones({ status: 'active' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=active'),
        expect.any(Object)
      );
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
        json: vi.fn().mockResolvedValue(errorResponse)
      } as any);

      const result = await client.listZones();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication error');
    });

    it('ネットワークエラーを適切に処理', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.listZones();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
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
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.getZone('zone-1');
      
      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('example.com');
      expect(result.data!.id).toBe('zone-1');
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

      const result = await client.getZone('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Zone not found');
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
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.listDNSRecords('zone-1');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe('www.example.com');
      expect(result.data![0].type).toBe('A');
      expect(result.data![0].content).toBe('192.0.2.1');
    });

    it('フィルターオプションを適用', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          result: [],
          result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
        })
      } as any);

      await client.listDNSRecords('zone-1', {
        type: 'A',
        name: 'www.example.com',
        content: '192.0.2.1'
      } as any);
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('type=A'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('name=www.example.com'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('content=192.0.2.1'),
        expect.any(Object)
      );
    });
  });

  describe('createDNSRecord', () => {
    it('DNSレコードを正常に作成', async () => {
      const newRecord: Partial<CloudflareDNSRecord> = {
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
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.createDNSRecord('zone-1', newRecord);
      
      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('test.example.com');
      expect(result.data!.content).toBe('192.0.2.10');
    });

    it('無効なレコードでエラー', async () => {
      const invalidRecord: Partial<CloudflareDNSRecord> = {
        name: '',
        type: 'A',
        content: 'invalid-ip'
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({
          success: false,
          errors: [{ code: 1004, message: 'Invalid record data' }]
        })
      } as any);

      const result = await client.createDNSRecord('zone-1', invalidRecord);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid record data');
    });
  });

  describe('updateDNSRecord', () => {
    it('DNSレコードを正常に更新', async () => {
      const updateData: Partial<CloudflareDNSRecord> = {
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
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.updateDNSRecord('zone-1', 'record-1', updateData);
      
      expect(result.success).toBe(true);
      expect(result.data!.content).toBe('192.0.2.20');
      expect(result.data!.ttl).toBe(600);
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
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.deleteDNSRecord('zone-1', 'record-1');
      
      expect(result.success).toBe(true);
      expect(result.data!.id).toBe('record-1');
    });

    it('存在しないレコードでエラー', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({
          success: false,
          errors: [{ code: 81044, message: 'Record not found' }]
        })
      } as any);

      const result = await client.deleteDNSRecord('zone-1', 'non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Record not found');
    });
  });

  describe('convertCSVToCloudflareRecords', () => {
    it('CSVレコードを正しくCloudflareレコードに変換', () => {
      const csvRecords: ICSVRecord[] = [
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
      
      // MXレコードの確認（優先度が含まれる）
      expect(cloudflareRecords[1].name).toBe('mail.example.com');
      expect(cloudflareRecords[1].type).toBe('MX');
      expect(cloudflareRecords[1].content).toBe('10 mail.example.com');
      
      // SRVレコードの確認（優先度・重み・ポートが含まれる）
      expect(cloudflareRecords[2].name).toBe('_sip._tcp.example.com');
      expect(cloudflareRecords[2].type).toBe('SRV');
      expect(cloudflareRecords[2].content).toBe('10 20 5060 sip.example.com');
    });

    it('空の配列を処理', () => {
      const result = client.convertCSVToCloudflareRecords([]);
      expect(result).toEqual([]);
    });

    it('オプション値が未定義の場合も処理', () => {
      const csvRecords: ICSVRecord[] = [
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
      const cloudflareRecords: CloudflareDNSRecord[] = [
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
          content: '10 mail.example.com',
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
      const srvRecord: CloudflareDNSRecord = {
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
      
      expect(csvRecords[0].priority).toBe(10);
      expect(csvRecords[0].weight).toBe(20);
      expect(csvRecords[0].port).toBe(5060);
      expect(csvRecords[0].value).toBe('sip.example.com');
    });

    it('プロキシされたレコードの処理', () => {
      const proxiedRecord: CloudflareDNSRecord = {
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
      
      expect(csvRecords[0].ttl).toBe(1);
      // プロキシ情報は現在のインターフェースでは保持されない
    });
  });

  describe('importRecords', () => {
    it('レコードを正常にインポート', async () => {
      const csvRecords: ICSVRecord[] = [
        {
          domain: 'import1.example.com',
          type: 'A',
          value: '192.0.2.1',
          ttl: 300
        },
        {
          domain: 'import2.example.com',
          type: 'A',
          value: '192.0.2.2',
          ttl: 300
        }
      ];

      // 各レコード作成のモック
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          result: {
            id: 'new-record',
            zone_id: 'zone-1',
            zone_name: 'example.com',
            name: 'test.example.com',
            type: 'A',
            content: '192.0.2.1',
            ttl: 300,
            proxied: false,
            created_on: '2023-01-01T00:00:00Z',
            modified_on: '2023-01-01T00:00:00Z'
          }
        })
      } as any);

      const result = await client.importRecords('zone-1', csvRecords);
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('一部失敗を含むインポート', async () => {
      const csvRecords: ICSVRecord[] = [
        {
          domain: 'success.example.com',
          type: 'A',
          value: '192.0.2.1',
          ttl: 300
        },
        {
          domain: 'fail.example.com',
          type: 'A',
          value: 'invalid-ip',
          ttl: 300
        }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            success: true,
            result: { id: 'success-record' }
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: vi.fn().mockResolvedValue({
            success: false,
            errors: [{ code: 1004, message: 'Invalid IP' }]
          })
        } as any);

      const result = await client.importRecords('zone-1', csvRecords);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid IP');
    });

    it('空の配列のインポート', async () => {
      const result = await client.importRecords('zone-1', []);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('exportRecords', () => {
    it('レコードを正常にエクスポート', async () => {
      const mockDNSRecords: CloudflareDNSRecord[] = [
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
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          result: mockDNSRecords,
          result_info: { page: 1, per_page: 20, total_pages: 1, count: 1, total_count: 1 }
        })
      } as any);

      const result = await client.exportRecords('zone-1');
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].domain).toBe('www.example.com');
      expect(result.data![0].type).toBe('A');
      expect(result.data![0].value).toBe('192.0.2.1');
    });

    it('フィルターオプション付きエクスポート', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          result: [],
          result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
        })
      } as any);

      await client.exportRecords('zone-1', { type: 'A' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('type=A'),
        expect.any(Object)
      );
    });
  });

  describe('認証ヘッダー', () => {
    it('APIトークン認証ヘッダーを設定', async () => {
      const tokenClient = new CloudflareClient({
        apiToken: 'test-token'
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          result: [],
          result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
        })
      } as any);

      await tokenClient.listZones();
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('レガシーAPIキー認証ヘッダーを設定', async () => {
      const keyClient = new CloudflareClient({
        email: 'test@example.com',
        apiKey: 'test-key'
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          result: [],
          result_info: { page: 1, per_page: 20, total_pages: 1, count: 0, total_count: 0 }
        })
      } as any);

      await keyClient.listZones();
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Auth-Email': 'test@example.com',
            'X-Auth-Key': 'test-key'
          })
        })
      );
    });
  });

  describe('エラーハンドリング', () => {
    it('JSON解析エラーを処理', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any);

      const result = await client.listZones();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON');
    });

    it('ネットワークタイムアウトを処理', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const result = await client.listZones();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('レート制限エラーを処理', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: vi.fn().mockResolvedValue({
          success: false,
          errors: [{ code: 10013, message: 'Rate limit exceeded' }]
        })
      } as any);

      const result = await client.listZones();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });
  });

  describe('パフォーマンス', () => {
    it('大量レコードのインポートでメモリ効率を保つ', async () => {
      const largeRecordSet: ICSVRecord[] = Array.from({ length: 1000 }, (_, i) => ({
        domain: `test${i}.example.com`,
        type: 'A' as const,
        value: '192.0.2.1',
        ttl: 300
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          success: true,
          result: { id: 'test-record' }
        })
      } as any);

      const start = Date.now();
      const result = await client.importRecords('zone-1', largeRecordSet);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(30000); // 30秒以内
    });
  });
});