import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSSクラスを安全にマージするユーティリティ関数
 * clsxで条件付きクラスを処理し、tailwind-mergeで重複を解決
 */
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return twMerge(clsx(inputs));
}