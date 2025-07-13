import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  DocumentArrowDownIcon,
  XMarkIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { Button } from '../UI/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../UI/Card';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { exportApi, type ExportRequest, type ExportTemplate } from '../../services/exportApi';
import { useNotifications } from '../UI/Notification';
import { cn } from '../../utils/cn';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: ExportRequest['type'];
  defaultFilter?: ExportRequest['filter'];
  title?: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  defaultType = 'dns_records',
  defaultFilter = {},
  title = 'データエクスポート'
}) => {
  const [exportRequest, setExportRequest] = useState<ExportRequest>({
    type: defaultType,
    format: 'csv',
    filter: defaultFilter,
    options: {}
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { addNotification } = useNotifications();

  // テンプレート一覧を取得
  const { data: templatesData } = useQuery({
    queryKey: ['exportTemplates'],
    queryFn: () => exportApi.getTemplates(),
    staleTime: 300000 // 5分間キャッシュ
  });

  // エクスポート実行
  const exportMutation = useMutation({
    mutationFn: (request: ExportRequest) => exportApi.createExport(request),
    onSuccess: (response) => {
      if (response.data?.success && response.data.downloadUrl) {
        addNotification({
          type: 'success',
          title: 'エクスポートが完了しました',
          message: `${response.data.recordCount}件のレコードがエクスポートされました`,
          autoClose: true,
          duration: 5000
        });

        // ダウンロード開始
        exportApi.downloadFile(response.data.downloadUrl);
        onClose();
      } else {
        addNotification({
          type: 'error',
          title: 'エクスポートに失敗しました',
          message: response.data?.error || '不明なエラーが発生しました',
          autoClose: true,
          duration: 8000
        });
      }
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'エクスポートエラー',
        message: error instanceof Error ? error.message : 'エクスポート処理中にエラーが発生しました',
        autoClose: true,
        duration: 8000
      });
    }
  });

  const templates = templatesData?.data || [];

  // デフォルト値の設定
  useEffect(() => {
    setExportRequest(prev => ({
      ...prev,
      type: defaultType,
      filter: { ...prev.filter, ...defaultFilter }
    }));
  }, [defaultType, defaultFilter]);

  const handleTemplateSelect = (template: ExportTemplate) => {
    setExportRequest({
      type: template.type,
      format: template.format,
      filter: { ...template.defaultFilter },
      options: { ...template.defaultOptions }
    });
  };

  const handleFormatChange = (format: ExportRequest['format']) => {
    setExportRequest(prev => ({ ...prev, format }));
  };

  const handleFilterChange = (filter: Partial<ExportRequest['filter']>) => {
    setExportRequest(prev => ({
      ...prev,
      filter: { ...prev.filter, ...filter }
    }));
  };

  const handleOptionsChange = (options: Partial<ExportRequest['options']>) => {
    setExportRequest(prev => ({
      ...prev,
      options: { ...prev.options, ...options }
    }));
  };

  const handleExport = () => {
    exportMutation.mutate(exportRequest);
  };

  const getFormatIcon = (format: ExportRequest['format']) => {
    switch (format) {
      case 'csv': return <DocumentTextIcon className="w-5 h-5" />;
      case 'excel': return <TableCellsIcon className="w-5 h-5" />;
      case 'pdf': return <DocumentIcon className="w-5 h-5" />;
      default: return <DocumentArrowDownIcon className="w-5 h-5" />;
    }
  };

  const getFormatDescription = (format: ExportRequest['format']) => {
    switch (format) {
      case 'csv': return 'カンマ区切り形式（Excel等で開ける）';
      case 'excel': return 'Excel形式（.xlsx）';
      case 'pdf': return 'PDF形式（印刷・共有に最適）';
      default: return '';
    }
  };

  const getTypeLabel = (type: ExportRequest['type']) => {
    switch (type) {
      case 'dns_records': return 'DNS レコード';
      case 'change_history': return '変更履歴';
      case 'analysis_results': return '分析結果';
      case 'statistics': return '統計情報';
      default: return type;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* オーバーレイ */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* ダイアログ */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-900 shadow-xl rounded-2xl">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* テンプレート選択 */}
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  テンプレート選択
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => handleTemplateSelect(template)}
                      className="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {template.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {template.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* データ種類 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                エクスポートするデータ
              </label>
              <select
                value={exportRequest.type}
                onChange={(e) => setExportRequest(prev => ({ ...prev, type: e.target.value as ExportRequest['type'] }))}
                className={cn(
                  "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg",
                  "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                  "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                )}
              >
                <option value="dns_records">DNS レコード</option>
                <option value="change_history">変更履歴</option>
                <option value="analysis_results">分析結果</option>
                <option value="statistics">統計情報</option>
              </select>
            </div>

            {/* 形式選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                エクスポート形式
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['csv', 'excel', 'pdf'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => handleFormatChange(format)}
                    className={cn(
                      "p-4 border rounded-lg transition-colors text-left",
                      exportRequest.format === format
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      {getFormatIcon(format)}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white uppercase">
                          {format}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {getFormatDescription(format)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 基本フィルター */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exportRequest.type === 'dns_records' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ドメイン名
                    </label>
                    <input
                      type="text"
                      placeholder="例: example.com"
                      value={exportRequest.filter?.domain || ''}
                      onChange={(e) => handleFilterChange({ domain: e.target.value || undefined })}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg",
                        "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                        "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      レコードタイプ
                    </label>
                    <select
                      value={exportRequest.filter?.recordType || ''}
                      onChange={(e) => handleFilterChange({ recordType: e.target.value || undefined })}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg",
                        "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                        "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      )}
                    >
                      <option value="">すべて</option>
                      <option value="A">A</option>
                      <option value="AAAA">AAAA</option>
                      <option value="CNAME">CNAME</option>
                      <option value="MX">MX</option>
                      <option value="TXT">TXT</option>
                    </select>
                  </div>
                </>
              )}

              {exportRequest.type === 'change_history' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      変更タイプ
                    </label>
                    <select
                      value={exportRequest.filter?.changeType || ''}
                      onChange={(e) => handleFilterChange({ changeType: e.target.value as any || undefined })}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg",
                        "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                        "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      )}
                    >
                      <option value="">すべて</option>
                      <option value="create">作成</option>
                      <option value="update">更新</option>
                      <option value="delete">削除</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      ソース
                    </label>
                    <select
                      value={exportRequest.filter?.source || ''}
                      onChange={(e) => handleFilterChange({ source: e.target.value as any || undefined })}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg",
                        "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                        "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      )}
                    >
                      <option value="">すべて</option>
                      <option value="manual">手動</option>
                      <option value="import">インポート</option>
                      <option value="api">API</option>
                      <option value="monitoring">監視</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* 詳細オプション */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span>詳細オプション</span>
              </button>

              {showAdvanced && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      カスタムファイル名
                    </label>
                    <input
                      type="text"
                      placeholder="ファイル名（拡張子なし）"
                      value={exportRequest.options?.customFileName || ''}
                      onChange={(e) => handleOptionsChange({ customFileName: e.target.value || undefined })}
                      className={cn(
                        "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg",
                        "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                        "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      )}
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="includeMetadata"
                      checked={exportRequest.options?.includeMetadata || false}
                      onChange={(e) => handleOptionsChange({ includeMetadata: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="includeMetadata" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      メタデータを含める
                    </label>
                  </div>

                  {exportRequest.format === 'pdf' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          向き
                        </label>
                        <select
                          value={exportRequest.options?.orientation || 'portrait'}
                          onChange={(e) => handleOptionsChange({ orientation: e.target.value as any })}
                          className={cn(
                            "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg",
                            "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                            "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          )}
                        >
                          <option value="portrait">縦向き</option>
                          <option value="landscape">横向き</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          ページサイズ
                        </label>
                        <select
                          value={exportRequest.options?.pageSize || 'A4'}
                          onChange={(e) => handleOptionsChange({ pageSize: e.target.value as any })}
                          className={cn(
                            "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg",
                            "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                            "focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          )}
                        >
                          <option value="A4">A4</option>
                          <option value="Letter">Letter</option>
                          <option value="Legal">Legal</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* フッター */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {getTypeLabel(exportRequest.type)} を {exportRequest.format.toUpperCase()} 形式でエクスポート
            </div>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={exportMutation.isPending}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleExport}
                loading={exportMutation.isPending}
                icon={<DocumentArrowDownIcon className="w-4 h-4" />}
              >
                エクスポート
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};