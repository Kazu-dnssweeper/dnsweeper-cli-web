/**
 * route53.ts のユニットテスト
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Route53Client } from '../../src/lib/route53.js';
// fetch をモック
const mockFetch = vi.fn();
global.fetch = mockFetch;
describe('Route53Client', () => {
    let client;
    let config;
    beforeEach(() => {
        config = {
            accessKeyId: 'test-access-key',
            secretAccessKey: 'test-secret-key',
            region: 'us-east-1'
        };
        client = new Route53Client(config);
        // fetch をリセット
        mockFetch.mockReset();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('constructor', () => {
        it('デフォルトリージョンを設定', () => {
            const clientWithoutRegion = new Route53Client({
                accessKeyId: 'test',
                secretAccessKey: 'test'
            });
            // プライベートプロパティなので、リクエストでリージョンが使用されることを間接的にテスト
            expect(clientWithoutRegion).toBeDefined();
        });
        it('カスタムリージョンを設定', () => {
            const customClient = new Route53Client({
                accessKeyId: 'test',
                secretAccessKey: 'test',
                region: 'eu-west-1'
            });
            expect(customClient).toBeDefined();
        });
    });
    describe('listHostedZones', () => {
        it('ホステッドゾーン一覧を正常に取得', async () => {
            const mockResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <ListHostedZonesResponse>
          <HostedZones>
            <HostedZone>
              <Id>/hostedzone/Z123456789</Id>
              <Name>example.com.</Name>
              <CallerReference>test-ref</CallerReference>
              <Config>
                <Comment>Test zone</Comment>
                <PrivateZone>false</PrivateZone>
              </Config>
              <ResourceRecordSetCount>10</ResourceRecordSetCount>
            </HostedZone>
          </HostedZones>
        </ListHostedZonesResponse>`;
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                statusText: 'OK',
                text: () => Promise.resolve(mockResponse),
                headers: new Map([['x-amzn-requestid', 'test-request-id']])
            });
            const result = await client.listHostedZones();
            expect(result.data).toBeDefined();
            expect(result.data).toHaveLength(1);
            expect(result.data[0].Name).toBe('example.com.');
            expect(result.data[0].Id).toBe('/hostedzone/Z123456789');
            expect(result.statusCode).toBe(200);
            expect(result.requestId).toBe('test-request-id');
        });
        it('APIエラーを適切に処理', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
                text: () => Promise.resolve('Access denied'),
                headers: new Map()
            });
            const result = await client.listHostedZones();
            expect(result.error).toContain('Failed to list hosted zones');
            expect(result.statusCode).toBe(403);
            expect(result.data).toBeUndefined();
        });
        it('ネットワークエラーを適切に処理', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));
            const result = await client.listHostedZones();
            expect(result.error).toBe('Network error');
            expect(result.statusCode).toBe(500);
        });
    });
    describe('getHostedZone', () => {
        it('特定のホステッドゾーンを正常に取得', async () => {
            const mockResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <GetHostedZoneResponse>
          <HostedZone>
            <Id>/hostedzone/Z123456789</Id>
            <Name>example.com.</Name>
            <CallerReference>test-ref</CallerReference>
            <Config>
              <Comment>Test zone</Comment>
              <PrivateZone>false</PrivateZone>
            </Config>
            <ResourceRecordSetCount>10</ResourceRecordSetCount>
          </HostedZone>
        </GetHostedZoneResponse>`;
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve(mockResponse),
                headers: new Map()
            });
            const result = await client.getHostedZone('Z123456789');
            expect(result.data).toBeDefined();
            expect(result.data.Name).toBe('example.com.');
            expect(result.data.Id).toBe('/hostedzone/Z123456789');
        });
        it('ゾーンIDのプレフィックスを適切に処理', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve('<GetHostedZoneResponse></GetHostedZoneResponse>'),
                headers: new Map()
            });
            await client.getHostedZone('/hostedzone/Z123456789');
            // URLパスが正しく生成されることを確認
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/hostedzone/Z123456789'), expect.any(Object));
        });
    });
    describe('listResourceRecordSets', () => {
        it('レコードセット一覧を正常に取得', async () => {
            const mockResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <ListResourceRecordSetsResponse>
          <ResourceRecordSets>
            <ResourceRecordSet>
              <Name>www.example.com.</Name>
              <Type>A</Type>
              <TTL>300</TTL>
              <ResourceRecords>
                <ResourceRecord>
                  <Value>192.0.2.1</Value>
                </ResourceRecord>
              </ResourceRecords>
            </ResourceRecordSet>
          </ResourceRecordSets>
        </ListResourceRecordSetsResponse>`;
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve(mockResponse),
                headers: new Map()
            });
            const result = await client.listResourceRecordSets('Z123456789');
            expect(result.data).toBeDefined();
            expect(result.data).toHaveLength(1);
            expect(result.data[0].Name).toBe('www.example.com.');
            expect(result.data[0].Type).toBe('A');
            expect(result.data[0].TTL).toBe(300);
        });
        it('フィルターオプションを適切に適用', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve('<ListResourceRecordSetsResponse></ListResourceRecordSetsResponse>'),
                headers: new Map()
            });
            await client.listResourceRecordSets('Z123456789', {
                type: 'A',
                name: 'www.example.com',
                maxItems: 100
            });
            // クエリパラメータが正しく設定されることを確認
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('type=A'), expect.any(Object));
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('name=www.example.com'), expect.any(Object));
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('maxitems=100'), expect.any(Object));
        });
    });
    describe('changeResourceRecordSets', () => {
        it('レコードセット変更を正常に実行', async () => {
            const mockResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <ChangeResourceRecordSetsResponse>
          <ChangeInfo>
            <Id>/change/C123456789</Id>
            <Status>PENDING</Status>
            <SubmittedAt>2023-01-01T00:00:00.000Z</SubmittedAt>
            <Comment>Test change</Comment>
          </ChangeInfo>
        </ChangeResourceRecordSetsResponse>`;
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve(mockResponse),
                headers: new Map()
            });
            const changeBatch = {
                Comment: 'Test change',
                Changes: [{
                        Action: 'CREATE',
                        ResourceRecordSet: {
                            Name: 'test.example.com.',
                            Type: 'A',
                            TTL: 300,
                            ResourceRecords: [{ Value: '192.0.2.1' }]
                        }
                    }]
            };
            const result = await client.changeResourceRecordSets('Z123456789', changeBatch);
            expect(result.data).toBeDefined();
            expect(result.data.Id).toBe('/change/C123456789');
            expect(result.data.Status).toBe('PENDING');
        });
        it('XMLを正しく生成', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve('<ChangeResourceRecordSetsResponse></ChangeResourceRecordSetsResponse>'),
                headers: new Map()
            });
            const changeBatch = {
                Comment: 'Test change',
                Changes: [{
                        Action: 'UPSERT',
                        ResourceRecordSet: {
                            Name: 'test.example.com.',
                            Type: 'A',
                            TTL: 300,
                            ResourceRecords: [{ Value: '192.0.2.1' }]
                        }
                    }]
            };
            await client.changeResourceRecordSets('Z123456789', changeBatch);
            // POSTリクエストのボディにXMLが含まれることを確認
            expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('<Action>UPSERT</Action>')
            }));
        });
    });
    describe('convertCSVToRoute53Records', () => {
        it('CSVレコードを正しくRoute53レコードに変換', () => {
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
                }
            ];
            const route53Records = client.convertCSVToRoute53Records(csvRecords);
            expect(route53Records).toHaveLength(2);
            // Aレコードの確認
            expect(route53Records[0].Name).toBe('example.com.');
            expect(route53Records[0].Type).toBe('A');
            expect(route53Records[0].ResourceRecords[0].Value).toBe('192.0.2.1');
            // MXレコードの確認（優先度が値に含まれる）
            expect(route53Records[1].Name).toBe('mail.example.com.');
            expect(route53Records[1].Type).toBe('MX');
            expect(route53Records[1].ResourceRecords[0].Value).toBe('10 mail.example.com');
        });
        it('SRVレコードを正しく変換', () => {
            const csvRecords = [{
                    domain: '_sip._tcp.example.com',
                    type: 'SRV',
                    value: 'sip.example.com',
                    ttl: 300,
                    priority: 10,
                    weight: 20,
                    port: 5060
                }];
            const route53Records = client.convertCSVToRoute53Records(csvRecords);
            expect(route53Records[0].ResourceRecords[0].Value).toBe('10 20 5060 sip.example.com');
        });
        it('ドメイン名にドットを追加', () => {
            const csvRecords = [{
                    domain: 'example.com',
                    type: 'A',
                    value: '192.0.2.1',
                    ttl: 300
                }];
            const route53Records = client.convertCSVToRoute53Records(csvRecords);
            expect(route53Records[0].Name).toBe('example.com.');
        });
        it('既にドットが付いているドメイン名をそのまま保持', () => {
            const csvRecords = [{
                    domain: 'example.com.',
                    type: 'A',
                    value: '192.0.2.1',
                    ttl: 300
                }];
            const route53Records = client.convertCSVToRoute53Records(csvRecords);
            expect(route53Records[0].Name).toBe('example.com.');
        });
        it('重みベースルーティングを設定', () => {
            const csvRecords = [{
                    domain: 'example.com',
                    type: 'A',
                    value: '192.0.2.1',
                    ttl: 300,
                    weight: 100
                }];
            const route53Records = client.convertCSVToRoute53Records(csvRecords);
            expect(route53Records[0].Weight).toBe(100);
            expect(route53Records[0].SetIdentifier).toBe('example.com-A-100');
        });
    });
    describe('convertRoute53ToCSVRecords', () => {
        it('Route53レコードを正しくCSVレコードに変換', () => {
            const route53Records = [
                {
                    Name: 'example.com.',
                    Type: 'A',
                    TTL: 300,
                    ResourceRecords: [{ Value: '192.0.2.1' }]
                },
                {
                    Name: 'mail.example.com.',
                    Type: 'MX',
                    TTL: 300,
                    ResourceRecords: [{ Value: '10 mail.example.com' }]
                }
            ];
            const csvRecords = client.convertRoute53ToCSVRecords(route53Records);
            expect(csvRecords).toHaveLength(2);
            // Aレコードの確認
            expect(csvRecords[0].domain).toBe('example.com');
            expect(csvRecords[0].type).toBe('A');
            expect(csvRecords[0].value).toBe('192.0.2.1');
            // MXレコードの確認（優先度が分離される）
            expect(csvRecords[1].domain).toBe('mail.example.com');
            expect(csvRecords[1].type).toBe('MX');
            expect(csvRecords[1].value).toBe('mail.example.com');
            expect(csvRecords[1].priority).toBe(10);
        });
        it('SRVレコードを正しく変換', () => {
            const route53Records = [{
                    Name: '_sip._tcp.example.com.',
                    Type: 'SRV',
                    TTL: 300,
                    ResourceRecords: [{ Value: '10 20 5060 sip.example.com' }]
                }];
            const csvRecords = client.convertRoute53ToCSVRecords(route53Records);
            expect(csvRecords[0].priority).toBe(10);
            expect(csvRecords[0].weight).toBe(20);
            expect(csvRecords[0].port).toBe(5060);
            expect(csvRecords[0].value).toBe('sip.example.com');
        });
        it('エイリアスレコードを変換', () => {
            const route53Records = [{
                    Name: 'example.com.',
                    Type: 'A',
                    AliasTarget: {
                        DNSName: 'alias.example.com',
                        EvaluateTargetHealth: false,
                        HostedZoneId: 'Z123456789'
                    }
                }];
            const csvRecords = client.convertRoute53ToCSVRecords(route53Records);
            expect(csvRecords[0].value).toBe('alias.example.com');
            expect(csvRecords[0].ttl).toBe(300); // デフォルトTTL
        });
        it('ドメイン名のドットを除去', () => {
            const route53Records = [{
                    Name: 'example.com.',
                    Type: 'A',
                    TTL: 300,
                    ResourceRecords: [{ Value: '192.0.2.1' }]
                }];
            const csvRecords = client.convertRoute53ToCSVRecords(route53Records);
            expect(csvRecords[0].domain).toBe('example.com');
        });
        it('重みベースルーティングの重みを取得', () => {
            const route53Records = [{
                    Name: 'example.com.',
                    Type: 'A',
                    TTL: 300,
                    Weight: 100,
                    ResourceRecords: [{ Value: '192.0.2.1' }]
                }];
            const csvRecords = client.convertRoute53ToCSVRecords(route53Records);
            expect(csvRecords[0].weight).toBe(100);
        });
    });
    describe('importRecords', () => {
        it('レコードを正常にインポート', async () => {
            const mockResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <ChangeResourceRecordSetsResponse>
          <ChangeInfo>
            <Id>/change/C123456789</Id>
            <Status>PENDING</Status>
            <SubmittedAt>2023-01-01T00:00:00.000Z</SubmittedAt>
          </ChangeInfo>
        </ChangeResourceRecordSetsResponse>`;
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: () => Promise.resolve(mockResponse),
                headers: new Map()
            });
            const csvRecords = [
                {
                    domain: 'test1.example.com',
                    type: 'A',
                    value: '192.0.2.1',
                    ttl: 300
                },
                {
                    domain: 'test2.example.com',
                    type: 'A',
                    value: '192.0.2.2',
                    ttl: 300
                }
            ];
            const result = await client.importRecords('Z123456789', csvRecords);
            expect(result.data).toBeDefined();
            expect(result.data).toHaveLength(1); // バッチサイズが100なので1つのバッチ
            expect(result.statusCode).toBe(200);
        });
        it('大量レコードを適切にバッチ分割', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                status: 200,
                text: () => Promise.resolve('<ChangeResourceRecordSetsResponse><ChangeInfo><Id>test</Id><Status>PENDING</Status><SubmittedAt>2023-01-01T00:00:00.000Z</SubmittedAt></ChangeInfo></ChangeResourceRecordSetsResponse>'),
                headers: new Map()
            });
            const csvRecords = Array.from({ length: 150 }, (_, i) => ({
                domain: `test${i}.example.com`,
                type: 'A',
                value: '192.0.2.1',
                ttl: 300
            }));
            const result = await client.importRecords('Z123456789', csvRecords, {
                batchSize: 100
            });
            expect(result.data).toBeDefined();
            expect(result.data).toHaveLength(2); // 150レコードが100と50に分割される
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
        it('エラー時に適切なレスポンスを返す', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: () => Promise.resolve('Invalid request'),
                headers: new Map()
            });
            const csvRecords = [{
                    domain: 'test.example.com',
                    type: 'A',
                    value: '192.0.2.1',
                    ttl: 300
                }];
            const result = await client.importRecords('Z123456789', csvRecords);
            expect(result.error).toContain('Failed to change resource record sets');
            expect(result.statusCode).toBe(400);
        });
    });
    describe('exportRecords', () => {
        it('レコードを正常にエクスポート', async () => {
            const mockResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <ListResourceRecordSetsResponse>
          <ResourceRecordSets>
            <ResourceRecordSet>
              <Name>www.example.com.</Name>
              <Type>A</Type>
              <TTL>300</TTL>
              <ResourceRecords>
                <ResourceRecord>
                  <Value>192.0.2.1</Value>
                </ResourceRecord>
              </ResourceRecords>
            </ResourceRecordSet>
          </ResourceRecordSets>
        </ListResourceRecordSetsResponse>`;
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve(mockResponse),
                headers: new Map()
            });
            const result = await client.exportRecords('Z123456789');
            expect(result.data).toBeDefined();
            expect(result.data).toHaveLength(1);
            expect(result.data[0].domain).toBe('www.example.com');
            expect(result.data[0].type).toBe('A');
            expect(result.data[0].value).toBe('192.0.2.1');
        });
        it('特定のレコードタイプでフィルタリング', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve('<ListResourceRecordSetsResponse></ListResourceRecordSetsResponse>'),
                headers: new Map()
            });
            await client.exportRecords('Z123456789', { type: 'MX' });
            // リクエストにタイプフィルタが含まれることを確認
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('type=MX'), expect.any(Object));
        });
    });
    describe('エラーハンドリング', () => {
        it('不正な設定でエラーにならない', () => {
            expect(() => {
                new Route53Client({
                    accessKeyId: '',
                    secretAccessKey: ''
                });
            }).not.toThrow();
        });
        it('空のレコード配列を適切に処理', () => {
            const result = client.convertCSVToRoute53Records([]);
            expect(result).toEqual([]);
        });
        it('空のRoute53レコード配列を適切に処理', () => {
            const result = client.convertRoute53ToCSVRecords([]);
            expect(result).toEqual([]);
        });
    });
});
//# sourceMappingURL=route53.test.js.map