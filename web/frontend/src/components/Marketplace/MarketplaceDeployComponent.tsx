/**
 * DNSweeper マーケットプレイスデプロイコンポーネント
 * ワンクリックデプロイ・プロバイダー選択・設定カスタマイズ・デプロイ進捗監視
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import {
  MarketplaceProvider,
  MarketplaceProduct,
  DeploymentSession,
  DeploymentOption,
  OneClickDeployConfig
} from '../../types/marketplace-integration';

/**
 * プロバイダー情報
 */
interface ProviderInfo {
  id: MarketplaceProvider;
  name: string;
  logo: string;
  description: string;
  supportedRegions: string[];
  estimatedCost: {
    hourly: number;
    monthly: number;
  };
  features: string[];
}

/**
 * デプロイ設定
 */
interface DeploymentConfig {
  provider: MarketplaceProvider;
  region: string;
  instanceType: string;
  enableMonitoring: boolean;
  enableBackups: boolean;
  customDomain?: string;
  adminEmail: string;
  organizationName: string;
  additionalOptions: Record<string, any>;
}

/**
 * プロパティ
 */
interface MarketplaceDeployComponentProps {
  productId?: string;
  onDeploymentStart?: (session: DeploymentSession) => void;
  onDeploymentComplete?: (session: DeploymentSession) => void;
  onDeploymentError?: (error: string) => void;
}

/**
 * マーケットプレイスデプロイコンポーネント
 */
export const MarketplaceDeployComponent: React.FC<MarketplaceDeployComponentProps> = ({
  productId,
  onDeploymentStart,
  onDeploymentComplete,
  onDeploymentError
}) => {
  const [step, setStep] = useState<'provider' | 'config' | 'review' | 'deploy' | 'complete'>('provider');
  const [providers] = useState<ProviderInfo[]>(getProviderInfo());
  const [selectedProvider, setSelectedProvider] = useState<MarketplaceProvider | null>(null);
  const [availableProducts, setAvailableProducts] = useState<MarketplaceProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [deploymentOptions, setDeploymentOptions] = useState<DeploymentOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<DeploymentOption | null>(null);
  const [deploymentConfig, setDeploymentConfig] = useState<DeploymentConfig>({
    provider: 'aws',
    region: 'us-east-1',
    instanceType: 't3.medium',
    enableMonitoring: true,
    enableBackups: true,
    adminEmail: '',
    organizationName: '',
    additionalOptions: {}
  });
  const [activeDeployment, setActiveDeployment] = useState<DeploymentSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 製品情報の読み込み
  useEffect(() => {
    if (selectedProvider) {
      loadProductsForProvider(selectedProvider);
    }
  }, [selectedProvider]);

  // デプロイメント進捗の監視
  useEffect(() => {
    if (activeDeployment && activeDeployment.status !== 'completed' && activeDeployment.status !== 'failed') {
      const interval = setInterval(() => {
        checkDeploymentStatus(activeDeployment.id);
      }, 5000); // 5秒ごとに状況確認

      return () => clearInterval(interval);
    }
  }, [activeDeployment]);

  /**
   * プロバイダー用の製品読み込み
   */
  const loadProductsForProvider = async (provider: MarketplaceProvider): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/marketplace/products?provider=${provider}`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableProducts(data.data);
        if (data.data.length > 0) {
          const product = productId 
            ? data.data.find((p: MarketplaceProduct) => p.id === productId) || data.data[0]
            : data.data[0];
          setSelectedProduct(product);
          setDeploymentOptions(product.deploymentOptions);
          if (product.deploymentOptions.length > 0) {
            setSelectedOption(product.deploymentOptions[0]);
          }
        }
      }
    } catch (error) {
      setError('製品情報の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * デプロイメント実行
   */
  const executeDeployment = async (): Promise<void> => {
    if (!selectedProduct || !selectedOption) {
      setError('製品またはデプロイメントオプションが選択されていません');
      return;
    }

    try {
      setIsLoading(true);
      setStep('deploy');

      const deploymentData = {
        productId: selectedProduct.id,
        deploymentOptionId: selectedOption.id,
        customerId: 'customer_123', // 実際の顧客IDを使用
        customerInfo: {
          email: deploymentConfig.adminEmail,
          organization: deploymentConfig.organizationName,
          billingAccountId: 'billing_123'
        },
        configuration: {
          ...deploymentConfig,
          targetRegion: deploymentConfig.region
        }
      };

      const response = await fetch('/api/marketplace/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deploymentData)
      });

      const result = await response.json();

      if (result.success) {
        setActiveDeployment(result.data);
        onDeploymentStart?.(result.data);
      } else {
        throw new Error(result.error?.message || 'デプロイメント開始に失敗しました');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      setError(errorMessage);
      onDeploymentError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * デプロイメント状況確認
   */
  const checkDeploymentStatus = async (deploymentId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/marketplace/deployments/${deploymentId}`);
      const result = await response.json();

      if (result.success) {
        setActiveDeployment(result.data);
        
        if (result.data.status === 'completed') {
          setStep('complete');
          onDeploymentComplete?.(result.data);
        } else if (result.data.status === 'failed') {
          setError(result.data.error || 'デプロイメントが失敗しました');
          onDeploymentError?.(result.data.error || 'デプロイメントが失敗しました');
        }
      }
    } catch (error) {
      console.error('デプロイメント状況確認エラー:', error);
    }
  };

  /**
   * プロバイダー選択ステップ
   */
  const renderProviderSelection = () => (
    <div className=\"space-y-6\">
      <div className=\"text-center\">
        <h2 className=\"text-2xl font-bold text-gray-900 mb-2\">クラウドプロバイダーを選択</h2>
        <p className=\"text-gray-600\">DNSweeperをデプロイするクラウドプロバイダーを選択してください</p>
      </div>

      <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
        {providers.map((provider) => (
          <Card
            key={provider.id}
            className={`p-6 cursor-pointer transition-all duration-200 ${
              selectedProvider === provider.id
                ? 'ring-2 ring-blue-500 border-blue-500'
                : 'hover:shadow-lg'
            }`}
            onClick={() => {
              setSelectedProvider(provider.id);
              setDeploymentConfig(prev => ({ ...prev, provider: provider.id }));
            }}
          >
            <div className=\"text-center space-y-4\">
              <img src={provider.logo} alt={provider.name} className=\"w-16 h-16 mx-auto\" />
              <h3 className=\"text-lg font-semibold text-gray-900\">{provider.name}</h3>
              <p className=\"text-sm text-gray-600\">{provider.description}</p>
              
              <div className=\"space-y-2\">
                <div className=\"text-sm text-gray-700\">
                  <span className=\"font-medium\">予想料金:</span> ${provider.estimatedCost.hourly}/時間
                </div>
                <div className=\"text-sm text-gray-700\">
                  <span className=\"font-medium\">地域:</span> {provider.supportedRegions.length}箇所
                </div>
              </div>

              <div className=\"space-y-1\">
                {provider.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className=\"text-xs text-gray-500 flex items-center\">
                    <svg className=\"w-3 h-3 mr-1 text-green-500\" fill=\"currentColor\" viewBox=\"0 0 20 20\">
                      <path fillRule=\"evenodd\" d=\"M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z\" clipRule=\"evenodd\" />
                    </svg>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className=\"flex justify-end\">
        <Button
          onClick={() => setStep('config')}
          disabled={!selectedProvider}
          className=\"px-6 py-2\"
        >
          次へ
        </Button>
      </div>
    </div>
  );

  /**
   * 設定ステップ
   */
  const renderConfiguration = () => (
    <div className=\"space-y-6\">
      <div className=\"text-center\">
        <h2 className=\"text-2xl font-bold text-gray-900 mb-2\">デプロイメント設定</h2>
        <p className=\"text-gray-600\">デプロイメントの詳細設定を行ってください</p>
      </div>

      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
        {/* 基本設定 */}
        <Card className=\"p-6\">
          <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">基本設定</h3>
          
          <div className=\"space-y-4\">
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                地域
              </label>
              <select
                value={deploymentConfig.region}
                onChange={(e) => setDeploymentConfig(prev => ({ ...prev, region: e.target.value }))}
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500\"
              >
                {selectedProvider && providers.find(p => p.id === selectedProvider)?.supportedRegions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                インスタンスタイプ
              </label>
              <select
                value={deploymentConfig.instanceType}
                onChange={(e) => setDeploymentConfig(prev => ({ ...prev, instanceType: e.target.value }))}
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500\"
              >
                <option value=\"t3.small\">t3.small (2 vCPU, 2GB RAM)</option>
                <option value=\"t3.medium\">t3.medium (2 vCPU, 4GB RAM)</option>
                <option value=\"t3.large\">t3.large (2 vCPU, 8GB RAM)</option>
                <option value=\"m5.large\">m5.large (2 vCPU, 8GB RAM)</option>
                <option value=\"m5.xlarge\">m5.xlarge (4 vCPU, 16GB RAM)</option>
              </select>
            </div>

            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                管理者メールアドレス
              </label>
              <input
                type=\"email\"
                value={deploymentConfig.adminEmail}
                onChange={(e) => setDeploymentConfig(prev => ({ ...prev, adminEmail: e.target.value }))}
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500\"
                placeholder=\"admin@example.com\"
                required
              />
            </div>

            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                組織名
              </label>
              <input
                type=\"text\"
                value={deploymentConfig.organizationName}
                onChange={(e) => setDeploymentConfig(prev => ({ ...prev, organizationName: e.target.value }))}
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500\"
                placeholder=\"My Organization\"
                required
              />
            </div>
          </div>
        </Card>

        {/* オプション設定 */}
        <Card className=\"p-6\">
          <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">オプション設定</h3>
          
          <div className=\"space-y-4\">
            <div className=\"flex items-center\">
              <input
                type=\"checkbox\"
                id=\"monitoring\"
                checked={deploymentConfig.enableMonitoring}
                onChange={(e) => setDeploymentConfig(prev => ({ ...prev, enableMonitoring: e.target.checked }))}
                className=\"w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500\"
              />
              <label htmlFor=\"monitoring\" className=\"ml-2 text-sm text-gray-700\">
                監視機能を有効化 (+$10/月)
              </label>
            </div>

            <div className=\"flex items-center\">
              <input
                type=\"checkbox\"
                id=\"backups\"
                checked={deploymentConfig.enableBackups}
                onChange={(e) => setDeploymentConfig(prev => ({ ...prev, enableBackups: e.target.checked }))}
                className=\"w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500\"
              />
              <label htmlFor=\"backups\" className=\"ml-2 text-sm text-gray-700\">
                自動バックアップ (+$5/月)
              </label>
            </div>

            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                カスタムドメイン (オプション)
              </label>
              <input
                type=\"text\"
                value={deploymentConfig.customDomain || ''}
                onChange={(e) => setDeploymentConfig(prev => ({ ...prev, customDomain: e.target.value }))}
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500\"
                placeholder=\"dnsweeper.example.com\"
              />
            </div>
          </div>

          {/* 予想料金 */}
          <div className=\"mt-6 p-4 bg-blue-50 rounded-lg\">
            <h4 className=\"text-sm font-medium text-blue-900 mb-2\">予想料金</h4>
            <div className=\"space-y-1 text-sm text-blue-800\">
              <div className=\"flex justify-between\">
                <span>基本料金:</span>
                <span>$50/月</span>
              </div>
              {deploymentConfig.enableMonitoring && (
                <div className=\"flex justify-between\">
                  <span>監視機能:</span>
                  <span>$10/月</span>
                </div>
              )}
              {deploymentConfig.enableBackups && (
                <div className=\"flex justify-between\">
                  <span>バックアップ:</span>
                  <span>$5/月</span>
                </div>
              )}
              <div className=\"flex justify-between font-medium border-t border-blue-200 pt-1\">
                <span>合計:</span>
                <span>
                  ${50 + (deploymentConfig.enableMonitoring ? 10 : 0) + (deploymentConfig.enableBackups ? 5 : 0)}/月
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className=\"flex justify-between\">
        <Button
          onClick={() => setStep('provider')}
          variant=\"outline\"
        >
          戻る
        </Button>
        <Button
          onClick={() => setStep('review')}
          disabled={!deploymentConfig.adminEmail || !deploymentConfig.organizationName}
        >
          確認へ
        </Button>
      </div>
    </div>
  );

  /**
   * 確認ステップ
   */
  const renderReview = () => (
    <div className=\"space-y-6\">
      <div className=\"text-center\">
        <h2 className=\"text-2xl font-bold text-gray-900 mb-2\">デプロイメント確認</h2>
        <p className=\"text-gray-600\">設定内容を確認してデプロイメントを開始してください</p>
      </div>

      <Card className=\"p-6\">
        <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">設定サマリー</h3>
        
        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
          <div className=\"space-y-3\">
            <div>
              <span className=\"text-sm font-medium text-gray-700\">プロバイダー:</span>
              <span className=\"ml-2 text-sm text-gray-900\">
                {providers.find(p => p.id === selectedProvider)?.name}
              </span>
            </div>
            <div>
              <span className=\"text-sm font-medium text-gray-700\">地域:</span>
              <span className=\"ml-2 text-sm text-gray-900\">{deploymentConfig.region}</span>
            </div>
            <div>
              <span className=\"text-sm font-medium text-gray-700\">インスタンス:</span>
              <span className=\"ml-2 text-sm text-gray-900\">{deploymentConfig.instanceType}</span>
            </div>
            <div>
              <span className=\"text-sm font-medium text-gray-700\">組織名:</span>
              <span className=\"ml-2 text-sm text-gray-900\">{deploymentConfig.organizationName}</span>
            </div>
          </div>
          
          <div className=\"space-y-3\">
            <div>
              <span className=\"text-sm font-medium text-gray-700\">管理者メール:</span>
              <span className=\"ml-2 text-sm text-gray-900\">{deploymentConfig.adminEmail}</span>
            </div>
            <div>
              <span className=\"text-sm font-medium text-gray-700\">監視機能:</span>
              <span className=\"ml-2 text-sm text-gray-900\">
                {deploymentConfig.enableMonitoring ? '有効' : '無効'}
              </span>
            </div>
            <div>
              <span className=\"text-sm font-medium text-gray-700\">バックアップ:</span>
              <span className=\"ml-2 text-sm text-gray-900\">
                {deploymentConfig.enableBackups ? '有効' : '無効'}
              </span>
            </div>
            {deploymentConfig.customDomain && (
              <div>
                <span className=\"text-sm font-medium text-gray-700\">カスタムドメイン:</span>
                <span className=\"ml-2 text-sm text-gray-900\">{deploymentConfig.customDomain}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className=\"flex justify-between\">
        <Button
          onClick={() => setStep('config')}
          variant=\"outline\"
        >
          戻る
        </Button>
        <Button
          onClick={executeDeployment}
          disabled={isLoading}
          className=\"bg-green-600 hover:bg-green-700\"
        >
          {isLoading ? <LoadingSpinner size=\"sm\" /> : null}
          デプロイメント開始
        </Button>
      </div>
    </div>
  );

  /**
   * デプロイ進捗ステップ
   */
  const renderDeployProgress = () => (
    <div className=\"space-y-6\">
      <div className=\"text-center\">
        <h2 className=\"text-2xl font-bold text-gray-900 mb-2\">デプロイメント実行中</h2>
        <p className=\"text-gray-600\">しばらくお待ちください...</p>
      </div>

      {activeDeployment && (
        <Card className=\"p-6\">
          <div className=\"space-y-4\">
            {activeDeployment.deploymentSteps.map((step) => (
              <div key={step.id} className=\"flex items-center space-x-4\">
                <div className={`w-4 h-4 rounded-full ${
                  step.status === 'completed' ? 'bg-green-500' :
                  step.status === 'running' ? 'bg-blue-500' :
                  step.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                }`} />
                
                <div className=\"flex-1\">
                  <div className=\"text-sm font-medium text-gray-900\">{step.name}</div>
                  <div className=\"text-xs text-gray-600\">{step.description}</div>
                  
                  {step.status === 'running' && (
                    <div className=\"mt-2\">
                      <div className=\"w-full bg-gray-200 rounded-full h-2\">
                        <div 
                          className=\"bg-blue-500 h-2 rounded-full transition-all duration-300\"
                          style={{ width: `${step.progress}%` }}
                        />
                      </div>
                      <div className=\"text-xs text-gray-500 mt-1\">{step.progress}%</div>
                    </div>
                  )}
                </div>

                <div className=\"text-xs text-gray-500\">
                  {step.status === 'completed' && step.endTime && (
                    <span>完了</span>
                  )}
                  {step.status === 'running' && (
                    <LoadingSpinner size=\"xs\" />
                  )}
                  {step.status === 'failed' && (
                    <span className=\"text-red-600\">失敗</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  /**
   * 完了ステップ
   */
  const renderComplete = () => (
    <div className=\"space-y-6\">
      <div className=\"text-center\">
        <div className=\"w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4\">
          <svg className=\"w-8 h-8 text-green-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
            <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M5 13l4 4L19 7\" />
          </svg>
        </div>
        <h2 className=\"text-2xl font-bold text-gray-900 mb-2\">デプロイメント完了!</h2>
        <p className=\"text-gray-600\">DNSweeperが正常にデプロイされました</p>
      </div>

      {activeDeployment && (
        <Card className=\"p-6\">
          <h3 className=\"text-lg font-semibold text-gray-900 mb-4\">アクセス情報</h3>
          
          <div className=\"space-y-3\">
            {activeDeployment.accessInformation.endpoints.map((endpoint, index) => (
              <div key={index}>
                <span className=\"text-sm font-medium text-gray-700\">エンドポイント {index + 1}:</span>
                <a 
                  href={endpoint} 
                  target=\"_blank\" 
                  rel=\"noopener noreferrer\"
                  className=\"ml-2 text-sm text-blue-600 hover:text-blue-800\"
                >
                  {endpoint}
                </a>
              </div>
            ))}
            
            {activeDeployment.accessInformation.dashboardUrl && (
              <div>
                <span className=\"text-sm font-medium text-gray-700\">ダッシュボード:</span>
                <a 
                  href={activeDeployment.accessInformation.dashboardUrl} 
                  target=\"_blank\" 
                  rel=\"noopener noreferrer\"
                  className=\"ml-2 text-sm text-blue-600 hover:text-blue-800\"
                >
                  管理画面を開く
                </a>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className=\"flex justify-center\">
        <Button
          onClick={() => {
            setStep('provider');
            setActiveDeployment(null);
            setError(null);
          }}
          variant=\"outline\"
        >
          新規デプロイメント
        </Button>
      </div>
    </div>
  );

  // エラー表示
  if (error) {
    return (
      <Card className=\"p-6\">
        <div className=\"text-center\">
          <div className=\"w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4\">
            <svg className=\"w-8 h-8 text-red-600\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\">
              <path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth=\"2\" d=\"M6 18L18 6M6 6l12 12\" />
            </svg>
          </div>
          <h3 className=\"text-lg font-semibold text-gray-900 mb-2\">エラーが発生しました</h3>
          <p className=\"text-red-600 mb-4\">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              setStep('provider');
            }}
            variant=\"outline\"
          >
            最初からやり直す
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className=\"max-w-4xl mx-auto\">
      {/* ステップインジケーター */}
      <div className=\"mb-8\">
        <div className=\"flex items-center justify-center space-x-4\">
          {[
            { id: 'provider', name: 'プロバイダー' },
            { id: 'config', name: '設定' },
            { id: 'review', name: '確認' },
            { id: 'deploy', name: 'デプロイ' },
            { id: 'complete', name: '完了' }
          ].map((stepInfo, index) => (
            <div key={stepInfo.id} className=\"flex items-center\">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === stepInfo.id ? 'bg-blue-600 text-white' :
                index < ['provider', 'config', 'review', 'deploy', 'complete'].indexOf(step) ? 'bg-green-500 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {index + 1}
              </div>
              <span className={`ml-2 text-sm ${
                step === stepInfo.id ? 'text-blue-600 font-medium' : 'text-gray-600'
              }`}>
                {stepInfo.name}
              </span>
              {index < 4 && (
                <div className={`ml-4 w-8 h-0.5 ${
                  index < ['provider', 'config', 'review', 'deploy', 'complete'].indexOf(step) ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ステップコンテンツ */}
      {step === 'provider' && renderProviderSelection()}
      {step === 'config' && renderConfiguration()}
      {step === 'review' && renderReview()}
      {step === 'deploy' && renderDeployProgress()}
      {step === 'complete' && renderComplete()}
    </div>
  );
};

/**
 * プロバイダー情報を取得
 */
function getProviderInfo(): ProviderInfo[] {
  return [
    {
      id: 'aws',
      name: 'Amazon Web Services',
      logo: '/images/providers/aws-logo.png',
      description: '世界最大のクラウドプロバイダー',
      supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
      estimatedCost: {
        hourly: 0.50,
        monthly: 360
      },
      features: [
        '高い信頼性',
        '豊富なサービス',
        'グローバル展開',
        'セキュリティ認証'
      ]
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      logo: '/images/providers/azure-logo.png',
      description: 'Microsoftのエンタープライズクラウド',
      supportedRegions: ['eastus', 'westus2', 'westeurope', 'southeastasia'],
      estimatedCost: {
        hourly: 0.48,
        monthly: 345
      },
      features: [
        'Office 365統合',
        'Active Directory',
        'ハイブリッド対応',
        'AI/ML サービス'
      ]
    },
    {
      id: 'gcp',
      name: 'Google Cloud Platform',
      logo: '/images/providers/gcp-logo.png',
      description: 'Googleの機械学習とビッグデータ',
      supportedRegions: ['us-central1', 'us-west1', 'europe-west1', 'asia-southeast1'],
      estimatedCost: {
        hourly: 0.45,
        monthly: 324
      },
      features: [
        '高性能ネットワーク',
        'AI/ML プラットフォーム',
        'Kubernetes',
        'ビッグデータ分析'
      ]
    }
  ];
}

export default MarketplaceDeployComponent;