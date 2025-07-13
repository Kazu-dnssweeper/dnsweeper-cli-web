import { Request, Response, NextFunction } from 'express';
import { changeHistoryService } from '../services/changeHistoryService';
import type { DnsChangeRecord } from '../types/history';

/**
 * DNS変更操作時に自動的に履歴を記録するミドルウェア
 */
export const recordDnsChange = (changeType: 'create' | 'update' | 'delete') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 元のレスポンス処理をフック
    const originalSend = res.send.bind(res);
    
    res.send = function(data: any) {
      // 成功時のみ履歴を記録
      if (res.statusCode >= 200 && res.statusCode < 300) {
        recordChange(req, res, changeType, data);
      }
      return originalSend(data);
    };
    
    next();
  };
};

async function recordChange(
  req: Request, 
  res: Response, 
  changeType: 'create' | 'update' | 'delete',
  responseData: any
) {
  try {
    // リクエストからDNS変更情報を抽出
    const recordData = extractRecordData(req, responseData, changeType);
    
    if (recordData) {
      await changeHistoryService.recordChange(recordData);
    }
  } catch (error) {
    // 履歴記録エラーは元の処理を阻害しないようにログのみ
    console.error('Failed to record DNS change history:', error);
  }
}

function extractRecordData(
  req: Request, 
  responseData: any, 
  changeType: 'create' | 'update' | 'delete'
): Omit<DnsChangeRecord, 'id' | 'timestamp'> | null {
  const body = req.body;
  const params = req.params;
  const query = req.query;
  
  // リクエストパスに基づいて情報を抽出
  const path = req.route?.path || req.path;
  
  // 基本的な変更情報の構築
  const changeData: Partial<Omit<DnsChangeRecord, 'id' | 'timestamp'>> = {
    changeType,
    source: determineSource(req),
    userId: req.headers['user-id'] as string, // 認証実装時に設定
    userEmail: req.headers['user-email'] as string,
    metadata: {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    }
  };

  // パスとボディに基づいてレコード情報を抽出
  if (path.includes('/dns/records')) {
    // DNS レコード操作
    if (body.domain && body.type) {
      changeData.recordId = params.id || body.id || generateRecordId(body.domain, body.type);
      changeData.domain = body.domain;
      changeData.recordType = body.type;
      
      if (changeType === 'create' || changeType === 'update') {
        changeData.newValue = body.value;
        changeData.newTtl = body.ttl;
      }
      
      if (changeType === 'update' || changeType === 'delete') {
        // 更新・削除の場合は前の値も記録（実際の実装では事前に取得）
        changeData.previousValue = body.previousValue;
        changeData.previousTtl = body.previousTtl;
      }
      
      changeData.reason = body.reason || query.reason as string;
    }
  } else if (path.includes('/upload')) {
    // ファイルアップロード
    if (req.file && responseData.data) {
      // アップロード経由の一括変更として記録
      changeData.source = 'import';
      changeData.metadata = {
        ...changeData.metadata,
        importFileName: req.file.originalname
      };
      
      // 実際の実装では、アップロードされたファイルの内容を解析して
      // 個別のレコード変更として記録
    }
  }

  // 必須フィールドが揃っているかチェック
  if (changeData.recordId && changeData.domain && changeData.recordType && changeData.changeType && changeData.source) {
    return changeData as Omit<DnsChangeRecord, 'id' | 'timestamp'>;
  }

  return null;
}

function determineSource(req: Request): 'manual' | 'import' | 'api' | 'monitoring' {
  const userAgent = req.headers['user-agent'] || '';
  const apiKey = req.headers['x-api-key'];
  const isFileUpload = req.file !== undefined;

  if (apiKey) return 'api';
  if (isFileUpload) return 'import';
  if (userAgent.includes('monitor') || userAgent.includes('bot')) return 'monitoring';
  
  return 'manual';
}

function generateRecordId(domain: string, type: string): string {
  return `${domain}_${type}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * 一括変更履歴記録のためのヘルパー関数
 */
export async function recordBulkDnsChanges(
  changes: Array<Omit<DnsChangeRecord, 'id' | 'timestamp'>>,
  source: 'import' | 'api' | 'monitoring' = 'api'
): Promise<void> {
  try {
    const changesWithSource = changes.map(change => ({
      ...change,
      source
    }));
    
    await changeHistoryService.bulkRecordChanges(changesWithSource);
  } catch (error) {
    console.error('Failed to record bulk DNS changes:', error);
  }
}