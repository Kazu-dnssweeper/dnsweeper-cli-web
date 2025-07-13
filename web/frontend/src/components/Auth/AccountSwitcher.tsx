/**
 * DNSweeper アカウント切り替えコンポーネント
 * 
 * ドロップダウンでマルチアカウント対応
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDownIcon,
  BuildingOfficeIcon,
  CheckIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { cn } from '../../utils/cn';
import type { Account } from '../../types/auth';

interface AccountSwitcherProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ 
  className = '',
  size = 'md'
}) => {
  const { account: currentAccount, switchAccount, getAccounts, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // アカウント一覧を取得
  useEffect(() => {
    const fetchAccounts = async () => {
      if (isOpen && accounts.length === 0) {
        setLoading(true);
        try {
          const accountList = await getAccounts();
          setAccounts(accountList);
        } catch (error) {
          console.error('Failed to fetch accounts:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAccounts();
  }, [isOpen, accounts.length, getAccounts]);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAccountSwitch = async (accountId: string) => {
    if (accountId === currentAccount?.id) {
      setIsOpen(false);
      return;
    }

    setSwitchingTo(accountId);
    try {
      await switchAccount(accountId);
      setIsOpen(false);
    } catch (error) {
      console.error('Account switch failed:', error);
    } finally {
      setSwitchingTo(null);
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  const getAccountPlanBadge = (plan: string) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      starter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      professional: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      enterprise: 'bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200'
    };

    return (
      <span className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        colors[plan as keyof typeof colors] || colors.free
      )}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </span>
    );
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'px-2 py-1 text-sm',
          dropdown: 'w-48',
          item: 'px-3 py-2 text-sm'
        };
      case 'lg':
        return {
          button: 'px-4 py-3 text-lg',
          dropdown: 'w-80',
          item: 'px-4 py-3 text-base'
        };
      default:
        return {
          button: 'px-3 py-2 text-base',
          dropdown: 'w-64',
          item: 'px-3 py-2 text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (!currentAccount) {
    return null;
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* トリガーボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full rounded-lg border border-gray-300 dark:border-gray-600',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
          'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
          sizeClasses.button
        )}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0 flex-1 text-left">
            <div className="font-medium truncate">{currentAccount.name}</div>
            {size !== 'sm' && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentAccount.slug}
              </div>
            )}
          </div>
          {size !== 'sm' && getAccountPlanBadge(currentAccount.plan)}
        </div>
        <ChevronDownIcon 
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform ml-2 flex-shrink-0',
            isOpen && 'transform rotate-180'
          )} 
        />
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className={cn(
          'absolute z-50 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
          'py-1 max-h-80 overflow-y-auto',
          sizeClasses.dropdown,
          size === 'lg' ? 'right-0' : 'left-0'
        )}>
          {/* ヘッダー */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              アカウント選択
            </p>
          </div>

          {/* ローディング状態 */}
          {loading && (
            <div className="px-3 py-4 text-center">
              <LoadingSpinner size="sm" text="読み込み中..." />
            </div>
          )}

          {/* アカウント一覧 */}
          {!loading && accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => handleAccountSwitch(account.id)}
              disabled={switchingTo === account.id}
              className={cn(
                'w-full flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700',
                'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
                sizeClasses.item
              )}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <BuildingOfficeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <div className={cn(
                    'font-medium truncate',
                    account.id === currentAccount.id 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-gray-900 dark:text-white'
                  )}>
                    {account.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {account.slug} • {account.plan}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                {getAccountPlanBadge(account.plan)}
                {account.id === currentAccount.id && (
                  <CheckIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                )}
                {switchingTo === account.id && (
                  <LoadingSpinner size="sm" />
                )}
              </div>
            </button>
          ))}

          {/* 区切り線 */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

          {/* 新しいアカウント作成 */}
          <button
            onClick={() => {
              setIsOpen(false);
              // TODO: 新規アカウント作成機能実装
              alert('新規アカウント作成機能は実装中です');
            }}
            className={cn(
              'w-full flex items-center hover:bg-gray-50 dark:hover:bg-gray-700',
              'text-gray-700 dark:text-gray-300 transition-colors',
              sizeClasses.item
            )}
          >
            <PlusIcon className="h-4 w-4 text-gray-400 mr-3" />
            新しいアカウントを作成
          </button>

          {/* ログアウト */}
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center hover:bg-gray-50 dark:hover:bg-gray-700',
              'text-error-600 dark:text-error-400 transition-colors',
              sizeClasses.item
            )}
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
};