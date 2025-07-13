import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './components/UI/Notification';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { Analysis } from './pages/Analysis';
import { Monitoring } from './pages/Monitoring';
import { RealtimeMonitoring } from './pages/RealtimeMonitoring';
import { PerformanceAnalytics } from './pages/PerformanceAnalytics';
import { History } from './pages/History';
import { Reports } from './pages/Reports';
import { APIIntegrations } from './pages/APIIntegrations';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { LoadingSpinner } from './components/UI/LoadingSpinner';

// React Query クライアントの設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 認証が必要なルートのラッパー
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner text="認証状態を確認中..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// メインアプリケーションコンポーネント
const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* 認証不要ルート */}
        <Route path="/login" element={<Login />} />
        
        {/* 認証必須ルート */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="realtime-monitoring" element={<RealtimeMonitoring />} />
          <Route path="performance-analytics" element={<PerformanceAnalytics />} />
          <Route path="history" element={<History />} />
          <Route path="reports" element={<Reports />} />
          <Route path="api-integrations" element={<APIIntegrations />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 404 ページ */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">ページが見つかりません</p>
              <Navigate to="/" replace />
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}

export default App;
