import { Router, Request, Response } from 'express';
import { changeHistoryService } from '../services/changeHistoryService';
import { ChangeHistoryFilter } from '../types/history';

const router = Router();

/**
 * 変更履歴一覧の取得
 * GET /api/history
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filter: ChangeHistoryFilter = {
      domain: req.query.domain as string,
      recordType: req.query.recordType as string,
      changeType: req.query.changeType as string,
      source: req.query.source as string,
      userId: req.query.userId as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      cursor: req.query.cursor as string,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any
    };

    // 無効な日付をフィルター
    if (filter.dateFrom && isNaN(filter.dateFrom.getTime())) {
      filter.dateFrom = undefined;
    }
    if (filter.dateTo && isNaN(filter.dateTo.getTime())) {
      filter.dateTo = undefined;
    }

    const history = await changeHistoryService.getChangeHistory(filter);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching change history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '変更履歴の取得に失敗しました'
    });
  }
});

/**
 * 変更履歴統計の取得
 * GET /api/history/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const dateFrom = req.query.dateFrom 
      ? new Date(req.query.dateFrom as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // デフォルト: 過去30日

    const dateTo = req.query.dateTo 
      ? new Date(req.query.dateTo as string)
      : new Date(); // デフォルト: 現在

    // 無効な日付のチェック
    if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        message: '日付形式が正しくありません'
      });
    }

    const stats = await changeHistoryService.getChangeStatistics(dateFrom, dateTo);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching change statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '統計情報の取得に失敗しました'
    });
  }
});

/**
 * 特定レコードの変更履歴取得
 * GET /api/history/record/:recordId
 */
router.get('/record/:recordId', async (req: Request, res: Response) => {
  try {
    const { recordId } = req.params;

    if (!recordId) {
      return res.status(400).json({
        success: false,
        error: 'Missing recordId',
        message: 'レコードIDが必要です'
      });
    }

    const history = await changeHistoryService.getRecordHistory(recordId);

    res.json({
      success: true,
      data: {
        recordId,
        changes: history,
        totalCount: history.length
      }
    });
  } catch (error) {
    console.error('Error fetching record history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'レコード履歴の取得に失敗しました'
    });
  }
});

/**
 * 特定ドメインの変更履歴取得
 * GET /api/history/domain/:domain
 */
router.get('/domain/:domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Missing domain',
        message: 'ドメイン名が必要です'
      });
    }

    const history = await changeHistoryService.getDomainHistory(domain);

    res.json({
      success: true,
      data: {
        domain,
        changes: history,
        totalCount: history.length
      }
    });
  } catch (error) {
    console.error('Error fetching domain history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'ドメイン履歴の取得に失敗しました'
    });
  }
});

/**
 * 変更履歴の記録（内部API）
 * POST /api/history/record
 */
router.post('/record', async (req: Request, res: Response) => {
  try {
    const changeData = req.body;

    // 必須フィールドの検証
    const requiredFields = ['recordId', 'domain', 'recordType', 'changeType', 'source'];
    const missingFields = requiredFields.filter(field => !changeData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `必須フィールドが不足しています: ${missingFields.join(', ')}`
      });
    }

    const change = await changeHistoryService.recordChange(changeData);

    res.status(201).json({
      success: true,
      data: change
    });
  } catch (error) {
    console.error('Error recording change:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '変更履歴の記録に失敗しました'
    });
  }
});

/**
 * 一括変更履歴の記録（内部API）
 * POST /api/history/bulk-record
 */
router.post('/bulk-record', async (req: Request, res: Response) => {
  try {
    const { changes } = req.body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid changes array',
        message: '有効な変更データの配列が必要です'
      });
    }

    // 各変更データの検証
    const requiredFields = ['recordId', 'domain', 'recordType', 'changeType', 'source'];
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const missingFields = requiredFields.filter(field => !change[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid change data',
          message: `変更データ ${i + 1} で必須フィールドが不足: ${missingFields.join(', ')}`
        });
      }
    }

    const recordedChanges = await changeHistoryService.bulkRecordChanges(changes);

    res.status(201).json({
      success: true,
      data: {
        recordedCount: recordedChanges.length,
        changes: recordedChanges
      }
    });
  } catch (error) {
    console.error('Error bulk recording changes:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: '一括変更履歴の記録に失敗しました'
    });
  }
});

export { router as historyRouter };