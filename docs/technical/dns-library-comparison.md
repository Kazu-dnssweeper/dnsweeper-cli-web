# DNS解決基盤ライブラリ選定: node:dns vs dns2

## 📋 要件分析

DNSweeperプロジェクトに必要なDNS機能：

### 必要なDNSレコード型
- **A**: IPv4アドレス
- **AAAA**: IPv6アドレス  
- **CNAME**: 正規名エイリアス
- **MX**: メールエクスチェンジ (priority付き)
- **TXT**: テキストレコード
- **NS**: ネームサーバー
- **SOA**: Start of Authority
- **SRV**: サービスレコード (priority, weight, port付き)
- **PTR**: 逆引きDNS
- **CAA**: Certificate Authority Authorization

### 必要な機能
1. **DNS解決/クエリ**: 各レコード型の取得
2. **レコード作成**: DNS管理API連携想定
3. **エラーハンドリング**: タイムアウト、NXDOMAIN等
4. **パフォーマンス**: 大量クエリ処理
5. **TypeScript対応**: 型安全性

## 🔍 node:dns 分析

### 概要
- Node.js組み込みモジュール
- version: Node.js 20.x対応
- 追加依存なし
- 公式サポート

### 対応レコード型
```typescript
import { promises as dns } from 'node:dns';

// ✅ 対応済み
dns.resolve4('example.com')      // A records
dns.resolve6('example.com')      // AAAA records
dns.resolveCname('example.com')  // CNAME records
dns.resolveMx('example.com')     // MX records (priority付き)
dns.resolveTxt('example.com')    // TXT records
dns.resolveNs('example.com')     // NS records
dns.resolveSoa('example.com')    // SOA records
dns.resolveSrv('_service._tcp.example.com') // SRV records
dns.resolvePtr('1.1.168.192.in-addr.arpa')  // PTR records

// ❌ 未対応
// CAA records - dns.resolveCaa()は存在しない
```

### メリット
- **依存関係なし**: 追加パッケージ不要
- **公式サポート**: Node.jsチームメンテナンス
- **安定性**: 長期間のバトルテスト済み
- **パフォーマンス**: C++レベル最適化
- **TypeScript**: @types/nodeで型定義済み

### デメリット
- **機能制限**: CAAレコード未対応
- **API設計**: レコード型ごとに異なる関数
- **カスタムサーバー**: 設定が複雑
- **低レベルAPI**: 追加の抽象化が必要

### コード例
```typescript
import { promises as dns } from 'node:dns';

async function resolveRecords(domain: string, type: string) {
  switch (type) {
    case 'A':
      return await dns.resolve4(domain);
    case 'AAAA':
      return await dns.resolve6(domain);
    case 'MX':
      return await dns.resolveMx(domain);
    default:
      throw new Error(`Unsupported record type: ${type}`);
  }
}
```

## 🔍 dns2 分析

### 概要
- 第三者ライブラリ
- npm package: `dns2`
- 現在version: 2.1.0
- 追加依存必要

### 対応レコード型
```typescript
import DNS from 'dns2';

// ✅ 全レコード型対応
const query = await DNS.query('example.com', DNS.RecordType.A);
// A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, PTR, CAA全対応
```

### メリット
- **統一API**: 全レコード型で同じインターフェース
- **CAAレコード対応**: CAA查询完全サポート
- **柔軟設定**: カスタムDNSサーバー簡単設定
- **モダンAPI**: Promise/async-awaitネイティブ
- **詳細レスポンス**: より詳しい結果情報

### デメリット
- **外部依存**: 追加パッケージメンテナンス必要
- **サイズ**: バンドルサイズ増加
- **メンテナンス**: コミュニティメンテナンス
- **セキュリティ**: 定期的な脆弱性チェック必要

### コード例
```typescript
import DNS from 'dns2';

async function resolveRecords(domain: string, type: string) {
  const recordType = DNS.RecordType[type as keyof typeof DNS.RecordType];
  const result = await DNS.query(domain, recordType);
  return result.answers;
}
```

## 📊 比較マトリックス

| 項目 | node:dns | dns2 | 勝者 |
|------|----------|------|------|
| **レコード型対応** | 9/10 (CAA未対応) | 10/10 | dns2 |
| **API統一性** | 6/10 (型別関数) | 9/10 (統一API) | dns2 |
| **依存関係** | 10/10 (内蔵) | 7/10 (外部依存) | node:dns |
| **TypeScript対応** | 9/10 | 8/10 | node:dns |
| **パフォーマンス** | 10/10 | 8/10 | node:dns |
| **メンテナンス** | 10/10 (公式) | 7/10 (コミュニティ) | node:dns |
| **学習コスト** | 7/10 | 9/10 | dns2 |
| **柔軟性** | 6/10 | 9/10 | dns2 |

## 🎯 推奨決定

### **選択: node:dns + 抽象化レイヤー**

#### 理由
1. **プロダクション安定性**: 公式モジュールの信頼性
2. **ゼロ依存**: セキュリティ・メンテナンス負荷軽減
3. **パフォーマンス**: C++レベルの最適化
4. **CAA対応策**: 将来のNode.js更新で対応予定 + 必要時dns2併用可能

#### 実装戦略
```typescript
// 1. 抽象化レイヤー作成
class DNSResolver {
  async resolve(domain: string, type: DNSRecordType) {
    // node:dnsの統一インターフェース
  }
}

// 2. CAA専用でdns2併用（必要時）
async function resolveCaa(domain: string) {
  // dns2使用
}
```

## 📝 実装計画

### Phase 1: node:dns基盤実装
- [ ] DNSResolverクラス設計
- [ ] 統一APIインターフェース作成
- [ ] A, AAAA, CNAME, MX, TXT実装
- [ ] エラーハンドリング実装

### Phase 2: 拡張対応
- [ ] NS, SOA, SRV, PTR実装
- [ ] CAA対応（dns2併用検討）
- [ ] パフォーマンス最適化
- [ ] テスト実装

### Phase 3: 統合
- [ ] CLI コマンド統合
- [ ] CSV処理連携
- [ ] ドキュメント作成

## 🔗 参考資料
- [Node.js DNS Documentation](https://nodejs.org/api/dns.html)
- [dns2 GitHub Repository](https://github.com/song940/node-dns)
- [DNS Record Types - RFC](https://tools.ietf.org/html/rfc1035)