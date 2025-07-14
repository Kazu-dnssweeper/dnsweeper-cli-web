/**
 * マルチテナント管理ページ
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  Timeline as TimelineIcon,
  Assignment as AssignmentIcon,
  Monitor as MonitorIcon,
  Cloud as CloudIcon,
  Group as GroupIcon,
  Lock as LockIcon,
  VpnKey as VpnKeyIcon,
  Domain as DomainIcon,
  Dns as DnsIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';

interface Tenant {
  id: string;
  name: string;
  organizationId: string;
  domain: string;
  status: 'active' | 'suspended' | 'inactive';
  settings: {
    dnsResolvers: string[];
    securityPolicies: {
      threatDetection: boolean;
      realTimeMonitoring: boolean;
      aiOptimization: boolean;
      confidenceThreshold: number;
    };
    performanceSettings: {
      monitoringEnabled: boolean;
      alertThresholds: {
        responseTime: number;
        errorRate: number;
        throughput: number;
      };
    };
    integrationsEnabled: string[];
    customDomains: string[];
  };
  resources: {
    maxDomains: number;
    maxRecords: number;
    maxQueries: number;
    maxUsers: number;
    storageLimit: number;
    computeLimit: number;
    currentUsage: {
      domains: number;
      records: number;
      queries: number;
      users: number;
      storage: number;
      compute: number;
    };
  };
  permissions: {
    adminUsers: string[];
    readOnlyUsers: string[];
    customRoles: { [key: string]: { permissions: string[]; users: string[] } };
    apiKeys: { [key: string]: { permissions: string[]; expiresAt: Date; createdBy: string } };
  };
  createdAt: Date;
  updatedAt: Date;
}

interface OrchestrationJob {
  id: string;
  tenantId: string;
  type: 'dns-analysis' | 'security-scan' | 'optimization' | 'bulk-operation' | 'report-generation';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  estimatedDuration: number;
  actualDuration?: number;
}

const TenantManagement: React.FC = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [jobs, setJobs] = useState<OrchestrationJob[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [newTenant, setNewTenant] = useState({
    name: '',
    organizationId: '',
    domain: '',
    maxDomains: 100,
    maxRecords: 1000,
    maxQueries: 10000,
    maxUsers: 10
  });

  useEffect(() => {
    loadTenants();
    loadJobs();
  }, []);

  const loadTenants = async () => {
    try {
      // 実際の実装では、テナント管理APIを呼び出す
      const mockTenants: Tenant[] = [
        {
          id: 'tenant-1',
          name: 'アクメ商事',
          organizationId: 'org-1',
          domain: 'acme.com',
          status: 'active',
          settings: {
            dnsResolvers: ['8.8.8.8', '1.1.1.1'],
            securityPolicies: {
              threatDetection: true,
              realTimeMonitoring: true,
              aiOptimization: true,
              confidenceThreshold: 80
            },
            performanceSettings: {
              monitoringEnabled: true,
              alertThresholds: {
                responseTime: 5000,
                errorRate: 5,
                throughput: 1000
              }
            },
            integrationsEnabled: ['cloudflare', 'route53'],
            customDomains: ['acme.com', 'api.acme.com']
          },
          resources: {
            maxDomains: 100,
            maxRecords: 1000,
            maxQueries: 10000,
            maxUsers: 10,
            storageLimit: 1000,
            computeLimit: 100,
            currentUsage: {
              domains: 25,
              records: 350,
              queries: 2500,
              users: 5,
              storage: 250,
              compute: 30
            }
          },
          permissions: {
            adminUsers: ['admin@acme.com'],
            readOnlyUsers: ['viewer@acme.com'],
            customRoles: {
              'dns-manager': {
                permissions: ['dns:read', 'dns:write'],
                users: ['dns-admin@acme.com']
              }
            },
            apiKeys: {
              'key-1': {
                permissions: ['api:read'],
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                createdBy: 'admin@acme.com'
              }
            }
          },
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'tenant-2',
          name: 'テクノロジー株式会社',
          organizationId: 'org-2',
          domain: 'techno.co.jp',
          status: 'active',
          settings: {
            dnsResolvers: ['8.8.8.8'],
            securityPolicies: {
              threatDetection: true,
              realTimeMonitoring: false,
              aiOptimization: false,
              confidenceThreshold: 70
            },
            performanceSettings: {
              monitoringEnabled: false,
              alertThresholds: {
                responseTime: 3000,
                errorRate: 3,
                throughput: 500
              }
            },
            integrationsEnabled: ['route53'],
            customDomains: ['techno.co.jp']
          },
          resources: {
            maxDomains: 50,
            maxRecords: 500,
            maxQueries: 5000,
            maxUsers: 5,
            storageLimit: 500,
            computeLimit: 50,
            currentUsage: {
              domains: 12,
              records: 150,
              queries: 800,
              users: 3,
              storage: 80,
              compute: 15
            }
          },
          permissions: {
            adminUsers: ['admin@techno.co.jp'],
            readOnlyUsers: [],
            customRoles: {},
            apiKeys: {}
          },
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      ];

      setTenants(mockTenants);
    } catch (err) {
      setError('テナント情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      // 実際の実装では、ジョブ管理APIを呼び出す
      const mockJobs: OrchestrationJob[] = [
        {
          id: 'job-1',
          tenantId: 'tenant-1',
          type: 'dns-analysis',
          status: 'running',
          progress: 65,
          priority: 'high',
          createdAt: new Date(Date.now() - 10 * 60 * 1000),
          estimatedDuration: 300000
        },
        {
          id: 'job-2',
          tenantId: 'tenant-1',
          type: 'security-scan',
          status: 'completed',
          progress: 100,
          priority: 'medium',
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
          estimatedDuration: 600000,
          actualDuration: 550000
        },
        {
          id: 'job-3',
          tenantId: 'tenant-2',
          type: 'optimization',
          status: 'pending',
          progress: 0,
          priority: 'low',
          createdAt: new Date(Date.now() - 5 * 60 * 1000),
          estimatedDuration: 900000
        }
      ];

      setJobs(mockJobs);
    } catch (err) {
      setError('ジョブ情報の読み込みに失敗しました');
    }
  };

  const createTenant = async () => {
    try {
      // 実際の実装では、テナント作成APIを呼び出す
      const tenant: Tenant = {
        id: `tenant-${Date.now()}`,
        name: newTenant.name,
        organizationId: newTenant.organizationId,
        domain: newTenant.domain,
        status: 'active',
        settings: {
          dnsResolvers: ['8.8.8.8'],
          securityPolicies: {
            threatDetection: false,
            realTimeMonitoring: false,
            aiOptimization: false,
            confidenceThreshold: 70
          },
          performanceSettings: {
            monitoringEnabled: false,
            alertThresholds: {
              responseTime: 5000,
              errorRate: 5,
              throughput: 1000
            }
          },
          integrationsEnabled: [],
          customDomains: [newTenant.domain]
        },
        resources: {
          maxDomains: newTenant.maxDomains,
          maxRecords: newTenant.maxRecords,
          maxQueries: newTenant.maxQueries,
          maxUsers: newTenant.maxUsers,
          storageLimit: 1000,
          computeLimit: 100,
          currentUsage: {
            domains: 0,
            records: 0,
            queries: 0,
            users: 0,
            storage: 0,
            compute: 0
          }
        },
        permissions: {
          adminUsers: [],
          readOnlyUsers: [],
          customRoles: {},
          apiKeys: {}
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setTenants([...tenants, tenant]);
      setCreateDialogOpen(false);
      setNewTenant({
        name: '',
        organizationId: '',
        domain: '',
        maxDomains: 100,
        maxRecords: 1000,
        maxQueries: 10000,
        maxUsers: 10
      });
    } catch (err) {
      setError('テナント作成に失敗しました');
    }
  };

  const updateTenantStatus = async (tenantId: string, status: 'active' | 'suspended' | 'inactive') => {
    try {
      setTenants(tenants.map(t => 
        t.id === tenantId 
          ? { ...t, status, updatedAt: new Date() }
          : t
      ));
    } catch (err) {
      setError('テナント状態の更新に失敗しました');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon />;
      case 'suspended': return <PauseIcon />;
      case 'inactive': return <ErrorIcon />;
      default: return <WarningIcon />;
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'primary';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case 'dns-analysis': return <DnsIcon />;
      case 'security-scan': return <SecurityIcon />;
      case 'optimization': return <SpeedIcon />;
      case 'bulk-operation': return <AssignmentIcon />;
      case 'report-generation': return <AnalyticsIcon />;
      default: return <MonitorIcon />;
    }
  };

  const getJobTypeLabel = (type: string) => {
    switch (type) {
      case 'dns-analysis': return 'DNS分析';
      case 'security-scan': return 'セキュリティスキャン';
      case 'optimization': return 'AI最適化';
      case 'bulk-operation': return 'バルク操作';
      case 'report-generation': return 'レポート生成';
      default: return type;
    }
  };

  const calculateUsagePercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'primary';
  };

  const renderTenantCard = (tenant: Tenant) => (
    <Card key={tenant.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar>
              <BusinessIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">{tenant.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {tenant.domain}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={tenant.status}
              color={getStatusColor(tenant.status) as any}
              icon={getStatusIcon(tenant.status)}
              size="small"
            />
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              リソース使用状況
            </Typography>
            
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">ドメイン</Typography>
                <Typography variant="body2">
                  {tenant.resources.currentUsage.domains} / {tenant.resources.maxDomains}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={calculateUsagePercentage(tenant.resources.currentUsage.domains, tenant.resources.maxDomains)}
                color={getUsageColor(calculateUsagePercentage(tenant.resources.currentUsage.domains, tenant.resources.maxDomains))}
              />
            </Box>

            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">レコード</Typography>
                <Typography variant="body2">
                  {tenant.resources.currentUsage.records} / {tenant.resources.maxRecords}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={calculateUsagePercentage(tenant.resources.currentUsage.records, tenant.resources.maxRecords)}
                color={getUsageColor(calculateUsagePercentage(tenant.resources.currentUsage.records, tenant.resources.maxRecords))}
              />
            </Box>

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">クエリ</Typography>
                <Typography variant="body2">
                  {tenant.resources.currentUsage.queries} / {tenant.resources.maxQueries}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={calculateUsagePercentage(tenant.resources.currentUsage.queries, tenant.resources.maxQueries)}
                color={getUsageColor(calculateUsagePercentage(tenant.resources.currentUsage.queries, tenant.resources.maxQueries))}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              機能設定
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">脅威検出</Typography>
                <Chip
                  label={tenant.settings.securityPolicies.threatDetection ? 'ON' : 'OFF'}
                  color={tenant.settings.securityPolicies.threatDetection ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">リアルタイム監視</Typography>
                <Chip
                  label={tenant.settings.securityPolicies.realTimeMonitoring ? 'ON' : 'OFF'}
                  color={tenant.settings.securityPolicies.realTimeMonitoring ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">AI最適化</Typography>
                <Chip
                  label={tenant.settings.securityPolicies.aiOptimization ? 'ON' : 'OFF'}
                  color={tenant.settings.securityPolicies.aiOptimization ? 'success' : 'default'}
                  size="small"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">統合機能</Typography>
                <Typography variant="body2">
                  {tenant.settings.integrationsEnabled.length} 個
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
      
      <CardActions>
        <Button
          size="small"
          onClick={() => {
            setSelectedTenant(tenant);
            setActiveTab(0);
          }}
          startIcon={<VisibilityIcon />}
        >
          詳細表示
        </Button>
        
        <Button
          size="small"
          onClick={() => {
            setSelectedTenant(tenant);
            setSettingsDialogOpen(true);
          }}
          startIcon={<SettingsIcon />}
        >
          設定
        </Button>
        
        <Button
          size="small"
          onClick={() => updateTenantStatus(tenant.id, tenant.status === 'active' ? 'suspended' : 'active')}
          startIcon={tenant.status === 'active' ? <PauseIcon /> : <PlayArrowIcon />}
          color={tenant.status === 'active' ? 'warning' : 'success'}
        >
          {tenant.status === 'active' ? '停止' : '開始'}
        </Button>
      </CardActions>
    </Card>
  );

  const renderJobsList = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ジョブID</TableCell>
            <TableCell>テナント</TableCell>
            <TableCell>タイプ</TableCell>
            <TableCell>状態</TableCell>
            <TableCell>進捗</TableCell>
            <TableCell>優先度</TableCell>
            <TableCell>作成日時</TableCell>
            <TableCell>アクション</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.map((job) => {
            const tenant = tenants.find(t => t.id === job.tenantId);
            return (
              <TableRow key={job.id}>
                <TableCell>{job.id}</TableCell>
                <TableCell>{tenant?.name || 'Unknown'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getJobTypeIcon(job.type)}
                    {getJobTypeLabel(job.type)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={job.status}
                    color={getJobStatusColor(job.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={job.progress}
                      sx={{ minWidth: 100 }}
                    />
                    <Typography variant="body2">{job.progress}%</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={job.priority}
                    color={job.priority === 'critical' ? 'error' : job.priority === 'high' ? 'warning' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {job.createdAt.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Tooltip title="詳細表示">
                    <IconButton size="small">
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="primary" />
          テナント管理
        </Typography>
        
        <Button
          variant="contained"
          onClick={() => setCreateDialogOpen(true)}
          startIcon={<AddIcon />}
        >
          テナント作成
        </Button>
      </Box>

      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        マルチテナント環境でのDNS管理とリソース監視
      </Typography>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 統計情報 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {tenants.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                総テナント数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {tenants.filter(t => t.status === 'active').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                アクティブ
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {jobs.filter(j => j.status === 'running').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                実行中ジョブ
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {tenants.reduce((sum, t) => sum + t.resources.currentUsage.domains, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                総ドメイン数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* メインコンテンツ */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<BusinessIcon />} label="テナント一覧" />
          <Tab icon={<AssignmentIcon />} label="オーケストレーション・ジョブ" />
          <Tab icon={<AnalyticsIcon />} label="統計・分析" />
        </Tabs>
      </Paper>

      {/* テナント一覧 */}
      {activeTab === 0 && (
        <Box>
          {tenants.length === 0 ? (
            <Alert severity="info">
              テナントが登録されていません。最初のテナントを作成してください。
            </Alert>
          ) : (
            tenants.map(renderTenantCard)
          )}
        </Box>
      )}

      {/* オーケストレーション・ジョブ */}
      {activeTab === 1 && (
        <Box>
          {jobs.length === 0 ? (
            <Alert severity="info">
              実行中のジョブはありません。
            </Alert>
          ) : (
            renderJobsList()
          )}
        </Box>
      )}

      {/* 統計・分析 */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            リソース使用状況の統計
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    ドメイン使用率
                  </Typography>
                  {tenants.map(tenant => (
                    <Box key={tenant.id} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">{tenant.name}</Typography>
                        <Typography variant="body2">
                          {calculateUsagePercentage(tenant.resources.currentUsage.domains, tenant.resources.maxDomains)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={calculateUsagePercentage(tenant.resources.currentUsage.domains, tenant.resources.maxDomains)}
                        color={getUsageColor(calculateUsagePercentage(tenant.resources.currentUsage.domains, tenant.resources.maxDomains))}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    機能有効化状況
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">脅威検出</Typography>
                      <Typography variant="body2">
                        {tenants.filter(t => t.settings.securityPolicies.threatDetection).length}/{tenants.length}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">リアルタイム監視</Typography>
                      <Typography variant="body2">
                        {tenants.filter(t => t.settings.securityPolicies.realTimeMonitoring).length}/{tenants.length}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">AI最適化</Typography>
                      <Typography variant="body2">
                        {tenants.filter(t => t.settings.securityPolicies.aiOptimization).length}/{tenants.length}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* テナント作成ダイアログ */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>新しいテナントを作成</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                label="テナント名"
                value={newTenant.name}
                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="組織ID"
                value={newTenant.organizationId}
                onChange={(e) => setNewTenant({ ...newTenant, organizationId: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                label="ドメイン"
                value={newTenant.domain}
                onChange={(e) => setNewTenant({ ...newTenant, domain: e.target.value })}
                fullWidth
                required
                helperText="例: example.com"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="最大ドメイン数"
                type="number"
                value={newTenant.maxDomains}
                onChange={(e) => setNewTenant({ ...newTenant, maxDomains: parseInt(e.target.value) })}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="最大レコード数"
                type="number"
                value={newTenant.maxRecords}
                onChange={(e) => setNewTenant({ ...newTenant, maxRecords: parseInt(e.target.value) })}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="最大クエリ数"
                type="number"
                value={newTenant.maxQueries}
                onChange={(e) => setNewTenant({ ...newTenant, maxQueries: parseInt(e.target.value) })}
                fullWidth
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="最大ユーザー数"
                type="number"
                value={newTenant.maxUsers}
                onChange={(e) => setNewTenant({ ...newTenant, maxUsers: parseInt(e.target.value) })}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={createTenant}
            variant="contained"
            disabled={!newTenant.name || !newTenant.organizationId || !newTenant.domain}
          >
            作成
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TenantManagement;