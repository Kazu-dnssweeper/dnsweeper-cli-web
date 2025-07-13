import React from 'react';
import { 
  MagnifyingGlassIcon, 
  BellIcon, 
  CogIcon,
  SunIcon,
  MoonIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { AccountSwitcher } from '../Auth/AccountSwitcher';
import { cn } from '../../utils/cn';

interface HeaderProps {
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  isDarkMode, 
  onToggleDarkMode 
}) => {
  const { user, account } = useAuth();
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* ロゴとタイトル */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DS</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              DNSweeper
            </h1>
          </div>
        </div>

        {/* 検索バー */}
        <div className="flex-1 max-w-lg mx-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ドメインまたはレコードを検索..."
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600",
                "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                "placeholder-gray-500 dark:placeholder-gray-400",
                "focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                "transition-all duration-200"
              )}
            />
          </div>
        </div>

        {/* 右側のアクション */}
        <div className="flex items-center space-x-3">
          {/* アカウント切り替え */}
          <AccountSwitcher size="md" />

          {/* ダークモード切り替え */}
          <button
            onClick={onToggleDarkMode}
            className={cn(
              "p-2 rounded-lg transition-colors",
              "hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            {isDarkMode ? (
              <SunIcon className="w-5 h-5 text-yellow-500" />
            ) : (
              <MoonIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {/* 通知 */}
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
            <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* 設定 */}
          <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <CogIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* ユーザープロフィール */}
          <div className="flex items-center space-x-2 pl-3 border-l border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-300 font-medium text-sm">
                {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user?.firstName} {user?.lastName}
              </span>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};