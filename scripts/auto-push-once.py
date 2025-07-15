#!/usr/bin/env python3
"""
Git自動プッシュ - 1回実行版
"""

import sys
import os

# プロジェクトルートをPythonパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# auto-push.pyから関数をインポート
from scripts.auto_push import auto_push

if __name__ == "__main__":
    # 1回だけ実行
    auto_push()
    sys.exit(0)