# インポート最適化ガイド

## 概要

このドキュメントでは、DNSweeperプロジェクトにおけるインポート文の最適化方法について説明します。

## 1. ワイルドカードインポートの解消

### 問題のあるコード
```typescript
// src/commands/performance.ts
import * as fs from 'fs/promises';
import * as path from 'path';
```

### 最適化後
```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';
```

**メリット**:
- バンドルサイズの削減
- Tree-shakingの効率化
- 使用している関数が明確になる

## 2. 未使用インポートの削除

### 削除すべきインポート
```typescript
// src/commands/performance.ts
import os from 'os';     // 未使用
import chalk from 'chalk'; // 未使用
```

## 3. パスエイリアスの活用

### tsconfig.jsonの設定
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@commands/*": ["src/commands/*"],
      "@lib/*": ["src/lib/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

### 使用例

#### Before（深いネスト構造）
```typescript
// src/lib/microservices/gateway/api-gateway.ts
import { Logger } from '../../logger.js';
import type { ServiceInstance } from '../core/types.js';
```

#### After（パスエイリアス使用）
```typescript
import { Logger } from '@lib/logger.js';
import type { ServiceInstance } from '@lib/microservices/core/types.js';
```

## 4. 型インポートの明確化

### 型のみのインポートは`import type`を使用
```typescript
// Good
import type { DNSRecordType, IDNSRecord } from '@types/index.js';

// Avoid
import { DNSRecordType, IDNSRecord } from '@types/index.js';
```

## 5. インポート順序の統一

推奨されるインポート順序：

1. Node.js標準モジュール
2. 外部パッケージ
3. 内部モジュール（パスエイリアス使用）
4. 相対パスのローカルモジュール
5. 型定義

```typescript
// 1. Node.js標準モジュール
import { readFile } from 'fs/promises';
import { join } from 'path';

// 2. 外部パッケージ
import { Command } from 'commander';

// 3. 内部モジュール（パスエイリアス）
import { Logger } from '@lib/logger.js';
import { DNSResolver } from '@lib/dns-resolver.js';

// 4. 相対パスのローカルモジュール
import { validateDomain } from './validators.js';

// 5. 型定義
import type { DNSRecordType, IDNSRecord } from '@types/index.js';
```

## 6. 実装時の注意事項

### パスエイリアスのランタイムサポート

TypeScriptのパスエイリアスは、実行時には自動的に解決されません。以下の方法で対応する必要があります：

1. **開発時（ts-node/tsx）**: `tsconfig-paths`を使用
   ```bash
   npm install -D tsconfig-paths
   ```
   
   ```json
   // package.json
   {
     "scripts": {
       "dev": "tsx -r tsconfig-paths/register src/index.ts"
     }
   }
   ```

2. **ビルド時**: `tsc-alias`を使用してパスを書き換え
   ```bash
   npm install -D tsc-alias
   ```
   
   ```json
   // package.json
   {
     "scripts": {
       "build": "tsc && tsc-alias"
     }
   }
   ```

3. **バンドラー使用時**: esbuildやwebpackの設定でパスを解決

## 7. 段階的な移行戦略

1. **Phase 1**: ワイルドカードインポートと未使用インポートの削除 ✅
2. **Phase 2**: 新規ファイルでパスエイリアスを使用開始 ✅
3. **Phase 3**: 既存ファイルを段階的に更新（進行中）
4. **Phase 4**: ESLintルールを追加して一貫性を保つ

## 8. 実装進捗

### 完了したファイル ✅
- `/src/commands/performance.ts` - ワイルドカードインポート削除
- `/src/lib/microservices/gateway/api-gateway.ts` - パスエイリアス導入
- `/src/lib/microservices/circuit-breaker/circuit-breaker.ts` - パスエイリアス導入
- `/src/lib/microservices/discovery/service-registry.ts` - パスエイリアス導入
- `/src/lib/microservices/microservices-architecture.ts` - パスエイリアス導入
- `/src/lib/i18n-manager.ts` - パスエイリアス導入

### 期待される効果
- 相対パス `../../logger.js` → `@lib/logger.js`
- 深いネスト構造の解消
- インポート文の可読性向上
- リファクタリング時の作業効率向上

## 8. ESLint設定の追加

```javascript
// .eslintrc.json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": ["../*", "./*"],
      "message": "Use path aliases instead of relative imports"
    }],
    "@typescript-eslint/consistent-type-imports": ["error", {
      "prefer": "type-imports"
    }]
  }
}
```

## まとめ

インポート文の最適化により、以下のメリットが得られます：

- コードの可読性向上
- バンドルサイズの削減
- TypeScriptのコンパイル時間短縮
- リファクタリング時の作業効率向上
- 依存関係の明確化

段階的に実装することで、既存のコードベースに影響を与えることなく、品質を向上させることができます。