/**
 * DNSweeper エンタープライズ認証APIルート
 * Active Directory統合・LDAP/SAML認証エンドポイント
 */

import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import * as ldap from 'ldapjs';
import * as saml from 'samlify';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

// ===== Active Directory / LDAP エンドポイント =====

/**
 * AD認証
 */
router.post('/auth/ad/authenticate', [
  body('userPrincipalName').isEmail().withMessage('有効なメールアドレスを入力してください'),
  body('password').isLength({ min: 1 }).withMessage('パスワードが必要です'),
  body('domain').isLength({ min: 1 }).withMessage('ドメインが必要です'),
  body('ldapUrl').isURL().withMessage('有効なLDAP URLを入力してください')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'バリデーションエラー',
        details: errors.array()
      });
    }

    const { userPrincipalName, password, domain, ldapUrl } = req.body;

    // LDAP設定
    const client = ldap.createClient({
      url: ldapUrl,
      timeout: 5000,
      connectTimeout: 10000,
      tlsOptions: {
        rejectUnauthorized: false
      }
    });

    try {
      // LDAP認証試行
      await new Promise((resolve, reject) => {
        client.bind(userPrincipalName, password, (err) => {
          if (err) {
            reject(new Error(`AD認証失敗: ${err.message}`));
          } else {
            resolve(true);
          }
        });
      });

      // ユーザー情報取得
      const userInfo = await searchLdapUser(client, userPrincipalName, domain);
      
      // グループメンバーシップ取得
      const groups = await searchUserGroups(client, userInfo.distinguishedName, domain);

      client.unbind();

      const adUserInfo = {
        distinguishedName: userInfo.distinguishedName,
        userPrincipalName: userInfo.userPrincipalName,
        samAccountName: userInfo.samAccountName,
        attributes: {
          uid: userInfo.samAccountName,
          cn: userInfo.cn,
          mail: userInfo.mail,
          givenName: userInfo.givenName,
          sn: userInfo.sn,
          memberOf: groups.map(g => g.distinguishedName),
          department: userInfo.department,
          title: userInfo.title,
          telephoneNumber: userInfo.telephoneNumber,
          manager: userInfo.manager,
          employeeId: userInfo.employeeId,
          accountExpires: userInfo.accountExpires
        },
        groupMemberships: groups.map(g => g.distinguishedName),
        lastLogon: new Date(),
        accountExpires: userInfo.accountExpires ? new Date(userInfo.accountExpires) : undefined,
        pwdLastSet: userInfo.pwdLastSet ? new Date(userInfo.pwdLastSet) : undefined,
        badPwdCount: userInfo.badPwdCount || 0,
        lockoutTime: userInfo.lockoutTime ? new Date(userInfo.lockoutTime) : undefined
      };

      res.json({
        success: true,
        data: adUserInfo
      });

    } catch (error) {
      client.unbind();
      throw error;
    }

  } catch (error) {
    console.error('AD認証エラー:', error);
    res.status(401).json({
      success: false,
      error: 'AD認証に失敗しました',
      message: error instanceof Error ? error.message : '不明なエラー'
    });
  }
});

/**
 * ADユーザー情報取得
 */
router.get('/auth/ad/users/:userPrincipalName', authenticateToken, async (req, res) => {
  try {
    const { userPrincipalName } = req.params;
    
    // LDAP設定を取得（実際の実装では環境変数やデータベースから）
    const ldapConfig = await getLdapConfig(req.user.accountId);
    
    const client = ldap.createClient({
      url: ldapConfig.ldapUrl,
      timeout: 5000
    });

    try {
      // 管理者権限でバインド
      await new Promise((resolve, reject) => {
        client.bind(ldapConfig.bindDn, ldapConfig.bindPassword, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      const userInfo = await searchLdapUser(client, userPrincipalName, ldapConfig.domain);
      const groups = await searchUserGroups(client, userInfo.distinguishedName, ldapConfig.domain);

      client.unbind();

      res.json({
        success: true,
        data: {
          ...userInfo,
          groupMemberships: groups
        }
      });

    } catch (error) {
      client.unbind();
      throw error;
    }

  } catch (error) {
    console.error('ADユーザー情報取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ADユーザー情報の取得に失敗しました'
    });
  }
});

/**
 * ADユーザーグループ取得
 */
router.get('/auth/ad/users/:userPrincipalName/groups', authenticateToken, async (req, res) => {
  try {
    const { userPrincipalName } = req.params;
    
    const ldapConfig = await getLdapConfig(req.user.accountId);
    const client = ldap.createClient({ url: ldapConfig.ldapUrl });

    try {
      await new Promise((resolve, reject) => {
        client.bind(ldapConfig.bindDn, ldapConfig.bindPassword, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      // ユーザーのDNを取得
      const userInfo = await searchLdapUser(client, userPrincipalName, ldapConfig.domain);
      
      // グループメンバーシップを取得
      const groups = await searchUserGroups(client, userInfo.distinguishedName, ldapConfig.domain);

      client.unbind();

      res.json({
        success: true,
        data: groups.map(group => ({
          id: group.objectGUID,
          name: group.cn,
          description: group.description,
          distinguishedName: group.distinguishedName,
          groupType: group.groupType,
          scope: group.groupScope,
          memberCount: group.memberCount || 0
        }))
      });

    } catch (error) {
      client.unbind();
      throw error;
    }

  } catch (error) {
    console.error('ADグループ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ADグループ情報の取得に失敗しました'
    });
  }
});

/**
 * 組織単位取得
 */
router.get('/auth/ad/organization-units', authenticateToken, async (req, res) => {
  try {
    const ldapConfig = await getLdapConfig(req.user.accountId);
    const client = ldap.createClient({ url: ldapConfig.ldapUrl });

    try {
      await new Promise((resolve, reject) => {
        client.bind(ldapConfig.bindDn, ldapConfig.bindPassword, (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });

      const ous = await searchOrganizationUnits(client, ldapConfig.baseDn);

      client.unbind();

      res.json({
        success: true,
        data: ous
      });

    } catch (error) {
      client.unbind();
      throw error;
    }

  } catch (error) {
    console.error('組織単位取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '組織単位の取得に失敗しました'
    });
  }
});

/**
 * AD同期
 */
router.post('/auth/ad/sync', authenticateToken, [
  body('userPrincipalName').isEmail(),
  body('fullSync').optional().isBoolean()
], async (req, res) => {
  try {
    const { userPrincipalName, fullSync = false } = req.body;
    
    // AD同期処理を実行
    const syncResult = await performAdSync(userPrincipalName, fullSync, req.user.accountId);
    
    res.json({
      success: true,
      data: {
        syncedAt: new Date(),
        itemsSynced: syncResult.itemsSynced,
        changes: syncResult.changes
      }
    });

  } catch (error) {
    console.error('AD同期エラー:', error);
    res.status(500).json({
      success: false,
      error: 'AD同期に失敗しました'
    });
  }
});

// ===== SAML エンドポイント =====

/**
 * SAML認証開始
 */
router.get('/auth/saml/login', async (req, res) => {
  try {
    const { RelayState } = req.query;
    
    // SAML設定を取得
    const samlConfig = await getSamlConfig();
    
    // Service Provider設定
    const sp = saml.ServiceProvider({
      entityID: samlConfig.spEntityId,
      assertionConsumerService: [{
        Binding: saml.Constants.namespace.binding.post,
        Location: samlConfig.spAssertionConsumerServiceUrl,
      }],
      singleLogoutService: [{
        Binding: saml.Constants.namespace.binding.post,
        Location: samlConfig.spSingleLogoutServiceUrl,
      }],
    });

    // Identity Provider設定
    const idp = saml.IdentityProvider({
      entityID: samlConfig.idpEntityId,
      singleSignOnService: [{
        Binding: saml.Constants.namespace.binding.post,
        Location: samlConfig.idpSingleSignOnUrl,
      }],
    });

    // 認証リクエスト生成
    const { id, context: loginRequestInfo } = sp.createLoginRequest(idp, 'post');
    
    // セッションに保存
    req.session.samlRequestId = id;
    if (RelayState) {
      req.session.samlRelayState = RelayState;
    }

    res.json({
      success: true,
      data: {
        loginUrl: idp.entityMeta.getSingleSignOnService('post'),
        samlRequest: loginRequestInfo,
        relayState: RelayState
      }
    });

  } catch (error) {
    console.error('SAML認証開始エラー:', error);
    res.status(500).json({
      success: false,
      error: 'SAML認証の開始に失敗しました'
    });
  }
});

/**
 * SAML認証応答処理 (ACS)
 */
router.post('/auth/saml/acs', [
  body('SAMLResponse').isLength({ min: 1 }),
  body('RelayState').optional()
], async (req, res) => {
  try {
    const { SAMLResponse, RelayState } = req.body;
    
    const samlConfig = await getSamlConfig();
    
    // SP設定
    const sp = saml.ServiceProvider({
      entityID: samlConfig.spEntityId,
      assertionConsumerService: [{
        Binding: saml.Constants.namespace.binding.post,
        Location: samlConfig.spAssertionConsumerServiceUrl,
      }],
      privateKey: samlConfig.spPrivateKey,
      privateKeyPass: '',
      isAssertionEncrypted: samlConfig.encryptAssertions,
    });

    // IDP設定
    const idp = saml.IdentityProvider({
      entityID: samlConfig.idpEntityId,
      x509Certificate: samlConfig.idpX509Certificate,
    });

    // 応答を検証・パース
    const { extract } = await sp.parseLoginResponse(idp, 'post', {
      body: { SAMLResponse }
    });

    // ユーザー情報を抽出
    const attributes = extract.attributes;
    const nameID = extract.nameID;

    // 属性マッピング
    const userInfo = {
      email: attributes[samlConfig.attributeMapping.email],
      firstName: attributes[samlConfig.attributeMapping.firstName],
      lastName: attributes[samlConfig.attributeMapping.lastName],
      department: attributes[samlConfig.attributeMapping.department],
      title: attributes[samlConfig.attributeMapping.title],
      groups: attributes[samlConfig.attributeMapping.groups] || [],
      employeeId: attributes[samlConfig.attributeMapping.employeeId],
      manager: attributes[samlConfig.attributeMapping.manager],
      nameID,
      sessionIndex: extract.sessionIndex?.sessionIndex
    };

    // ユーザーアカウントの作成または更新
    const user = await createOrUpdateSamlUser(userInfo);
    
    // JWTトークン生成
    const token = jwt.sign(
      { 
        userId: user.id, 
        accountId: user.accountId,
        authMethod: 'saml',
        sessionIndex: userInfo.sessionIndex
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      data: {
        user,
        token,
        sessionIndex: userInfo.sessionIndex,
        relayState: RelayState
      }
    });

  } catch (error) {
    console.error('SAML認証応答処理エラー:', error);
    res.status(401).json({
      success: false,
      error: 'SAML認証に失敗しました',
      message: error instanceof Error ? error.message : '不明なエラー'
    });
  }
});

/**
 * SAML シングルログアウト開始
 */
router.post('/auth/saml/slo', authenticateToken, async (req, res) => {
  try {
    const samlConfig = await getSamlConfig();
    
    const sp = saml.ServiceProvider({
      entityID: samlConfig.spEntityId,
      singleLogoutService: [{
        Binding: saml.Constants.namespace.binding.post,
        Location: samlConfig.spSingleLogoutServiceUrl,
      }],
      privateKey: samlConfig.spPrivateKey,
    });

    const idp = saml.IdentityProvider({
      entityID: samlConfig.idpEntityId,
      singleLogoutService: [{
        Binding: saml.Constants.namespace.binding.post,
        Location: samlConfig.idpSingleLogoutUrl,
      }],
    });

    // ログアウトリクエスト生成
    const { id, context } = sp.createLogoutRequest(idp, 'post', {
      nameID: req.user.nameID,
      sessionIndex: req.user.sessionIndex
    });

    res.json({
      success: true,
      data: {
        logoutUrl: idp.entityMeta.getSingleLogoutService('post'),
        logoutRequest: context,
        requestId: id
      }
    });

  } catch (error) {
    console.error('SAMLログアウトエラー:', error);
    res.status(500).json({
      success: false,
      error: 'SAMLログアウトに失敗しました'
    });
  }
});

// ===== エンタープライズ認証統合エンドポイント =====

/**
 * エンタープライズログイン
 */
router.post('/auth/login', [
  body('credentials').isObject(),
  body('ssoProvider').optional().isIn(['active_directory', 'saml', 'oauth2', 'local']),
  body('domain').optional().isString(),
  body('deviceInfo').optional().isObject(),
  body('locationInfo').optional().isObject()
], async (req, res) => {
  try {
    const { credentials, ssoProvider = 'local', domain, deviceInfo, locationInfo } = req.body;
    
    let authResult;
    
    switch (ssoProvider) {
      case 'active_directory':
        authResult = await authenticateWithAd(credentials, domain);
        break;
      case 'saml':
        authResult = await authenticateWithSaml(credentials);
        break;
      case 'local':
      default:
        authResult = await authenticateLocal(credentials);
        break;
    }

    // セッション生成
    const session = await createEnterpriseSession({
      userId: authResult.user.id,
      accountId: authResult.account.id,
      authMethod: ssoProvider,
      deviceInfo,
      locationInfo,
      riskScore: calculateLoginRisk(deviceInfo, locationInfo)
    });

    // 権限・グループ情報取得
    const permissions = await getUserPermissions(authResult.user.id, authResult.account.id);
    const groupMemberships = await getUserGroups(authResult.user.id);
    const appliedPolicies = await getAppliedPolicies(authResult.user.id, authResult.account.id);

    res.json({
      success: true,
      data: {
        user: authResult.user,
        account: authResult.account,
        session,
        permissions,
        groupMemberships,
        appliedPolicies
      }
    });

  } catch (error) {
    console.error('エンタープライズログインエラー:', error);
    res.status(401).json({
      success: false,
      error: '認証に失敗しました',
      message: error instanceof Error ? error.message : '不明なエラー'
    });
  }
});

/**
 * 現在のユーザー情報取得
 */
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.user.accountId;
    
    const user = await getEnterpriseUser(userId);
    const account = await getEnterpriseAccount(accountId);
    const session = await getCurrentSession(req);
    const permissions = await getUserPermissions(userId, accountId);
    const groupMemberships = await getUserGroups(userId);
    const appliedPolicies = await getAppliedPolicies(userId, accountId);

    res.json({
      success: true,
      data: {
        user,
        account,
        session,
        permissions,
        groupMemberships,
        appliedPolicies
      }
    });

  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ユーザー情報の取得に失敗しました'
    });
  }
});

/**
 * 権限チェック
 */
router.post('/auth/check-permission', authenticateToken, [
  body('resource').isString(),
  body('action').isString(),
  body('conditions').optional().isObject()
], async (req, res) => {
  try {
    const { resource, action, conditions } = req.body;
    const userId = req.user.id;
    const accountId = req.user.accountId;
    
    const permitted = await checkUserPermission(userId, accountId, resource, action, conditions);
    
    res.json({
      success: true,
      data: {
        permitted,
        resource,
        action,
        conditions
      }
    });

  } catch (error) {
    console.error('権限チェックエラー:', error);
    res.status(500).json({
      success: false,
      error: '権限チェックに失敗しました'
    });
  }
});

// ===== ヘルパー関数 =====

async function searchLdapUser(client: any, userPrincipalName: string, domain: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const searchBase = `DC=${domain.split('.').join(',DC=')}`;
    const searchFilter = `(userPrincipalName=${userPrincipalName})`;
    
    const searchOptions = {
      scope: 'sub',
      filter: searchFilter,
      attributes: [
        'distinguishedName', 'userPrincipalName', 'samAccountName', 'cn',
        'mail', 'givenName', 'sn', 'department', 'title', 'telephoneNumber',
        'manager', 'employeeId', 'accountExpires', 'pwdLastSet', 'badPwdCount',
        'lockoutTime', 'memberOf'
      ]
    };

    client.search(searchBase, searchOptions, (err: any, res: any) => {
      if (err) {
        reject(err);
        return;
      }

      let user: any = null;

      res.on('searchEntry', (entry: any) => {
        user = entry.object;
      });

      res.on('error', (err: any) => {
        reject(err);
      });

      res.on('end', () => {
        if (user) {
          resolve(user);
        } else {
          reject(new Error('ユーザーが見つかりませんでした'));
        }
      });
    });
  });
}

async function searchUserGroups(client: any, userDN: string, domain: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const searchBase = `DC=${domain.split('.').join(',DC=')}`;
    const searchFilter = `(&(objectClass=group)(member=${userDN}))`;
    
    const searchOptions = {
      scope: 'sub',
      filter: searchFilter,
      attributes: ['cn', 'description', 'distinguishedName', 'groupType', 'objectGUID']
    };

    client.search(searchBase, searchOptions, (err: any, res: any) => {
      if (err) {
        reject(err);
        return;
      }

      const groups: any[] = [];

      res.on('searchEntry', (entry: any) => {
        groups.push(entry.object);
      });

      res.on('error', (err: any) => {
        reject(err);
      });

      res.on('end', () => {
        resolve(groups);
      });
    });
  });
}

async function searchOrganizationUnits(client: any, baseDN: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const searchFilter = '(objectClass=organizationalUnit)';
    
    const searchOptions = {
      scope: 'sub',
      filter: searchFilter,
      attributes: ['ou', 'description', 'distinguishedName']
    };

    client.search(baseDN, searchOptions, (err: any, res: any) => {
      if (err) {
        reject(err);
        return;
      }

      const ous: any[] = [];

      res.on('searchEntry', (entry: any) => {
        ous.push({
          id: crypto.randomUUID(),
          name: entry.object.ou,
          description: entry.object.description,
          distinguishedName: entry.object.distinguishedName,
          depth: entry.object.distinguishedName.split(',').length - baseDN.split(',').length
        });
      });

      res.on('error', (err: any) => {
        reject(err);
      });

      res.on('end', () => {
        resolve(ous);
      });
    });
  });
}

async function getLdapConfig(accountId: string): Promise<any> {
  // 実際の実装では、データベースから設定を取得
  return {
    domain: process.env.AD_DOMAIN || 'example.com',
    ldapUrl: process.env.AD_LDAP_URL || 'ldap://dc.example.com:389',
    baseDn: process.env.AD_BASE_DN || 'DC=example,DC=com',
    bindDn: process.env.AD_BIND_DN || 'CN=ldapuser,DC=example,DC=com',
    bindPassword: process.env.AD_BIND_PASSWORD || 'password'
  };
}

async function getSamlConfig(): Promise<any> {
  // 実際の実装では、データベースから設定を取得
  return {
    spEntityId: process.env.SAML_SP_ENTITY_ID || 'https://dnsweeper.example.com',
    spAssertionConsumerServiceUrl: process.env.SAML_SP_ACS_URL || 'https://dnsweeper.example.com/api/enterprise/auth/saml/acs',
    spSingleLogoutServiceUrl: process.env.SAML_SP_SLO_URL || 'https://dnsweeper.example.com/api/enterprise/auth/saml/slo',
    spPrivateKey: process.env.SAML_SP_PRIVATE_KEY || '',
    idpEntityId: process.env.SAML_IDP_ENTITY_ID || 'https://idp.example.com',
    idpSingleSignOnUrl: process.env.SAML_IDP_SSO_URL || 'https://idp.example.com/sso',
    idpSingleLogoutUrl: process.env.SAML_IDP_SLO_URL || 'https://idp.example.com/slo',
    idpX509Certificate: process.env.SAML_IDP_CERTIFICATE || '',
    encryptAssertions: process.env.SAML_ENCRYPT_ASSERTIONS === 'true',
    attributeMapping: {
      email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      department: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/department',
      title: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/title',
      groups: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/groups',
      employeeId: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/employeeid',
      manager: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/manager'
    }
  };
}

// プレースホルダー関数（実際の実装では適切なデータベース操作を行う）
async function performAdSync(userPrincipalName: string, fullSync: boolean, accountId: string): Promise<any> {
  return { itemsSynced: 0, changes: [] };
}

async function createOrUpdateSamlUser(userInfo: any): Promise<any> {
  return { id: '1', accountId: '1', email: userInfo.email };
}

async function authenticateWithAd(credentials: any, domain: string): Promise<any> {
  return { user: { id: '1' }, account: { id: '1' } };
}

async function authenticateWithSaml(credentials: any): Promise<any> {
  return { user: { id: '1' }, account: { id: '1' } };
}

async function authenticateLocal(credentials: any): Promise<any> {
  return { user: { id: '1' }, account: { id: '1' } };
}

async function createEnterpriseSession(data: any): Promise<any> {
  return { 
    token: jwt.sign(data, process.env.JWT_SECRET || 'secret', { expiresIn: '8h' }),
    sessionId: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
  };
}

async function getUserPermissions(userId: string, accountId: string): Promise<any[]> {
  return [];
}

async function getUserGroups(userId: string): Promise<any[]> {
  return [];
}

async function getAppliedPolicies(userId: string, accountId: string): Promise<any[]> {
  return [];
}

async function getEnterpriseUser(userId: string): Promise<any> {
  return { id: userId };
}

async function getEnterpriseAccount(accountId: string): Promise<any> {
  return { id: accountId };
}

async function getCurrentSession(req: any): Promise<any> {
  return { sessionId: crypto.randomUUID() };
}

async function checkUserPermission(userId: string, accountId: string, resource: string, action: string, conditions?: any): Promise<boolean> {
  return true;
}

function calculateLoginRisk(deviceInfo: any, locationInfo: any): number {
  let risk = 0;
  
  if (!deviceInfo?.isTrusted) risk += 25;
  if (!deviceInfo?.isManaged) risk += 20;
  if (!locationInfo?.isTrusted) risk += 30;
  if (locationInfo?.vpnDetected) risk += 15;
  
  return Math.min(risk, 100);
}

export default router;