/**
 * DNSweeper 認証・認可ミドルウェア
 * 
 * JWT検証、権限チェック、リクエストコンテキスト設定
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import type { User, Account, Permission } from '../types/auth';

// リクエストにユーザー情報を追加
declare global {
  namespace Express {
    interface Request {
      user?: User;
      account?: Account;
      permissions?: Permission[];
      sessionId?: string;
    }
  }
}

/**
 * JWT認証ミドルウェア
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'アクセストークンが必要です'
        }
      });
    }

    // トークン検証
    const { userId, accountId, sessionId } = await authService.verifyToken(token);

    // ユーザー・アカウント情報取得
    const users = authService.getUsers();
    const accounts = authService.getAccounts();
    
    const user = users.find(u => u.id === userId);
    const account = accounts.find(a => a.id === accountId);

    if (!user || !account) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: '無効なトークンです'
        }
      });
    }

    // 権限チェック
    const userAccounts = authService.getUserAccounts(userId);
    const hasAccess = userAccounts.some(acc => acc.id === accountId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'このアカウントへのアクセス権限がありません'
        }
      });
    }

    // リクエストオブジェクトに情報を設定
    req.user = user;
    req.account = account;
    req.sessionId = sessionId;

    // TODO: 実際の権限取得ロジック
    req.permissions = []; // authService.getUserPermissions(userId, accountId);

    next();
  } catch (error: any) {
    if (error.code) {
      return res.status(401).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    console.error('Token verification error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました'
      }
    });
  }
};

/**
 * 権限チェックミドルウェア
 */
export const requirePermission = (resource: string, action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.account) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: '認証が必要です'
        }
      });
    }

    const hasPermission = authService.checkPermission(
      req.user.id,
      req.account.id,
      resource,
      action
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'この操作を実行する権限がありません'
        }
      });
    }

    next();
  };
};

/**
 * オプション認証ミドルウェア（認証不要でも動作するエンドポイント用）
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const { userId, accountId, sessionId } = await authService.verifyToken(token);
      
      const users = authService.getUsers();
      const accounts = authService.getAccounts();
      
      const user = users.find(u => u.id === userId);
      const account = accounts.find(a => a.id === accountId);

      if (user && account) {
        req.user = user;
        req.account = account;
        req.sessionId = sessionId;
        req.permissions = []; // authService.getUserPermissions(userId, accountId);
      }
    }

    next();
  } catch (error) {
    // 認証エラーでも続行（オプション認証のため）
    next();
  }
};

/**
 * アカウント所有者またはAdmin権限チェック
 */
export const requireAccountAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.account) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NOT_AUTHENTICATED',
        message: '認証が必要です'
      }
    });
  }

  // アカウント管理権限チェック
  const hasAdminAccess = authService.checkPermission(
    req.user.id,
    req.account.id,
    'account_settings',
    'manage'
  ) || authService.checkPermission(
    req.user.id,
    req.account.id,
    'members',
    'manage'
  );

  if (!hasAdminAccess) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ADMIN_REQUIRED',
        message: 'アカウント管理者権限が必要です'
      }
    });
  }

  next();
};

/**
 * APIキー認証ミドルウェア
 */
export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_API_KEY',
          message: 'APIキーが必要です'
        }
      });
    }

    // TODO: APIキー検証実装
    // const keyInfo = await authService.verifyApiKey(apiKey);

    // 一時的なダミー実装
    return res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'APIキー認証は実装中です'
      }
    });

  } catch (error: any) {
    console.error('API key verification error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバーエラーが発生しました'
      }
    });
  }
};

/**
 * レート制限ミドルウェア
 */
export const rateLimit = (requestsPerHour: number = 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.account?.id || req.ip;
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    const resetTime = Math.floor(now / hourInMs) * hourInMs + hourInMs;

    let clientRequests = requests.get(clientId);

    if (!clientRequests || clientRequests.resetTime <= now) {
      clientRequests = { count: 0, resetTime };
      requests.set(clientId, clientRequests);
    }

    clientRequests.count++;

    if (clientRequests.count > requestsPerHour) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'リクエスト制限を超過しました',
          resetTime: new Date(resetTime).toISOString()
        }
      });
    }

    // レスポンスヘッダーにレート制限情報を追加
    res.set({
      'X-RateLimit-Limit': requestsPerHour.toString(),
      'X-RateLimit-Remaining': (requestsPerHour - clientRequests.count).toString(),
      'X-RateLimit-Reset': resetTime.toString()
    });

    next();
  };
};

/**
 * CORS設定（アカウント別ドメイン制限対応）
 */
export const configureCors = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://dnsweeper.app'
  ];

  // アカウント固有のドメイン追加
  if (req.account?.settings) {
    // TODO: アカウント設定からallowedDomainsを取得
  }

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,authorization,cache-control,x-api-key');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

/**
 * セキュリティヘッダー設定
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });

  next();
};