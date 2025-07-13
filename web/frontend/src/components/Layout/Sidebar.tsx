import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  DocumentArrowUpIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  SignalIcon as RadarIcon,
  ChartBarSquareIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  {
    name: 'ダッシュボード',
    href: '/',
    icon: HomeIcon,
  },
  {
    name: 'ファイルアップロード',
    href: '/upload',
    icon: DocumentArrowUpIcon,
  },
  {
    name: '分析結果',
    href: '/analysis',
    icon: ChartBarIcon,
  },
  {
    name: 'リスク監視',
    href: '/monitoring',
    icon: ExclamationTriangleIcon,
  },
  {
    name: 'リアルタイム監視',
    href: '/realtime-monitoring',
    icon: RadarIcon,
  },
  {
    name: 'パフォーマンス分析',
    href: '/performance-analytics',
    icon: ChartBarSquareIcon,
  },
  {
    name: '履歴',
    href: '/history',
    icon: ClockIcon,
  },
  {
    name: 'レポート',
    href: '/reports',
    icon: DocumentTextIcon,
  },
  {
    name: 'API統合',
    href: '/api-integrations',
    icon: CloudIcon,
  },
  {
    name: '設定',
    href: '/settings',
    icon: Cog6ToothIcon,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* モバイル用オーバーレイ */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* サイドバー */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900",
          "border-r border-gray-200 dark:border-gray-700",
          "transform transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* サイドバーヘッダー */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DS</span>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                DNSweeper
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ナビゲーション */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    "text-sm font-medium",
                    isActive
                      ? "bg-primary-50 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 border-r-2 border-primary-600"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* サイドバーフッター */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    システム状態: 正常
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    最終更新: 1分前
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};