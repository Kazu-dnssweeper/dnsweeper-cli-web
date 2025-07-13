import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  DocumentArrowUpIcon, 
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardContent } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { cn } from '../utils/cn';
import type { UploadStatus } from '../types';

export const Upload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0
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
      // TODO: 実際のAPIコールを実装
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        // プログレスのシミュレーション
        for (let progress = 0; progress <= 100; progress += 20) {
          setUploadStatus({ 
            status: 'uploading', 
            progress: ((i * 100 + progress) / files.length),
            message: `アップロード中: ${file.name}`
          });
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setUploadStatus({ 
        status: 'processing', 
        progress: 100,
        message: 'ファイルを処理中...'
      });

      // 処理のシミュレーション
      await new Promise(resolve => setTimeout(resolve, 2000));

      setUploadStatus({ 
        status: 'completed', 
        progress: 100,
        message: 'アップロード完了',
        recordCount: files.reduce((sum, file) => sum + Math.floor(Math.random() * 1000), 0)
      });

      // 3秒後にリセット
      setTimeout(() => {
        setFiles([]);
        setUploadStatus({ status: 'idle', progress: 0 });
      }, 3000);

    } catch (error) {
      setUploadStatus({ 
        status: 'error', 
        progress: 0,
        message: 'アップロードに失敗しました'
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

      {/* ヘルプテキスト */}
      <Card>
        <CardHeader>
          <CardTitle>対応ファイル形式</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
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
        </CardContent>
      </Card>
    </div>
  );
};