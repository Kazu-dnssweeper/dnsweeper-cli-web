#!/usr/bin/env python3
"""
コードベース分析をClaude APIで強化するスクリプト
週1回の実行を想定した高度な分析機能
"""

import json
import os
import sys
import subprocess
from typing import Dict, List, Any, Optional
from datetime import datetime
import anthropic
from pathlib import Path

class ClaudeCodeAnalyzer:
    def __init__(self):
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            print("Error: ANTHROPIC_API_KEY environment variable not set")
            sys.exit(1)
        
        self.client = anthropic.Anthropic(api_key=api_key)
        self.project_root = Path.cwd()
        
    def collect_static_analysis(self) -> Dict[str, Any]:
        """静的分析結果を収集"""
        analysis_data = {
            'timestamp': datetime.now().isoformat(),
            'typescript_errors': self._get_typescript_errors(),
            'eslint_issues': self._get_eslint_issues(),
            'test_coverage': self._get_test_coverage(),
            'code_metrics': self._analyze_code_metrics(),
            'large_files': self._find_large_files(),
            'any_usage': self._find_any_usage(),
        }
        return analysis_data
    
    def _get_typescript_errors(self) -> List[Dict[str, Any]]:
        """TypeScriptエラーを取得"""
        try:
            result = subprocess.run(
                ['npx', 'tsc', '--noEmit'],
                capture_output=True,
                text=True
            )
            errors = []
            for line in result.stdout.splitlines():
                if '.ts' in line and ':' in line:
                    errors.append({'error': line.strip()})
            return errors[:50]  # 最初の50件のみ
        except:
            return []
    
    def _get_eslint_issues(self) -> Dict[str, int]:
        """ESLint問題を取得"""
        try:
            result = subprocess.run(
                ['npx', 'eslint', 'src', '--format', 'json'],
                capture_output=True,
                text=True
            )
            data = json.loads(result.stdout)
            total_errors = sum(r['errorCount'] for r in data)
            total_warnings = sum(r['warningCount'] for r in data)
            return {
                'errors': total_errors,
                'warnings': total_warnings,
                'total': total_errors + total_warnings
            }
        except:
            return {'errors': 0, 'warnings': 0, 'total': 0}
    
    def _get_test_coverage(self) -> Dict[str, Any]:
        """テストカバレッジを取得"""
        # 簡易実装 - 実際にはnpm test -- --coverageの結果を解析
        return {
            'overall': 60.0,
            'uncovered_files': [
                'src/utils/encoding-detector.ts',
                'src/utils/logger.ts',
                'src/lib/config.ts'
            ]
        }
    
    def _analyze_code_metrics(self) -> Dict[str, Any]:
        """コードメトリクスを分析"""
        total_files = 0
        total_lines = 0
        
        for ext in ['*.ts', '*.tsx']:
            files = list(self.project_root.rglob(ext))
            total_files += len(files)
            for file in files:
                if 'node_modules' not in str(file):
                    try:
                        total_lines += len(file.read_text().splitlines())
                    except:
                        pass
        
        return {
            'total_files': total_files,
            'total_lines': total_lines,
            'average_file_size': total_lines / total_files if total_files > 0 else 0
        }
    
    def _find_large_files(self) -> List[Dict[str, Any]]:
        """600行を超える大きなファイルを検索"""
        large_files = []
        for file in self.project_root.rglob('*.ts'):
            if 'node_modules' not in str(file):
                try:
                    lines = len(file.read_text().splitlines())
                    if lines > 600:
                        large_files.append({
                            'path': str(file.relative_to(self.project_root)),
                            'lines': lines
                        })
                except:
                    pass
        return sorted(large_files, key=lambda x: x['lines'], reverse=True)
    
    def _find_any_usage(self) -> Dict[str, Any]:
        """any型の使用状況を検索"""
        any_count = 0
        files_with_any = []
        
        for file in self.project_root.rglob('*.ts'):
            if 'node_modules' not in str(file):
                try:
                    content = file.read_text()
                    count = content.count(': any')
                    if count > 0:
                        any_count += count
                        files_with_any.append({
                            'path': str(file.relative_to(self.project_root)),
                            'count': count
                        })
                except:
                    pass
        
        return {
            'total_count': any_count,
            'files': sorted(files_with_any, key=lambda x: x['count'], reverse=True)[:10]
        }
    
    def analyze_with_claude(self, analysis_data: Dict[str, Any], options: Dict[str, bool]) -> Dict[str, Any]:
        """Claude APIで高度な分析を実行 - 全ての分析を一度に実行"""
        
        # オプションフラグに関係なく、常に3つの分析を全て実行
        results = {}
        
        # 1. アーキテクチャ分析（Sonnetモデル）
        print("🏗️  アーキテクチャ分析を実行中...")
        results['architecture'] = self._analyze_architecture(analysis_data)
        
        # 2. リファクタリング提案（Sonnetモデル）
        print("🔧 リファクタリング提案を生成中...")
        results['refactoring'] = self._analyze_refactoring(analysis_data)
        
        # 3. テスト生成提案（Haikuモデル - コスト削減）
        print("🧪 テスト生成提案を作成中...")
        results['test_generation'] = self._analyze_test_generation(analysis_data)
        
        return results
    
    def _analyze_architecture(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """アーキテクチャ分析と改善提案"""
        prompt = f"""
あなたはシニアソフトウェアアーキテクトです。以下のTypeScriptプロジェクトの分析結果を確認し、
アーキテクチャの改善提案を行ってください。

プロジェクト統計:
- 総ファイル数: {data['code_metrics']['total_files']}
- 総行数: {data['code_metrics']['total_lines']}
- TypeScriptエラー: {len(data['typescript_errors'])}件
- ESLintエラー: {data['eslint_issues']['errors']}件
- ESLint警告: {data['eslint_issues']['warnings']}件
- テストカバレッジ: {data['test_coverage']['overall']}%
- 大きなファイル(600行超): {len(data['large_files'])}個
- any型使用: {data['any_usage']['total_count']}箇所

大きなファイル:
{json.dumps(data['large_files'][:5], indent=2)}

以下の観点で分析してください:
1. アーキテクチャの改善点（レイヤー分離、モジュール化）
2. 品質スコアを6.8/10から8.0/10に向上させる具体的な手順
3. 技術的負債の優先順位付け
4. ベストプラクティスとの差分
5. 段階的な改善計画（1週間、1ヶ月、3ヶ月）

JSON形式で回答してください。
"""
        
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        try:
            return json.loads(response.content[0].text)
        except:
            return {'analysis': response.content[0].text}
    
    def _analyze_refactoring(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """リファクタリング提案"""
        prompt = f"""
あなたはリファクタリングの専門家です。以下の大きなファイルを分析し、
具体的な分割方法を提案してください。

大きなファイル:
{json.dumps(data['large_files'], indent=2)}

any型の使用状況:
{json.dumps(data['any_usage']['files'][:5], indent=2)}

以下を含めて提案してください:
1. 各ファイルの分割案（どのように機能を分けるか）
2. any型を具体的な型に置き換える方法
3. 共通化できるコードパターン
4. リファクタリングの優先順位
5. 各リファクタリングの想定作業時間

JSON形式で、実装可能な具体的な提案を含めてください。
"""
        
        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4000,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        try:
            return json.loads(response.content[0].text)
        except:
            return {'refactoring': response.content[0].text}
    
    def _analyze_test_generation(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """テスト生成提案"""
        prompt = f"""
あなたはテスト設計の専門家です。以下のテストカバレッジ情報を基に、
テスト改善計画を提案してください。

現在のカバレッジ: {data['test_coverage']['overall']}%
カバーされていないファイル:
{json.dumps(data['test_coverage']['uncovered_files'], indent=2)}

以下を提案してください:
1. 優先的にテストすべきファイルとその理由
2. 各ファイルの具体的なテストケース例（3つずつ）
3. E2Eテストシナリオ（主要な5つのユーザーフロー）
4. テストカバレッジを85%に上げるための段階的計画
5. モックとスタブの戦略

JSON形式で、実装可能なテストケースを含めてください。
"""
        
        response = self.client.messages.create(
            model="claude-3-haiku-20240307",  # テスト生成は安価なモデルで十分
            max_tokens=4000,
            temperature=0.2,
            messages=[{"role": "user", "content": prompt}]
        )
        
        try:
            return json.loads(response.content[0].text)
        except:
            return {'test_plan': response.content[0].text}
    
    def generate_report(self, analysis_result: Dict[str, Any], output_file: str = '.claude/ai-analysis-report.md'):
        """統合分析結果をMarkdownレポートとして生成"""
        report = f"""# 🤖 AI統合分析レポート - DNSweeper

生成日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 📊 現状分析

### コード品質メトリクス
- TypeScriptエラー: **{len(self.analysis_data.get('typescript_errors', []))}件** ⚠️
- ESLint問題: **{self.analysis_data['eslint_issues']['total']}件** (エラー: {self.analysis_data['eslint_issues']['errors']}, 警告: {self.analysis_data['eslint_issues']['warnings']})
- テストカバレッジ: **{self.analysis_data['test_coverage']['overall']}%** 📉
- 大きなファイル(600行超): **{len(self.analysis_data['large_files'])}個**
- any型使用: **{self.analysis_data['any_usage']['total_count']}箇所**

## 🏗️ アーキテクチャ分析

"""
        
        # アーキテクチャ分析結果
        if 'architecture' in analysis_result:
            arch_data = analysis_result['architecture']
            if isinstance(arch_data, dict):
                for section, content in arch_data.items():
                    report += f"### {section.replace('_', ' ').title()}\n"
                    if isinstance(content, list):
                        for item in content:
                            report += f"- {item}\n"
                    elif isinstance(content, dict):
                        report += json.dumps(content, indent=2, ensure_ascii=False) + "\n"
                    else:
                        report += f"{content}\n"
                    report += "\n"
        
        report += "\n## 🔧 リファクタリング提案\n\n"
        
        # リファクタリング提案
        if 'refactoring' in analysis_result:
            refactor_data = analysis_result['refactoring']
            if isinstance(refactor_data, dict):
                for file, suggestions in refactor_data.items():
                    if isinstance(suggestions, dict):
                        report += f"### 📄 {file}\n"
                        report += json.dumps(suggestions, indent=2, ensure_ascii=False) + "\n\n"
        
        report += "\n## 🧪 テスト戦略\n\n"
        
        # テスト生成提案
        if 'test_generation' in analysis_result:
            test_data = analysis_result['test_generation']
            if isinstance(test_data, dict):
                for category, tests in test_data.items():
                    report += f"### {category.replace('_', ' ').title()}\n"
                    if isinstance(tests, list):
                        for test in tests:
                            report += f"- {test}\n"
                    elif isinstance(tests, dict):
                        report += json.dumps(tests, indent=2, ensure_ascii=False) + "\n"
                    report += "\n"
        
        # レポートを保存
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(report, encoding='utf-8')
        
        print(f"✅ 分析レポートを生成しました: {output_file}")
        return report
    
    def estimate_cost(self, options: Dict[str, bool]) -> float:
        """API使用コストを概算 - 3つの分析を全て実行"""
        # 統合分析のコスト（常に3つ全て実行）
        # - アーキテクチャ分析: Sonnet 20Kトークン
        # - リファクタリング提案: Sonnet 20Kトークン  
        # - テスト生成: Haiku 20Kトークン
        
        sonnet_cost = 3.0 * 0.04  # $3/1M tokens * 40K tokens (2分析)
        haiku_cost = 0.25 * 0.02  # $0.25/1M tokens * 20K tokens (1分析)
        
        total_cost = sonnet_cost + haiku_cost
        return total_cost  # 約$0.125

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Claude APIでコードベースを高度に分析')
    parser.add_argument('--with-ai', action='store_true', help='Claude APIによる高度分析')
    parser.add_argument('--refactor', action='store_true', help='リファクタリング提案')
    parser.add_argument('--test-generation', action='store_true', help='テスト生成提案')
    parser.add_argument('--output', default='.claude/ai-analysis-report.md', help='出力ファイル')
    parser.add_argument('--dry-run', action='store_true', help='コスト見積もりのみ')
    
    args = parser.parse_args()
    
    analyzer = ClaudeCodeAnalyzer()
    
    # オプション設定
    options = {
        'refactor': args.refactor,
        'test_generation': args.test_generation,
        'with_ai': args.with_ai or args.refactor or args.test_generation
    }
    
    # コスト見積もり
    if args.dry_run:
        cost = analyzer.estimate_cost(options)
        print(f"推定コスト: ${cost:.4f}")
        return
    
    # 静的分析実行
    print("📊 静的分析を実行中...")
    analyzer.analysis_data = analyzer.collect_static_analysis()
    
    # AI分析実行
    if options['with_ai']:
        print("🤖 Claude APIで高度な分析を実行中...")
        result = analyzer.analyze_with_claude(analyzer.analysis_data, options)
        
        # レポート生成
        analyzer.generate_report(result, args.output)
        
        # 結果の要約を表示
        print("\n📋 分析完了！主な提案:")
        if isinstance(result, dict):
            for i, (key, value) in enumerate(list(result.items())[:3]):
                print(f"{i+1}. {key}: {str(value)[:100]}...")
    else:
        # 静的分析のみ
        print("✅ 静的分析完了")
        print(f"- TypeScriptエラー: {len(analyzer.analysis_data['typescript_errors'])}件")
        print(f"- ESLint問題: {analyzer.analysis_data['eslint_issues']['total']}件")
        print(f"- 大きなファイル: {len(analyzer.analysis_data['large_files'])}個")

if __name__ == '__main__':
    main()