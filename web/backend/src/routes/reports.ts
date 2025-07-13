/**
 * DNSweeper レポート API エンドポイント
 * 
 * レポート生成・管理・ダウンロード API
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { reportService } from '../services/reportService';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

// すべてのルートで認証を要求
router.use(authenticate);

/**
 * レポートテンプレート一覧取得
 */
router.get('/templates', async (req: AuthenticatedRequest, res) => {
  try {
    const templates = reportService.getTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Failed to get report templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 生成済みレポート一覧取得
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['generating', 'completed', 'failed', 'scheduled']),
  query('templateId').optional().isString()
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const accountId = req.user!.id;
    let reports = reportService.getReportsByAccount(accountId);

    // フィルタリング
    const { status, templateId } = req.query;
    if (status) {
      reports = reports.filter(report => report.status === status);
    }
    if (templateId) {
      reports = reports.filter(report => report.templateId === templateId);
    }

    // ページネーション
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const paginatedReports = reports.slice(offset, offset + limit);

    res.json({
      reports: paginatedReports,
      pagination: {
        total: reports.length,
        page,
        limit,
        pages: Math.ceil(reports.length / limit)
      }
    });
  } catch (error) {
    console.error('Failed to get reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * レポート詳細取得
 */
router.get('/:reportId', [
  param('reportId').isString().notEmpty()
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { reportId } = req.params;
    const report = reportService.getReport(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.accountId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(report);
  } catch (error) {
    console.error('Failed to get report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * レポート生成
 */
router.post('/', [
  body('templateId').isString().notEmpty(),
  body('title').isString().notEmpty().isLength({ min: 1, max: 200 }),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('config').isObject(),
  body('config.dateRange').isObject(),
  body('config.dateRange.from').isISO8601(),
  body('config.dateRange.to').isISO8601(),
  body('config.format').isIn(['pdf', 'excel', 'csv', 'json']),
  body('config.filters').optional().isObject()
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { templateId, title, description, config } = req.body;
    const user = req.user!;

    // 日付の検証
    const fromDate = new Date(config.dateRange.from);
    const toDate = new Date(config.dateRange.to);
    
    if (fromDate >= toDate) {
      return res.status(400).json({ 
        error: 'Invalid date range: from date must be before to date' 
      });
    }

    // 30日以内の日付範囲制限
    const maxRangeDays = 365;
    const rangeDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (rangeDays > maxRangeDays) {
      return res.status(400).json({ 
        error: `Date range too large: maximum ${maxRangeDays} days allowed` 
      });
    }

    const reportId = await reportService.generateReport(user, templateId, {
      title,
      description,
      dateRange: {
        from: fromDate,
        to: toDate
      },
      filters: config.filters || {},
      format: config.format
    });

    res.status(201).json({ reportId });
  } catch (error) {
    console.error('Failed to generate report:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * レポートダウンロード
 */
router.get('/:reportId/download', [
  param('reportId').isString().notEmpty()
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { reportId } = req.params;
    const report = reportService.getReport(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.accountId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (report.status !== 'completed' || !report.results) {
      return res.status(400).json({ error: 'Report not ready for download' });
    }

    const fileBuffer = await reportService.getReportFile(reportId);
    
    // MIMEタイプの設定
    const mimeTypes = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      json: 'application/json'
    };

    const fileExtensions = {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv',
      json: 'json'
    };

    const mimeType = mimeTypes[report.config.format];
    const extension = fileExtensions[report.config.format];
    const filename = `${report.title}_${reportId}.${extension}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    
    res.send(fileBuffer);
  } catch (error) {
    console.error('Failed to download report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * レポート削除
 */
router.delete('/:reportId', [
  param('reportId').isString().notEmpty()
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { reportId } = req.params;
    const accountId = req.user!.id;

    await reportService.deleteReport(reportId, accountId);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete report:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json({ error: 'Report not found' });
      } else if (error.message.includes('Unauthorized')) {
        res.status(403).json({ error: 'Unauthorized' });
      } else {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * レポートメトリクス取得
 */
router.get('/metrics/overview', async (req: AuthenticatedRequest, res) => {
  try {
    const accountId = req.user!.id;
    const reports = reportService.getReportsByAccount(accountId);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const completedReports = reports.filter(r => r.status === 'completed');
    const reportsToday = completedReports.filter(r => 
      r.generatedAt && r.generatedAt >= today
    );
    const reportsThisWeek = completedReports.filter(r => 
      r.generatedAt && r.generatedAt >= thisWeek
    );
    const reportsThisMonth = completedReports.filter(r => 
      r.generatedAt && r.generatedAt >= thisMonth
    );

    // 最も使用されているテンプレート
    const templateUsage = reports.reduce((acc, report) => {
      acc[report.templateName] = (acc[report.templateName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedTemplate = Object.entries(templateUsage)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    // 平均生成時間（モック値）
    const avgGenerationTime = 45.2;

    // 総エクスポート数
    const totalExports = completedReports.length;

    // ストレージ使用量
    const storageUsed = completedReports.reduce((sum, report) => 
      sum + (report.results?.fileSize || 0), 0
    );

    res.json({
      totalReports: reports.length,
      reportsToday: reportsToday.length,
      reportsThisWeek: reportsThisWeek.length,
      reportsThisMonth: reportsThisMonth.length,
      avgGenerationTime,
      mostUsedTemplate,
      totalExports,
      storageUsed
    });
  } catch (error) {
    console.error('Failed to get report metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * レポート進捗状況取得（WebSocket代替）
 */
router.get('/:reportId/status', [
  param('reportId').isString().notEmpty()
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { reportId } = req.params;
    const report = reportService.getReport(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.accountId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      status: report.status,
      progress: report.progress,
      error: report.error
    });
  } catch (error) {
    console.error('Failed to get report status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;