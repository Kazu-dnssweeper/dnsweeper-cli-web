import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  DocumentArrowUpIcon, 
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { cn } from '../utils/cn';
import type { UploadStatus, AnalysisResult } from '../types';
import { useNotifications } from '../components/UI/Notification';
import { useWebSocket } from '../hooks/useWebSocket';
import { uploadApi, analysisApi } from '../services/api';

export const Upload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0
  });
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const { addNotification } = useNotifications();
  
  // WebSocketでリアルタイム更新を監視
  useWebSocket({
    onMessage: (message) => {
      if (message.type === 'upload_progress') {
        setUploadStatus(prev => ({
          ...prev,
          progress: message.payload.progress,
          message: message.payload.message
        }));
      } else if (message.type === 'analysis_complete') {
        const result: AnalysisResult = message.payload;
        setAnalysisResults(prev => [result, ...prev]);
        
        addNotification({
          type: 'success',
          title: '分析完了',
          message: `${result.fileName} の分析が完了しました。${result.totalRecords}件のレコードを処理しました。`,
          autoClose: true,
          duration: 8000
        });
      }
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFiles = acceptedFiles.filter(file => 
      file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
    );
    setFiles(prev => [...prev, ...csvFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploadStatus({ status: 'uploading', progress: 0 });

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setUploadStatus({ 
          status: 'uploading', 
          progress: (i / files.length) * 50,
          message: `アップロード中: ${file.name}`
        });

        // ファイルをアップロード
        const uploadResponse = await uploadApi.uploadFile(file);
        
        if (!uploadResponse.success) {
          throw new Error(uploadResponse.error || 'アップロードに失敗しました');
        }

        setUploadStatus({ 
          status: 'processing', 
          progress: 50 + (i / files.length) * 50,
          message: `分析中: ${file.name}`
        });

        // ファイル分析を開始
        const analysisResponse = await analysisApi.startAnalysis(uploadResponse.data!.id);
        
        if (!analysisResponse.success) {
          throw new Error(analysisResponse.error || '分析に失敗しました');
        }

        addNotification({
          type: 'success',
          title: 'アップロード完了',
          message: `${file.name} のアップロードが完了しました。分析を開始します。`,
          autoClose: true,
          duration: 5000
        });
      }

      setUploadStatus({ 
        status: 'completed', 
        progress: 100,
        message: 'すべてのファイルのアップロード完了',
        recordCount: files.length
      });

      // 3秒後にリセット
      setTimeout(() => {
        setFiles([]);
        setUploadStatus({ status: 'idle', progress: 0 });
      }, 3000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました';
      
      setUploadStatus({ 
        status: 'error', 
        progress: 0,
        message: errorMessage
      });
      
      addNotification({
        type: 'error',
        title: 'アップロードエラー',
        message: errorMessage,
        autoClose: false
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ファイルアップロード
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          DNS レコードのCSVファイルをアップロードして分析を開始
        </p>
      </div>

      {/* アップロードエリア */}
      <Card>
        <CardContent>
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive 
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" 
                : "border-gray-300 dark:border-gray-600 hover:border-primary-400"
            )}
          >
            <input {...getInputProps()} />
            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              {isDragActive 
                ? "ファイルをドロップしてください"
                : "CSVファイルをドラッグ&ドロップまたはクリックして選択"
              }
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              対応形式: CSV (最大10MB)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ファイルリスト */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>選択されたファイル ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file, index) => (
                <div 
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentArrowUpIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* アップロード状態 */}
      {uploadStatus.status !== 'idle' && (
        <Card>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {uploadStatus.status === 'completed' ? (
                    <CheckCircleIcon className="w-6 h-6 text-success-600" />
                  ) : uploadStatus.status === 'error' ? (
                    <ExclamationTriangleIcon className="w-6 h-6 text-error-600" />
                  ) : (
                    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {uploadStatus.message || 'アップロード中...'}
                    </p>
                    {uploadStatus.recordCount && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {uploadStatus.recordCount.toLocaleString()} レコードを処理しました
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {Math.round(uploadStatus.progress)}%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    uploadStatus.status === 'completed' 
                      ? 'bg-success-600' 
                      : uploadStatus.status === 'error'
                      ? 'bg-error-600'
                      : 'bg-primary-600'
                  )}
                  style={{ width: `${uploadStatus.progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* アクションボタン */}
      <div className="flex justify-end space-x-4">
        <Button 
          variant="secondary"
          onClick={() => {
            setFiles([]);
            setUploadStatus({ status: 'idle', progress: 0 });
          }}
          disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
        >
          クリア
        </Button>
        <Button 
          onClick={handleUpload}
          disabled={files.length === 0 || uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
          loading={uploadStatus.status === 'uploading' || uploadStatus.status === 'processing'}
        >
          アップロード開始
        </Button>
      </div>

      {/* 分析結果履歴 */}
      {analysisResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ChartBarIcon className="w-5 h-5" />
              <span>分析結果履歴</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisResults.map((result) => (
                <div 
                  key={result.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {result.fileName}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {result.totalRecords.toLocaleString()}件のレコード • 
                            平均リスクスコア: {result.summary.averageRiskScore.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-error-500"></div>
                          <span className="text-gray-600 dark:text-gray-400">
                            高リスク: {result.highRiskRecords}件
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-warning-500"></div>
                          <span className="text-gray-600 dark:text-gray-400">
                            中リスク: {result.mediumRiskRecords}件
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-success-500"></div>
                          <span className="text-gray-600 dark:text-gray-400">
                            低リスク: {result.lowRiskRecords}件
                          </span>
                        </div>
                      </div>
                      
                      {result.summary.topRisks.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            主要リスク要因:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {result.summary.topRisks.slice(0, 3).map((risk, idx) => (
                              <span 
                                key={idx} 
                                className="text-xs px-2 py-1 bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-200 rounded-full"
                              >
                                {risk}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      {new Date(result.createdAt).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ヘルプテキスト */}
      <Card>
        <CardHeader>
          <CardTitle>対応ファイル形式と分析機能</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">対応ファイル形式</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Cloudflare CSV</p>
                  <p>Name, Type, Content, TTL の列を含むCSVファイル</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Route53 Export</p>
                  <p>Route53からエクスポートされた標準的なCSVファイル</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">汎用 CSV</p>
                  <p>ドメイン名とレコードタイプを含む任意のCSVファイル</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">分析機能</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">リスクスコア算出</p>
                  <p>18個の要因に基づく包括的なリスク評価</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">リアルタイム処理</p>
                  <p>大容量ファイルの高速並列処理</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">詳細レポート</p>
                  <p>分析結果の可視化と改善提案</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};