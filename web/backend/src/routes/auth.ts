/**
 * DNSweeper 認証API routes
 * 
 * ログイン、アカウント切り替え、セッション管理API
 */

import express from 'express';
import { authService } from '../services/authService';
import { authenticateToken, requirePermission, rateLimit } from '../middleware/auth';
import type { LoginRequest, RegisterRequest, SwitchAccountRequest } from '../types/auth';

const router = express.Router();

/**
 * POST /auth/login
 * ユーザーログイン
 */
router.post('/login', rateLimit(100), async (req, res) => {
  try {
    const loginRequest: LoginRequest = req.body;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    // 入力検証
    if (!loginRequest.email || !loginRequest.password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'メールアドレスとパスワードが必要です'
        }
      });
    }

    const loginResponse = await authService.login(loginRequest, ipAddress, userAgent);

    res.json({
      success: true,
      data: loginResponse
    });

  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.code) {
      const statusCode = error.code === 'INVALID_CREDENTIALS' ? 401 :
                        error.code === 'ACCOUNT_NOT_FOUND' ? 404 :
                        error.code === 'ACCOUNT_SUSPENDED' ? 403 : 400;

      return res.status(statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ログイン処理中にエラーが発生しました'
      }
    });
  }
});

/**
 * POST /auth/logout
 * ユーザーログアウト
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // TODO: セッション無効化実装
    // await authService.invalidateSession(req.sessionId!);

    res.json({
      success: true,
      message: 'ログアウトしました'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ログアウト処理中にエラーが発生しました'
      }
    });
  }
});

/**
 * POST /auth/refresh
 * トークン更新
 */
router.post('/refresh', rateLimit(200), async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'リフレッシュトークンが必要です'
        }
      });
    }

    // TODO: リフレッシュトークン実装
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'トークン更新機能は実装中です'
      }
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'トークン更新中にエラーが発生しました'
      }
    });
  }
});

/**
 * GET /auth/me
 * 現在のユーザー情報取得
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
        account: req.account,
        permissions: req.permissions
      }
    });

  } catch (error: any) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ユーザー情報取得中にエラーが発生しました'
      }
    });
  }
});

/**
 * GET /auth/accounts
 * ユーザーがアクセス可能なアカウント一覧
 */
router.get('/accounts', authenticateToken, async (req, res) => {
  try {
    const userAccounts = authService.getUserAccounts(req.user!.id);

    res.json({
      success: true,
      data: {
        accounts: userAccounts,
        currentAccount: req.account
      }
    });

  } catch (error: any) {
    console.error('Get accounts error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'アカウント一覧取得中にエラーが発生しました'
      }
    });
  }
});

/**
 * POST /auth/switch-account
 * アカウント切り替え
 */
router.post('/switch-account', authenticateToken, async (req, res) => {
  try {
    const switchRequest: SwitchAccountRequest = req.body;

    if (!switchRequest.accountId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'アカウントIDが必要です'
        }
      });
    }

    const switchResponse = await authService.switchAccount(req.user!.id, switchRequest);

    res.json({
      success: true,
      data: switchResponse
    });

  } catch (error: any) {
    console.error('Switch account error:', error);
    
    if (error.code) {
      const statusCode = error.code === 'ACCOUNT_NOT_FOUND' ? 404 :
                        error.code === 'INSUFFICIENT_PERMISSIONS' ? 403 : 400;

      return res.status(statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'アカウント切り替え中にエラーが発生しました'
      }
    });
  }
});

/**
 * GET /auth/permissions
 * 現在の権限一覧取得
 */
router.get('/permissions', authenticateToken, async (req, res) => {
  try {
    // TODO: 詳細な権限取得実装
    const permissions = req.permissions || [];

    res.json({
      success: true,
      data: {
        permissions,
        account: req.account,
        user: req.user
      }
    });

  } catch (error: any) {
    console.error('Get permissions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '権限情報取得中にエラーが発生しました'
      }
    });
  }
});

/**
 * POST /auth/register
 * 新規ユーザー登録
 */
router.post('/register', rateLimit(50), async (req, res) => {
  try {
    const registerRequest: RegisterRequest = req.body;

    // 入力検証
    if (!registerRequest.email || !registerRequest.password || 
        !registerRequest.firstName || !registerRequest.lastName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '必要な情報が不足しています'
        }
      });
    }

    // TODO: ユーザー登録機能実装
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'ユーザー登録機能は実装中です'
      }
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ユーザー登録中にエラーが発生しました'
      }
    });
  }
});

/**
 * GET /auth/audit-logs
 * 監査ログ取得（管理者のみ）
 */
router.get('/audit-logs', 
  authenticateToken, 
  requirePermission('account_settings', 'read'),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const auditLogs = authService.getAuditLogs(req.account!.id, limit);

      res.json({
        success: true,
        data: {
          logs: auditLogs,
          total: auditLogs.length
        }
      });

    } catch (error: any) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '監査ログ取得中にエラーが発生しました'
        }
      });
    }
  }
);

export default router;