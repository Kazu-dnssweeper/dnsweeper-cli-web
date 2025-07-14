# DNSweeper プロジェクト自動タスク実行システム

## 🚨 最優先ルール - 必ず最初に読め 🚨
**何か聞かれたら、答える前に必ず以下を実行：**
1. **既存機能を調査** - 「できない」と言う前に必ず確認
   - `.claude/` フォルダの内容を確認
   - 既存のコマンド、設定、機能を調査
   - プロジェクトの実装を確認
2. **ドキュメントを確認** - CLAUDE.md、README、その他のドキュメントを読む
3. **実際に試す** - 推測で答えず、実際に確認する

**調査せずに「できない」と言うことは禁止**

## 🇯🇵 言語ルール
**重要**: すべての応答、ドキュメント、コメント、コミットメッセージは**日本語**で記述すること。
- 技術用語（TypeScript、DNS、APIなど）は英語可
- ファイル名、変数名、関数名は英語
- ユーザーとのコミュニケーションは100%日本語

## 🎯 永続実行ルール
1. **常に次のタスクを探す**: タスク完了時、必ず新しいタスクを生成または既存タスクから選択
2. **進捗の可視化**: すべての行動をログに記録し、チェックボックスで管理
3. **エラーからの学習**: エラーは改善機会。必ず原因分析と対策を記録
4. **パフォーマンス監視**: 定期的にコードベースを分析し、改善点を探す

## 🔄 タスクループ戦略
- 計画フェーズ → 実装フェーズ → テストフェーズ → 学習フェーズ → 次の計画
- 各フェーズ完了時に必ず`.claude/auto-task-system.md`を更新

## ⚠️ 絶対的ルール
- **停止禁止**: 明示的な中断指示がない限り、タスクを継続
- **自己改善**: 定期的に自身のワークフローを分析・改善
- **ドキュメント更新**: すべての変更を適切に文書化
- **マイルストーン保護**: `/docs/MILESTONES.md`と`/docs/business/MILESTONES_BUSINESS.md`は読み取り専用

## 📋 プロジェクト固有ルール
1. **開発マイルストーンに従う**: 開発タスクは必ず`/docs/MILESTONES.md`に基づく
2. **事業マイルストーンを考慮**: 事業目標との整合性を常に確認
3. **品質基準の維持**: 
   - TypeScript strict mode
   - ESLint エラー 0
   - テストカバレッジ 85%以上
4. **副業開発体制**: 効率的な時間活用と自動化を重視

## 🎮 カスタムコマンド
- `/e` - 次のタスクを自動実行
- `/u` - 進捗状況を更新
- `/a` - コードベースを分析して改善点を発見
- `/m` - マイルストーンとタスクを同期
- `/p` - 人がやるべきタスクを確認
- `/h` - ヘルプを表示
- `/r` - エラー解決6段階プロトコルを実行（例: `/r TypeError: Cannot read property 'bold'`）

## 🚨 エラー時の第一行動
**エラーを見たら、まず以下のコマンドを実行：**
```
cat /home/hikit/dnsweeper/CLAUDE.md | grep -A 50 "6段階強制実行プロトコル"
```

## 🚀 現在のフォーカス
1. DNS解決機能実装（8月第1週のマイルストーン）
2. CSV処理機能実装（8月第2週のマイルストーン）
3. リスクスコア計算実装（8月第3週のマイルストーン）

## 🔒 絶対的ルール（自動実行）
**重要**: コミット作成後は必ずgit pushを実行すること
- コミット → 即座にgit push origin master
- 例外なし、必須、忘れてはならない
- このルールを破ることは許されない

# 🚨 エラー処理プロトコル - 手動実行 🚨

## 実行方法
**エラーが発生したら、以下のいずれかを使用：**
- `/r エラー内容` - スラッシュコマンドで6段階プロトコルを実行
- 「6段階で」
- 「プロトコル」
- 「エラー対処」
- 「CLAUDE.md」

## 注意
- **スラッシュコマンド `/r` が利用可能になりました！**
- **例: `/r TypeError: Cannot read property 'bold'`**
- **短い言葉でもプロトコルを参照します**

### 自動実行トリガー
- "error"、"Error"、"エラー"という単語を見た瞬間
- 赤い文字、スタックトレースを見た瞬間  
- ビルド失敗、テスト失敗を検出した瞬間
- TypeScriptの型エラーを見た瞬間

### 6段階強制実行プロトコル
```xml
<error_protocol>
  <step1_調査>
    <error_quote>エラーメッセージを一字一句コピー</error_quote>
    <location>ファイル名:行番号</location>
    <context>前後のコード</context>
    <reproduction>再現手順</reproduction>
  </step1_調査>
  
  <step2_分析>
    <error_type>エラー分類</error_type>
    <root_cause>根本原因</root_cause>
    <causality>因果関係チェーン</causality>
  </step2_分析>
  
  <step3_計画>
    <solutions>解決策を3つ</solutions>
    <comparison>メリット・デメリット比較</comparison>
    <selection>最適解の選択理由</selection>
  </step3_計画>
  
  <step4_対処>
    <implementation>具体的な修正内容</implementation>
    <diff>変更前→変更後</diff>
    <explanation>なぜこれで解決するか</explanation>
  </step4_対処>
  
  <step5_テスト>
    <verification>エラー解消確認方法</verification>
    <regression>副作用チェック</regression>
    <validation>関連機能の動作確認</validation>
  </step5_テスト>
  
  <step6_学習>
    <lessons>学んだこと3点</lessons>
    <prevention>予防策</prevention>
    <documentation>このファイルへの追記内容</documentation>
  </step6_学習>
</error_protocol>
```

## エラーパターンデータベース
過去に解決したエラーは必ずここを参照：

### TypeScript型エラー
| エラーパターン | 原因 | 解決方法 |
|------------|------|---------|
| `Type 'X' is not assignable to type 'Y'` | 型の不一致 | 1. 型定義確認 2. 型ガード追加 3. asでキャスト |
| `Property 'X' does not exist on type 'Y'` | プロパティ未定義 | 1. インターフェース確認 2. オプショナルチェーン 3. 型拡張 |
| `Cannot read properties of undefined` | chalkモックの不完全実装 | メソッドチェーン対応のモック実装 |

### テスト実行時エラー  
| エラーパターン | 原因 | 解決方法 |
|------------|------|---------|
| `Logger is not a constructor` | vi.importActual重複 | モックをグローバル定義に変更 |
| `Cannot read property '_actions'` | Commander内部API使用 | parseAsyncを使用 |
| `uv_cwd: ENOENT` | 作業ディレクトリ削除 | execSyncにcwd指定、process.chdir('/tmp') |
| `Cannot read properties of undefined (reading 'json')` | fetchモック未初期化 | beforeEachでmockFetch実装を設定 |
| `No "createLookupCommand" export is defined` | モック不完全 | 必要なコマンドをすべてモックに追加 |

### 改行コードエラー
| エラーパターン | 原因 | 解決方法 |
|------------|------|---------|
| `Delete ␍ prettier/prettier` | Windows CRLF | .gitattributes追加、lint --fix実行 |

### ESLint/Prettierエラー
| エラーパターン | 原因 | 解決方法 |
|------------|------|---------|
| `Delete ······ prettier/prettier` | インデント不正 | npm run lint -- --fix で自動修正 |
| `Insert ,` | カンマ不足 | npm run lint -- --fix で自動修正 |
| `'x' is defined but never used` | 未使用変数 | 変数名の前に_を付ける（例: options → _options） |
| `Expected 1 arguments, but got 2` | 引数の数が不一致 | 関数定義を確認して正しい引数数に修正 |

## 強制ルール
1. **推測禁止** - エラーメッセージを読まずに修正したら違反
2. **省略禁止** - 6段階のどれか1つでも省略したら違反  
3. **記録必須** - 解決後、このファイルに追記しなかったら違反
4. **参照必須** - 同じエラーで過去の記録を見なかったら違反

## 監視対象ファイルパターン
- `*.ts`, `*.tsx` - TypeScriptファイル
- `*.js`, `*.jsx` - JavaScriptファイル  
- `package.json` - 依存関係エラー
- `tsconfig.json` - 設定エラー