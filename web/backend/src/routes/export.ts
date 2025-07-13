import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { exportService } from '../services/exportService';
import { ExportRequest } from '../types/export';

const router = Router();

/**
 * エクスポートテンプレート一覧の取得
 * GET /api/export/templates
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const templates = exportService.getExportTemplates();
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching export templates:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'エクスポートテンプレートの取得に失敗しました'
    });
  }
});

/**
 * エクスポート実行
 * POST /api/export
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const exportRequest: ExportRequest = req.body;

    // 必須フィールドの検証
    if (!exportRequest.type || !exportRequest.format) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'type と format は必須です'
      });
    }

    // サポートされている形式の検証
    const supportedTypes = ['dns_records', 'change_history', 'analysis_results', 'statistics'];
    const supportedFormats = ['csv', 'excel', 'pdf'];

    if (!supportedTypes.includes(exportRequest.type)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported export type',
        message: `サポートされていないエクスポートタイプ: ${exportRequest.type}`
      });
    }

    if (!supportedFormats.includes(exportRequest.format)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported export format',
        message: `サポートされていないエクスポート形式: ${exportRequest.format}`
      });
    }

    // 日付フィールドの変換
    if (exportRequest.filter?.dateFrom) {
      exportRequest.filter.dateFrom = new Date(exportRequest.filter.dateFrom);
    }
    if (exportRequest.filter?.dateTo) {
      exportRequest.filter.dateTo = new Date(exportRequest.filter.dateTo);
    }

    const result = await exportService.createExportRequest(exportRequest);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Export failed',
        message: result.error || 'エクスポートに失敗しました'
      });
    }

  } catch (error) {
    console.error('Error processing export request:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'エクスポート処理中にエラーが発生しました'
    });
  }
});

/**
 * エクスポートファイルのダウンロード
 * GET /api/export/download/:filename
 */
router.get('/download/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    // セキュリティ: ファイル名の検証
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
        message: '無効なファイル名です'
      });
    }

    const exportDir = process.env.EXPORT_DIR || path.join(process.cwd(), 'exports');
    const filePath = path.join(exportDir, filename);

    // ファイルの存在確認
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'ファイルが見つかりません'
      });
    }

    // ファイル情報の取得
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();

    // Content-Typeの設定
    let contentType = 'application/octet-stream';
    switch (fileExtension) {
      case '.csv':
        contentType = 'text/csv; charset=utf-8';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
    }

    // レスポンスヘッダーの設定
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // ファイルのストリーミング
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'File stream error',
          message: 'ファイルの読み込み中にエラーが発生しました'
        });
      }
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'ファイルダウンロード中にエラーが発生しました'
    });
  }
});

/**
 * DNS レコードのクイックエクスポート
 * GET /api/export/dns-records
 */
router.get('/dns-records', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const domain = req.query.domain as string;
    const recordType = req.query.recordType as string;

    const exportRequest: ExportRequest = {
      type: 'dns_records',
      format: format as any,
      filter: {
        domain,
        recordType,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
      },
      options: {
        includeMetadata: true,
        customFileName: req.query.filename as string
      }
    };

    const result = await exportService.createExportRequest(exportRequest);

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Export failed',
        message: result.error || 'エクスポートに失敗しました'
      });
    }

  } catch (error) {
    console.error('Error in quick DNS export:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'DNS レコードのエクスポートに失敗しました'
    });
  }
});

/**
 * 変更履歴のクイックエクスポート
 * GET /api/export/change-history
 */
router.get('/change-history', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const days = parseInt(req.query.days as string, 10) || 30;

    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const exportRequest: ExportRequest = {
      type: 'change_history',
      format: format as any,
      filter: {
        dateFrom,
        dateTo,
        domain: req.query.domain as string,
        changeType: req.query.changeType as any,
        source: req.query.source as any
      },
      options: {
        includeMetadata: true,
        customFileName: req.query.filename as string
      }
    };

    const result = await exportService.createExportRequest(exportRequest);

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Export failed',
        message: result.error || 'エクスポートに失敗しました'
      });
    }

  } catch (error) {
    console.error('Error in quick history export:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '変更履歴のエクスポートに失敗しました'
    });
  }
});

export { router as exportRouter };