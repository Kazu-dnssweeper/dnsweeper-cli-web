import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createApp } from '../app';

describe('DNSweeper API Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    app = await createApp();
    server = app.listen(0); // ポート0で一時的にサーバー起動
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'ok',
          version: expect.any(String),
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('Upload API', () => {
    it('should accept file upload', async () => {
      const csvContent = 'Name,Type,Content,TTL\nexample.com,A,192.168.1.1,3600';
      
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          fileId: expect.any(String),
          recordCount: expect.any(Number)
        }
      });
    });

    it('should reject invalid file types', async () => {
      const txtContent = 'This is not a CSV file';
      
      await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from(txtContent), 'test.txt')
        .expect(400);
    });

    it('should get upload status', async () => {
      // まずファイルをアップロード
      const csvContent = 'Name,Type,Content,TTL\nexample.com,A,192.168.1.1,3600';
      const uploadResponse = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(200);

      const fileId = uploadResponse.body.data.fileId;

      // ステータス取得
      const statusResponse = await request(app)
        .get(`/api/upload/${fileId}/status`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        success: true,
        data: {
          status: expect.stringMatching(/^(idle|uploading|processing|completed|error)$/),
          progress: expect.any(Number)
        }
      });
    });
  });

  describe('DNS Records API', () => {
    it('should get DNS records', async () => {
      const response = await request(app)
        .get('/api/dns/records')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          records: expect.any(Array),
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number)
        }
      });
    });

    it('should filter DNS records by search', async () => {
      const response = await request(app)
        .get('/api/dns/records?search=example.com')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.records)).toBe(true);
    });

    it('should filter DNS records by type', async () => {
      const response = await request(app)
        .get('/api/dns/records?type=A')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.records)).toBe(true);
    });

    it('should get specific DNS record', async () => {
      // まずレコード一覧を取得
      const listResponse = await request(app)
        .get('/api/dns/records')
        .expect(200);

      const records = listResponse.body.data.records;
      if (records.length > 0) {
        const recordId = records[0].id;
        
        const response = await request(app)
          .get(`/api/dns/records/${recordId}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            id: recordId,
            domain: expect.any(String),
            type: expect.any(String),
            value: expect.any(String),
            ttl: expect.any(Number)
          }
        });
      }
    });

    it('should handle non-existent record', async () => {
      await request(app)
        .get('/api/dns/records/non-existent-id')
        .expect(404);
    });
  });

  describe('Analysis API', () => {
    it('should get analysis results', async () => {
      const response = await request(app)
        .get('/api/analysis')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
    });

    it('should start new analysis', async () => {
      const response = await request(app)
        .post('/api/analysis/start')
        .send({
          recordIds: ['record1', 'record2'],
          options: {
            includeRiskCalculation: true,
            includeDnsResolution: false
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          analysisId: expect.any(String)
        }
      });
    });
  });

  describe('Statistics API', () => {
    it('should get dashboard stats', async () => {
      const response = await request(app)
        .get('/api/stats/dashboard')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalRecords: expect.any(Number),
          highRiskRecords: expect.any(Number),
          mediumRiskRecords: expect.any(Number),
          lowRiskRecords: expect.any(Number),
          lastScanTime: expect.any(String),
          recentAnalyses: expect.any(Array)
        }
      });
    });

    it('should get risk distribution', async () => {
      const response = await request(app)
        .get('/api/stats/risk-distribution')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          high: expect.any(Number),
          medium: expect.any(Number),
          low: expect.any(Number),
          distribution: expect.any(Array)
        }
      });
    });

    it('should get time series stats', async () => {
      const response = await request(app)
        .get('/api/stats/timeseries?period=24h')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });
    });
  });

  describe('Settings API', () => {
    it('should get settings', async () => {
      const response = await request(app)
        .get('/api/settings')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          theme: expect.stringMatching(/^(light|dark|system)$/),
          language: expect.stringMatching(/^(ja|en)$/),
          notifications: expect.any(Boolean),
          autoRefresh: expect.any(Boolean),
          refreshInterval: expect.any(Number)
        }
      });
    });

    it('should update settings', async () => {
      const newSettings = {
        theme: 'dark' as const,
        notifications: true,
        refreshInterval: 600
      };

      const response = await request(app)
        .put('/api/settings')
        .send(newSettings)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining(newSettings)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      await request(app)
        .get('/api/unknown-route')
        .expect(404);
    });

    it('should handle malformed JSON', async () => {
      await request(app)
        .post('/api/analysis/start')
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400);
    });

    it('should handle missing required fields', async () => {
      await request(app)
        .post('/api/analysis/start')
        .send({})
        .expect(400);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight requests', async () => {
      await request(app)
        .options('/api/upload')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });
});