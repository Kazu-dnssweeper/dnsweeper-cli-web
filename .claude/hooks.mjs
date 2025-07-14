// .claude/hooks.mjs
export async function preTask({ task }) {
  // エラー関連のタスクを検出
  if (task.includes('エラー') || task.includes('error') || task.includes('fix') || task.includes('解決')) {
    console.log(`
⚠️ エラー処理プロトコル自動起動 ⚠️
以下の6段階を必ず実行します：
1. 調査 - エラーメッセージ完全引用
2. 分析 - 根本原因特定
3. 計画 - 解決策比較検討
4. 対処 - 実装
5. テスト - 検証
6. 学習 - CLAUDE.md更新
    `);
    return { 
      proceed: true,
      modifiedTask: task + '\n\n【重要】6段階エラー処理プロトコルに従って実行してください。'
    };
  }
  return { proceed: true };
}

export async function postEdit({ filePath, newContent, error }) {
  if (error) {
    console.error(`
🚨 エラー検出！自動プロトコル起動 🚨
エラー内容: ${error.message}
対象ファイル: ${filePath}

6段階プロトコルに従って自動修正を開始してください。
    `);
    
    // エラーログを自動的に.claude/error-log.mdに記録
    const fs = require('fs').promises;
    const errorLog = `
## [${new Date().toISOString()}] エラー自動記録
- ファイル: ${filePath}
- エラー: ${error.message}
- スタック: ${error.stack}
---
`;
    await fs.appendFile('.claude/error-log.md', errorLog);
  }
}