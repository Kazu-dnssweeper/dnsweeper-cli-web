/**
 * エンタープライズ・ダッシュボード
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  Avatar,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  NetworkCheck as NetworkCheckIcon,
  Cloud as CloudIcon,
  Monitor as MonitorIcon,
  Lock as LockIcon,
  Shield as ShieldIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  DateRange as DateRangeIcon,
  Group as GroupIcon,
  Admin as AdminIcon,
  Dns as DnsIcon,
  Domain as DomainIcon,
  Router as RouterIcon,
  Backup as BackupIcon,
  Update as UpdateIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DashboardMetrics {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    inactive: number;
  };
  users: {
    total: number;
    active: number;
    mfaEnabled: number;
    recentLogins: number;
  };
  security: {
    totalEvents: number;
    highRiskEvents: number;
    failedAttempts: number;
    policyViolations: number;
    averageRiskScore: number;
  };
  performance: {
    avgResponseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  resources: {
    totalDomains: number;
    totalRecords: number;
    totalQueries: number;
    storageUsage: number;
    computeUsage: number;
  };
  jobs: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
}

interface AlertItem {
  id: string;
  type: 'security' | 'performance' | 'resource' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  tenantId?: string;
}

const EnterpriseDashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // チャートデータ
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [securityData, setSecurityData] = useState<any[]>([]);
  const [resourceData, setResourceData] = useState<any[]>([]);
  const [tenantData, setTenantData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadDashboardData();
      }, 30000); // 30秒間隔
      setRefreshInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedTimeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 実際の実装では、エンタープライズ・ダッシュボードAPIを呼び出す
      const mockMetrics: DashboardMetrics = {
        tenants: {
          total: 25,
          active: 22,
          suspended: 2,
          inactive: 1
        },
        users: {
          total: 150,
          active: 142,
          mfaEnabled: 120,
          recentLogins: 89
        },
        security: {
          totalEvents: 15420,
          highRiskEvents: 45,
          failedAttempts: 123,
          policyViolations: 8,
          averageRiskScore: 25.5
        },
        performance: {
          avgResponseTime: 245,
          throughput: 1250,
          errorRate: 0.8,
          uptime: 99.95
        },
        resources: {
          totalDomains: 1250,
          totalRecords: 8750,
          totalQueries: 125000,
          storageUsage: 65.5,
          computeUsage: 42.3
        },
        jobs: {
          total: 1420,
          running: 12,
          completed: 1350,
          failed: 58
        }
      };

      const mockAlerts: AlertItem[] = [
        {
          id: 'alert-1',
          type: 'security',
          severity: 'critical',
          title: '異常な認証試行を検出',
          message: 'tenant-1で5分間に50回の認証失敗が発生しました',
          timestamp: new Date(Date.now() - 300000),
          acknowledged: false,
          tenantId: 'tenant-1'
        },
        {
          id: 'alert-2',
          type: 'performance',
          severity: 'high',
          title: '応答時間の増加',
          message: '平均応答時間が5秒を超えています',
          timestamp: new Date(Date.now() - 600000),
          acknowledged: false
        },
        {
          id: 'alert-3',
          type: 'resource',
          severity: 'medium',
          title: 'ストレージ使用量警告',
          message: 'tenant-5のストレージ使用量が80%を超えました',
          timestamp: new Date(Date.now() - 1800000),
          acknowledged: true,
          tenantId: 'tenant-5'
        }
      ];

      // チャートデータの生成
      const mockPerformanceData = Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        responseTime: Math.floor(Math.random() * 200) + 200,
        throughput: Math.floor(Math.random() * 500) + 1000,
        errorRate: Math.random() * 2
      }));

      const mockSecurityData = Array.from({ length: 7 }, (_, i) => ({
        day: ['日', '月', '火', '水', '木', '金', '土'][i],
        events: Math.floor(Math.random() * 1000) + 500,
        highRisk: Math.floor(Math.random() * 50) + 10,
        failed: Math.floor(Math.random() * 100) + 20
      }));

      const mockResourceData = [
        { name: 'ドメイン', used: 1250, total: 2000 },
        { name: 'レコード', used: 8750, total: 15000 },
        { name: 'クエリ', used: 125000, total: 200000 },
        { name: 'ストレージ', used: 65.5, total: 100 },
        { name: 'コンピュート', used: 42.3, total: 100 }
      ];

      const mockTenantData = [
        { name: 'アクティブ', value: 22, color: '#4caf50' },
        { name: '停止中', value: 2, color: '#ff9800' },
        { name: '非アクティブ', value: 1, color: '#f44336' }
      ];

      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
      setPerformanceData(mockPerformanceData);
      setSecurityData(mockSecurityData);
      setResourceData(mockResourceData);
      setTenantData(mockTenantData);

    } catch (err) {
      setError('ダッシュボードデータの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, acknowledged: true }
        : alert
    ));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon />;
      case 'high': return <WarningIcon />;
      case 'medium': return <NotificationsIcon />;
      case 'low': return <CheckCircleIcon />;
      default: return <NotificationsIcon />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <SecurityIcon />;
      case 'performance': return <SpeedIcon />;
      case 'resource': return <StorageIcon />;
      case 'system': return <SettingsIcon />;
      default: return <NotificationsIcon />;
    }
  };

  const renderMetricCard = (title: string, value: number | string, icon: React.ReactNode, color: string, subtitle?: string) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" color={color}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.main` }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const renderAlertsList = () => (
    <Card>
      <CardHeader
        title="アラート"
        action={
          <Badge badgeContent={alerts.filter(a => !a.acknowledged).length} color="error">
            <NotificationsIcon />
          </Badge>
        }
      />
      <CardContent>
        {alerts.length === 0 ? (
          <Alert severity="success">
            現在アラートはありません
          </Alert>
        ) : (
          <List>
            {alerts.slice(0, 5).map((alert) => (
              <ListItem key={alert.id} sx={{ mb: 1 }}>
                <ListItemIcon>
                  <Badge
                    color={getSeverityColor(alert.severity) as any}
                    variant="dot"
                    invisible={alert.acknowledged}
                  >
                    {getTypeIcon(alert.type)}
                  </Badge>
                </ListItemIcon>
                <ListItemText
                  primary={alert.title}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {alert.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {alert.timestamp.toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
                {!alert.acknowledged && (
                  <Button
                    size="small"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    確認
                  </Button>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );

  const renderPerformanceChart = () => (
    <Card>
      <CardHeader title="パフォーマンス監視" />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <ChartTooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="responseTime" stroke="#8884d8" name="応答時間 (ms)" />
            <Line yAxisId="right" type="monotone" dataKey="throughput" stroke="#82ca9d" name="スループット (req/s)" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const renderSecurityChart = () => (
    <Card>
      <CardHeader title="セキュリティ監視" />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={securityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <ChartTooltip />
            <Legend />
            <Bar dataKey="events" fill="#8884d8" name="総イベント数" />
            <Bar dataKey="highRisk" fill="#ff8042" name="高リスクイベント" />
            <Bar dataKey="failed" fill="#ff6b6b" name="認証失敗" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const renderResourceChart = () => (
    <Card>
      <CardHeader title="リソース使用状況" />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={resourceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip />
            <Legend />
            <Bar dataKey="used" fill="#8884d8" name="使用量" />
            <Bar dataKey="total" fill="#82ca9d" name="総容量" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  const renderTenantChart = () => (
    <Card>
      <CardHeader title="テナント状態分布" />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={tenantData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {tenantData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!metrics) {
    return <ErrorAlert message="メトリクスデータが利用できません" />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DashboardIcon color="primary" />
          エンタープライズ・ダッシュボード
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small">
            <InputLabel>時間範囲</InputLabel>
            <Select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              <MenuItem value="1h">1時間</MenuItem>
              <MenuItem value="24h">24時間</MenuItem>
              <MenuItem value="7d">7日間</MenuItem>
              <MenuItem value="30d">30日間</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="自動更新"
          />
          
          <Button
            variant="outlined"
            onClick={loadDashboardData}
            startIcon={<RefreshIcon />}
          >
            更新
          </Button>
        </Box>
      </Box>

      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        エンタープライズ環境の包括的監視・管理ダッシュボード
      </Typography>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 主要メトリクス */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={2}>
          {renderMetricCard('総テナント数', metrics.tenants.total, <BusinessIcon />, 'primary')}
        </Grid>
        <Grid item xs={12} md={2}>
          {renderMetricCard('アクティブユーザー', metrics.users.active, <PeopleIcon />, 'success')}
        </Grid>
        <Grid item xs={12} md={2}>
          {renderMetricCard('高リスクイベント', metrics.security.highRiskEvents, <SecurityIcon />, 'error')}
        </Grid>
        <Grid item xs={12} md={2}>
          {renderMetricCard('稼働率', `${metrics.performance.uptime}%`, <MonitorIcon />, 'info')}
        </Grid>
        <Grid item xs={12} md={2}>
          {renderMetricCard('実行中ジョブ', metrics.jobs.running, <AssessmentIcon />, 'warning')}
        </Grid>
        <Grid item xs={12} md={2}>
          {renderMetricCard('総ドメイン数', metrics.resources.totalDomains, <DomainIcon />, 'primary')}
        </Grid>
      </Grid>

      {/* サブメトリクス */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SecurityIcon sx={{ mr: 1 }} />
                セキュリティ概況
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  平均リスクスコア
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics.security.averageRiskScore}
                  color={metrics.security.averageRiskScore > 50 ? 'error' : 'success'}
                  sx={{ mt: 1 }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {metrics.security.averageRiskScore}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  認証失敗数
                </Typography>
                <Typography variant="h6" color="error">
                  {metrics.security.failedAttempts}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  ポリシー違反
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {metrics.security.policyViolations}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <SpeedIcon sx={{ mr: 1 }} />
                パフォーマンス
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  平均応答時間
                </Typography>
                <Typography variant="h6" color="primary">
                  {metrics.performance.avgResponseTime}ms
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  スループット
                </Typography>
                <Typography variant="h6" color="success.main">
                  {metrics.performance.throughput} req/s
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  エラー率
                </Typography>
                <Typography variant="h6" color={metrics.performance.errorRate > 1 ? 'error' : 'success'}>
                  {metrics.performance.errorRate}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <StorageIcon sx={{ mr: 1 }} />
                リソース使用量
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  ストレージ使用率
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics.resources.storageUsage}
                  color={metrics.resources.storageUsage > 80 ? 'error' : 'primary'}
                  sx={{ mt: 1 }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {metrics.resources.storageUsage}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  コンピュート使用率
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics.resources.computeUsage}
                  color={metrics.resources.computeUsage > 80 ? 'error' : 'primary'}
                  sx={{ mt: 1 }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {metrics.resources.computeUsage}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PeopleIcon sx={{ mr: 1 }} />
                ユーザー統計
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  MFA有効率
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(metrics.users.mfaEnabled / metrics.users.total) * 100}
                  color="success"
                  sx={{ mt: 1 }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {Math.round((metrics.users.mfaEnabled / metrics.users.total) * 100)}%
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  最近のログイン
                </Typography>
                <Typography variant="h6" color="info.main">
                  {metrics.users.recentLogins}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* チャートとアラート */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab icon={<TimelineIcon />} label="パフォーマンス" />
            <Tab icon={<SecurityIcon />} label="セキュリティ" />
            <Tab icon={<StorageIcon />} label="リソース" />
            <Tab icon={<BusinessIcon />} label="テナント" />
          </Tabs>
          
          <Box sx={{ mt: 2 }}>
            {activeTab === 0 && renderPerformanceChart()}
            {activeTab === 1 && renderSecurityChart()}
            {activeTab === 2 && renderResourceChart()}
            {activeTab === 3 && renderTenantChart()}
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          {renderAlertsList()}
        </Grid>
      </Grid>

      {/* 詳細統計 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="ジョブ実行統計" />
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ステータス</TableCell>
                      <TableCell align="right">件数</TableCell>
                      <TableCell align="right">割合</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Chip label="完了" color="success" size="small" />
                      </TableCell>
                      <TableCell align="right">{metrics.jobs.completed}</TableCell>
                      <TableCell align="right">
                        {Math.round((metrics.jobs.completed / metrics.jobs.total) * 100)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Chip label="実行中" color="primary" size="small" />
                      </TableCell>
                      <TableCell align="right">{metrics.jobs.running}</TableCell>
                      <TableCell align="right">
                        {Math.round((metrics.jobs.running / metrics.jobs.total) * 100)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <Chip label="失敗" color="error" size="small" />
                      </TableCell>
                      <TableCell align="right">{metrics.jobs.failed}</TableCell>
                      <TableCell align="right">
                        {Math.round((metrics.jobs.failed / metrics.jobs.total) * 100)}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="システム稼働状況" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">DNS解決サービス</Typography>
                  <Chip label="稼働中" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">セキュリティ監視</Typography>
                  <Chip label="稼働中" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">AI最適化エンジン</Typography>
                  <Chip label="稼働中" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">バックアップシステム</Typography>
                  <Chip label="稼働中" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">オーケストレーション</Typography>
                  <Chip label="稼働中" color="success" size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default EnterpriseDashboard;