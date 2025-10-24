// Super Admin Dashboard Component
// Comprehensive tenant management and system monitoring

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import {
  Building2,
  Users,
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle,
  TrendingUp,
  Plus,
  Eye,
  Edit,
  Pause,
  Play,
  Trash2,
  RefreshCw,
  Download,
  Search,
  Filter,
  BarChart3,
  DollarSign,
  Server,
  Database,
  Globe,
  UserCheck,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { useAuth } from '../App';
import axios from 'axios';
import SecurityDashboard from './SecurityDashboard';
import MLProvisioningForm from './MLProvisioningForm';
import EnhancedTenantManagement from './EnhancedTenantManagement';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const { user, token } = useAuth();

  // Create API instance with auth - use direct baseURL to avoid double /api
  const api = axios.create({
    baseURL: BACKEND_URL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // Simple role checker
  const hasRole = (role) => {
    return user && user.role === role;
  };

  // State management
  const [tenants, setTenants] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [monitoringHealth, setMonitoringHealth] = useState(null);
  const [monitoringMetrics, setMonitoringMetrics] = useState({ '1h': null, '24h': null, '7d': null });
  const [upTimeStats, setUpTimeStats] = useState(null);
  const [biKpis, setBiKpis] = useState(null);
  const [biTrends, setBiTrends] = useState([]);
  const [biReports, setBiReports] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [comparativeData, setComparativeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMetricsPeriod, setSelectedMetricsPeriod] = useState('24h');
  const [selectedBiPeriod, setSelectedBiPeriod] = useState('monthly');

  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10);
  const [totalTenants, setTotalTenants] = useState(0);

  // Create tenant modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTenantData, setCreateTenantData] = useState({
    company_name: '',
    admin_email: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_phone: '',
    business_type: 'arcade',
    expected_machine_count: 1,
    initial_subscription_plan: 'starter',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    website: '',
    notes: '',
    send_welcome_email: true,
    auto_activate: true
  });

  // Check if user has super admin access
  const canAccessSuperAdmin = hasRole('super_admin');

  useEffect(() => {
    if (canAccessSuperAdmin) {
      loadDashboardData();
      
      // Set up auto-refresh for monitoring data every 30 seconds
      const interval = setInterval(() => {
        // Only refresh monitoring data, not tenant data to avoid UI flickering
        loadMonitoringData();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [canAccessSuperAdmin, currentPage, statusFilter, tierFilter, searchTerm]);

  const loadMonitoringData = async () => {
    try {
      // Load new monitoring health data
      const monitoringHealthResponse = await api.get('/api/admin/system/health');
      setMonitoringHealth(monitoringHealthResponse.data);

      // Load monitoring metrics for current selected period only
      const metricsResponse = await api.get(`/api/admin/system/metrics?period=${selectedMetricsPeriod}`);
      setMonitoringMetrics(prev => ({
        ...prev,
        [selectedMetricsPeriod]: metricsResponse.data
      }));

      // Refresh BI KPIs
      try {
        const biKpisResponse = await api.get(`/api/admin/bi/kpis?period=${selectedBiPeriod}&include_trends=true`);
        setBiKpis(biKpisResponse.data?.data);
      } catch (biError) {
        console.warn('Failed to refresh BI KPIs:', biError);
      }

      // Refresh health score occasionally (less frequent)
      if (Math.random() < 0.3) { // 30% chance to refresh health score
        try {
          const healthScoreResponse = await api.get('/api/admin/bi/health-score');
          setHealthScore(healthScoreResponse.data?.health_score);
        } catch (healthError) {
          console.warn('Failed to refresh health score:', healthError);
        }
      }

    } catch (error) {
      console.warn('Failed to refresh monitoring data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load system health metrics (legacy endpoint)
      const healthResponse = await api.get('/api/system/health');
      setSystemHealth(healthResponse.data);

      // Load new monitoring health data
      try {
        const monitoringHealthResponse = await api.get('/api/admin/system/health');
        setMonitoringHealth(monitoringHealthResponse.data);
      } catch (monitoringError) {
        console.warn('Monitoring health endpoint unavailable:', monitoringError);
      }

      // Load monitoring metrics for different periods
      try {
        const periods = ['1h', '24h', '7d'];
        const metricsPromises = periods.map(period => 
          api.get(`/api/admin/system/metrics?period=${period}`)
            .then(response => ({ [period]: response.data }))
            .catch(error => {
              console.warn(`Monitoring metrics for ${period} unavailable:`, error);
              return { [period]: null };
            })
        );
        
        const metricsResults = await Promise.all(metricsPromises);
        const newMetrics = metricsResults.reduce((acc, result) => ({ ...acc, ...result }), {});
        setMonitoringMetrics(newMetrics);
      } catch (metricsError) {
        console.warn('Monitoring metrics endpoint unavailable:', metricsError);
      }

      // Load uptime statistics
      try {
        const uptimeResponse = await api.get('/api/admin/system/uptime');
        setUpTimeStats(uptimeResponse.data);
      } catch (uptimeError) {
        console.warn('Uptime stats endpoint unavailable:', uptimeError);
      }

      // Load BI KPIs
      try {
        const biKpisResponse = await api.get(`/api/admin/bi/kpis?period=${selectedBiPeriod}&include_trends=true`);
        setBiKpis(biKpisResponse.data?.data);
      } catch (biError) {
        console.warn('BI KPIs endpoint unavailable:', biError);
      }

      // Load health score
      try {
        const healthScoreResponse = await api.get('/api/admin/bi/health-score');
        setHealthScore(healthScoreResponse.data?.health_score);
      } catch (healthError) {
        console.warn('Health score endpoint unavailable:', healthError);
      }

      // Load comparative analytics (optional, don't block dashboard if it fails)
      try {
        const comparativeResponse = await api.post('/api/admin/bi/compare', {
          sort_by: 'revenue',
          limit: 10
        });
        setComparativeData(comparativeResponse.data?.data);
      } catch (compareError) {
        console.warn('Comparative analytics unavailable:', compareError);
      }

      // Load tenants with filters
      const tenantsResponse = await api.get('/api/tenants', {
        params: {
          page: currentPage,
          per_page: perPage,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          tier: tierFilter !== 'all' ? tierFilter : undefined,
          search: searchTerm || undefined
        }
      });

      setTenants(tenantsResponse.data.tenants || []);
      setTotalTenants(tenantsResponse.data.total || 0);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleCreateTenant = async () => {
    try {
      setLoading(true);

      const response = await api.post('/api/tenants', createTenantData);
      
      if (response.data.tenant_id) {
        alert('Tenant created successfully!');
        setShowCreateModal(false);
        resetCreateForm();
        await loadDashboardData();
      }

    } catch (error) {
      console.error('Failed to create tenant:', error);
      alert('Failed to create tenant: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChangeTenantStatus = async (tenantId, newStatus, reason = '') => {
    try {
      const response = await api.post(`/api/tenants/${tenantId}/status`, {
        status: newStatus,
        reason,
        notify_tenant: true
      });

      if (response.status === 200) {
        alert(`Tenant status changed to ${newStatus}`);
        await loadDashboardData();
      }

    } catch (error) {
      console.error('Failed to change tenant status:', error);
      alert('Failed to change tenant status: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetCreateForm = () => {
    setCreateTenantData({
      company_name: '',
      admin_email: '',
      admin_first_name: '',
      admin_last_name: '',
      admin_phone: '',
      business_type: 'arcade',
      expected_machine_count: 1,
      initial_subscription_plan: 'starter',
      address_line1: '',
      city: '',
      state: '',
      zip_code: '',
      website: '',
      notes: '',
      send_welcome_email: true,
      auto_activate: true
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { variant: 'default', label: 'Active' },
      suspended: { variant: 'destructive', label: 'Suspended' },
      trial: { variant: 'secondary', label: 'Trial' },
      expired: { variant: 'outline', label: 'Expired' },
      pending: { variant: 'secondary', label: 'Pending' },
      deleted: { variant: 'destructive', label: 'Deleted' }
    };

    const config = statusConfig[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTierBadge = (tier) => {
    const tierConfig = {
      starter: { variant: 'outline', label: 'Starter' },
      growth: { variant: 'secondary', label: 'Growth' },
      enterprise: { variant: 'default', label: 'Enterprise' },
      custom: { variant: 'secondary', label: 'Custom' }
    };

    const config = tierConfig[tier] || { variant: 'outline', label: tier };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getHealthScoreBadge = (score) => {
    if (score >= 80) return <Badge variant="default">Healthy</Badge>;
    if (score >= 60) return <Badge variant="secondary">Fair</Badge>;
    if (score >= 40) return <Badge variant="destructive">Poor</Badge>;
    return <Badge variant="outline">Critical</Badge>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getHealthStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatUptime = (percentage) => {
    if (percentage >= 99.9) return { text: percentage.toFixed(2) + '%', color: 'text-green-600' };
    if (percentage >= 99.0) return { text: percentage.toFixed(2) + '%', color: 'text-yellow-600' };
    return { text: percentage.toFixed(2) + '%', color: 'text-red-600' };
  };

  const formatResponseTime = (ms) => {
    if (ms < 500) return { text: ms.toFixed(0) + 'ms', color: 'text-green-600' };
    if (ms < 2000) return { text: ms.toFixed(0) + 'ms', color: 'text-yellow-600' };
    return { text: ms.toFixed(0) + 'ms', color: 'text-red-600' };
  };

  const formatErrorRate = (percentage) => {
    if (percentage < 1) return { text: percentage.toFixed(2) + '%', color: 'text-green-600' };
    if (percentage < 5) return { text: percentage.toFixed(2) + '%', color: 'text-yellow-600' };
    return { text: percentage.toFixed(2) + '%', color: 'text-red-600' };
  };

  const formatGrowthRate = (percentage) => {
    if (typeof percentage !== 'number' || isNaN(percentage)) return { text: '0%', color: 'text-gray-600' };
    if (percentage > 10) return { text: '+' + percentage.toFixed(1) + '%', color: 'text-green-600' };
    if (percentage > 0) return { text: '+' + percentage.toFixed(1) + '%', color: 'text-blue-600' };
    if (percentage > -5) return { text: percentage.toFixed(1) + '%', color: 'text-yellow-600' };
    return { text: percentage.toFixed(1) + '%', color: 'text-red-600' };
  };

  const formatRevenue = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0';
    if (amount >= 1000000) {
      return '$' + (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return '$' + (amount / 1000).toFixed(1) + 'K';
    }
    return '$' + amount.toFixed(0);
  };

  const formatHealthScore = (score) => {
    if (typeof score !== 'number' || isNaN(score)) return { text: '0%', color: 'text-gray-600', status: 'Unknown' };
    if (score >= 80) return { text: score.toFixed(1) + '%', color: 'text-green-600', status: 'Excellent' };
    if (score >= 60) return { text: score.toFixed(1) + '%', color: 'text-yellow-600', status: 'Good' };
    return { text: score.toFixed(1) + '%', color: 'text-red-600', status: 'Needs Attention' };
  };

  const handleGenerateReport = async (format = 'json') => {
    try {
      setLoading(true);
      
      const reportResponse = await api.post('/api/admin/bi/reports', {
        period: selectedBiPeriod,
        include_trends: true,
        format: format
      });

      if (format === 'csv') {
        // Handle CSV download
        const blob = new Blob([reportResponse.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bi_report_${selectedBiPeriod}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        setBiReports(reportResponse.data);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getKpiIcon = (type) => {
    switch (type) {
      case 'revenue': return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'growth': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'users': return <Users className="w-4 h-4 text-purple-500" />;
      case 'engagement': return <Activity className="w-4 h-4 text-orange-500" />;
      case 'health': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default: return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!canAccessSuperAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the Super Admin dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading && !refreshing) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Platform overview and tenant management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Tenant
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Enhanced System Health Overview with BI KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        {/* System Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {monitoringHealth ? getHealthStatusIcon(monitoringHealth.overall_status) : <Activity className="w-4 h-4 text-gray-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monitoringHealth ? getHealthStatusColor(monitoringHealth.overall_status) : 'text-gray-600'}`}>
              {monitoringHealth ? monitoringHealth.overall_status.toUpperCase() : 'UNKNOWN'}
            </div>
            <p className="text-xs text-gray-600">
              {monitoringHealth ? `${monitoringHealth.total_requests} requests tracked` : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue (BI KPI) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            {getKpiIcon('revenue')}
          </CardHeader>
          <CardContent>
            {biKpis?.revenue ? (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatRevenue(biKpis.revenue?.total_revenue || 0)}
                </div>
                <p className="text-xs text-gray-600">
                  MRR: {formatRevenue(biKpis.revenue?.mrr || 0)}
                </p>
                {biKpis.revenue?.change_percentage && (
                  <div className={`text-xs ${formatGrowthRate(biKpis.revenue.change_percentage || 0).color}`}>
                    {formatGrowthRate(biKpis.revenue.change_percentage || 0).text} vs last period
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-600">--</div>
                <p className="text-xs text-gray-600">Loading...</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Growth Rate (BI KPI) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            {getKpiIcon('growth')}
          </CardHeader>
          <CardContent>
            {biKpis?.revenue ? (
              <>
                <div className={`text-2xl font-bold ${formatGrowthRate(biKpis.revenue?.growth_rate || 0).color}`}>
                  {formatGrowthRate(biKpis.revenue?.growth_rate || 0).text}
                </div>
                <p className="text-xs text-gray-600">
                  Revenue growth
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-600">--</div>
                <p className="text-xs text-gray-600">Loading...</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Active Users (BI KPI) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            {getKpiIcon('users')}
          </CardHeader>
          <CardContent>
            {biKpis?.engagement ? (
              <>
                <div className="text-2xl font-bold text-blue-600">
                  {biKpis.engagement?.active_users?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-gray-600">
                  Retention: {biKpis.engagement?.retention_rate?.toFixed(1) || 0}%
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-600">--</div>
                <p className="text-xs text-gray-600">Loading...</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* System Uptime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Server className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {monitoringHealth ? (
              <>
                <div className={`text-2xl font-bold ${formatUptime(monitoringHealth.uptime_percentage).color}`}>
                  {formatUptime(monitoringHealth.uptime_percentage).text}
                </div>
                <p className="text-xs text-gray-600">
                  {monitoringHealth.successful_requests}/{monitoringHealth.total_requests} successful
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-600">--</div>
                <p className="text-xs text-gray-600">Loading...</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Health Score (BI KPI) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            {getKpiIcon('health')}
          </CardHeader>
          <CardContent>
            {healthScore ? (
              <>
                <div className={`text-2xl font-bold ${formatHealthScore(healthScore?.overall_score || 0).color}`}>
                  {formatHealthScore(healthScore?.overall_score || 0).text}
                </div>
                <p className="text-xs text-gray-600">
                  {formatHealthScore(healthScore?.overall_score || 0).status}
                </p>
                <div className="text-xs text-gray-500 capitalize">
                  Risk: {healthScore?.risk_level || 'Unknown'}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-600">--</div>
                <p className="text-xs text-gray-600">Loading...</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      {monitoringHealth && monitoringHealth.alerts && monitoringHealth.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            System Alerts
          </h3>
          {monitoringHealth.alerts.map((alert, index) => (
            <Alert key={index} variant={alert.type === 'critical' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <span>{alert.message}</span>
                  <Badge variant={alert.type === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.type.toUpperCase()}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">Tenant Management</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="analytics">Business Analytics</TabsTrigger>
          <TabsTrigger value="reports">BI Reports</TabsTrigger>
          <TabsTrigger value="security">Security & Compliance</TabsTrigger>
          <TabsTrigger value="ml-provisioning">ML Provisioning</TabsTrigger>
        </TabsList>

        {/* Enhanced Tenant Management Tab */}
        <TabsContent value="tenants">
          <EnhancedTenantManagement token={token} />
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="health">
          <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">System Health Monitoring</h2>
              <Select value={selectedMetricsPeriod} onValueChange={setSelectedMetricsPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Current Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {monitoringHealth ? (
                    <div className="space-y-2">
                      <div className={`text-lg font-bold ${getHealthStatusColor(monitoringHealth.overall_status)}`}>
                        {monitoringHealth.overall_status.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600">
                        Last updated: {new Date(monitoringHealth.last_updated).toLocaleTimeString()}
                      </div>
                      <div className="text-xs">
                        {Object.entries(monitoringHealth.services_status).map(([service, status]) => (
                          <div key={service} className="flex justify-between">
                            <span className="capitalize">{service}:</span>
                            <span className={status === 'healthy' ? 'text-green-600' : 'text-red-600'}>
                              {status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading...</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Uptime Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upTimeStats ? (
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-green-600">
                        {upTimeStats.uptime_by_period?.current_session?.uptime_percentage?.toFixed(2) || 0}%
                      </div>
                      <div className="text-sm text-gray-600">
                        Session: {upTimeStats.uptime_by_period?.current_session?.duration_human || 'Unknown'}
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>24h:</span>
                          <span>{upTimeStats.uptime_by_period?.last_24h?.uptime_percentage?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>7d:</span>
                          <span>{upTimeStats.uptime_by_period?.last_7d?.uptime_percentage?.toFixed(1) || 0}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading...</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {monitoringMetrics[selectedMetricsPeriod] ? (
                    <div className="space-y-2">
                      <div className={`text-lg font-bold ${formatResponseTime(monitoringMetrics[selectedMetricsPeriod].avg_response_time_ms).color}`}>
                        {formatResponseTime(monitoringMetrics[selectedMetricsPeriod].avg_response_time_ms).text}
                      </div>
                      <div className="text-sm text-gray-600">
                        Average response time
                      </div>
                      <div className="text-xs">
                        {monitoringMetrics[selectedMetricsPeriod].total_requests} requests
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading...</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Error Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {monitoringMetrics[selectedMetricsPeriod] ? (
                    <div className="space-y-2">
                      <div className={`text-lg font-bold ${formatErrorRate(monitoringMetrics[selectedMetricsPeriod].error_rate_percentage).color}`}>
                        {formatErrorRate(monitoringMetrics[selectedMetricsPeriod].error_rate_percentage).text}
                      </div>
                      <div className="text-sm text-gray-600">
                        Error rate
                      </div>
                      <div className="text-xs">
                        Period: {monitoringMetrics[selectedMetricsPeriod].period_human}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading...</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Endpoints and Error Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Endpoints */}
              <Card>
                <CardHeader>
                  <CardTitle>Top API Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  {monitoringMetrics[selectedMetricsPeriod] && monitoringMetrics[selectedMetricsPeriod].top_endpoints ? (
                    <div className="space-y-3">
                      {monitoringMetrics[selectedMetricsPeriod].top_endpoints.slice(0, 8).map((endpoint, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{endpoint.endpoint}</div>
                            <div className="text-xs text-gray-600">
                              {endpoint.count} requests • {endpoint.avg_response_time?.toFixed(0)}ms avg
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${formatErrorRate(endpoint.error_rate || 0).color}`}>
                              {(endpoint.error_rate || 0).toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600">error rate</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-8">No endpoint data available</div>
                  )}
                </CardContent>
              </Card>

              {/* Error Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Error Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {monitoringMetrics[selectedMetricsPeriod] && monitoringMetrics[selectedMetricsPeriod].error_breakdown ? (
                    <div className="space-y-3">
                      {Object.entries(monitoringMetrics[selectedMetricsPeriod].error_breakdown)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 8)
                        .map(([code, count]) => (
                          <div key={code} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{code}</Badge>
                              <span className="text-sm">
                                {code === '400' && 'Bad Request'}
                                {code === '401' && 'Unauthorized'}
                                {code === '403' && 'Forbidden'}
                                {code === '404' && 'Not Found'}
                                {code === '500' && 'Internal Error'}
                                {code === '503' && 'Service Unavailable'}
                              </span>
                            </div>
                            <div className="text-sm font-medium">{count} errors</div>
                          </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-8">No error data available</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Downtime Events */}
            {upTimeStats && upTimeStats.recent_downtime_events && upTimeStats.recent_downtime_events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Downtime Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upTimeStats.recent_downtime_events.map((event, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium text-red-800">
                            {event.duration_human} downtime
                          </div>
                          <div className="text-sm text-red-600">
                            {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="destructive">
                          {event.duration_minutes?.toFixed(1)}min
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Legacy System Health (keep for compatibility) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Legacy System Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  {systemHealth ? (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Legacy Uptime</span>
                        <span className="font-semibold">{systemHealth.uptime_percentage?.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Legacy Response Time</span>
                        <span className="font-semibold">{systemHealth.avg_response_time_ms?.toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Legacy Error Rate</span>
                        <span className="font-semibold">{systemHealth.error_rate_percentage?.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DB Connections</span>
                        <span className="font-semibold">{systemHealth.db_connection_count || 0}</span>
                      </div>
                    </div>
                  ) : (
                    <p>Loading legacy system health...</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tenant Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {systemHealth ? (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Active</span>
                        <span className="font-semibold">{systemHealth.active_tenants || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Trial</span>
                        <span className="font-semibold">{systemHealth.trial_tenants || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Suspended</span>
                        <span className="font-semibold">{systemHealth.suspended_tenants || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>At Risk</span>
                        <span className="font-semibold text-orange-600">{systemHealth.tenants_at_risk || 0}</span>
                      </div>
                    </div>
                  ) : (
                    <p>Loading tenant metrics...</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Business Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            {/* BI Period Selector */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Business Intelligence Analytics</h2>
              <Select value={selectedBiPeriod} onValueChange={setSelectedBiPeriod}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Revenue KPIs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Revenue Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {biKpis?.revenue ? (
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-green-600">
                        {formatRevenue(biKpis.revenue?.total_revenue || 0)}
                      </div>
                      <div className="text-sm text-gray-600">
                        MRR: {formatRevenue(biKpis.revenue?.mrr || 0)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Per Tenant: {formatRevenue(biKpis.revenue?.revenue_per_tenant || 0)}
                      </div>
                      <div className={`text-xs ${formatGrowthRate(biKpis.revenue?.growth_rate || 0).color}`}>
                        Growth: {formatGrowthRate(biKpis.revenue?.growth_rate || 0).text}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading revenue data...</div>
                  )}
                </CardContent>
              </Card>

              {/* Operational KPIs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Operations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {biKpis?.operational ? (
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-blue-600">
                        {biKpis.operational?.active_tenants || 0}/{biKpis.operational?.total_tenants || 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        Active Tenants
                      </div>
                      <div className="text-sm text-gray-600">
                        Uptime: {biKpis.operational?.system_uptime?.toFixed(1) || 0}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Response: {biKpis.operational?.avg_response_time?.toFixed(0) || 0}ms
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading operational data...</div>
                  )}
                </CardContent>
              </Card>

              {/* User Engagement KPIs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    User Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {biKpis?.engagement ? (
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-purple-600">
                        {biKpis.engagement?.active_users?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        Active Users
                      </div>
                      <div className="text-sm text-gray-600">
                        Retention: {biKpis.engagement?.retention_rate?.toFixed(1) || 0}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Session: {biKpis.engagement?.avg_session_duration?.toFixed(1) || 0}min
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading engagement data...</div>
                  )}
                </CardContent>
              </Card>

              {/* Support KPIs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    Support Quality
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {biKpis?.support ? (
                    <div className="space-y-2">
                      <div className="text-lg font-bold text-orange-600">
                        {biKpis.support?.open_tickets || 0}
                      </div>
                      <div className="text-sm text-gray-600">
                        Open Tickets
                      </div>
                      <div className="text-sm text-gray-600">
                        Avg Resolution: {biKpis.support?.avg_resolution_time?.toFixed(1) || 0}h
                      </div>
                      <div className="text-xs text-gray-500">
                        Satisfaction: {biKpis.support?.satisfaction_score?.toFixed(1) || 0}/5
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">Loading support data...</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Health Score Overview */}
            {healthScore && (
              <Card>
                <CardHeader>
                  <CardTitle>Overall Health Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`text-3xl font-bold ${formatHealthScore(healthScore?.overall_score || 0).color}`}>
                        {formatHealthScore(healthScore?.overall_score || 0).text}
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {formatHealthScore(healthScore?.overall_score || 0).status}
                        </div>
                        <div className="text-sm text-gray-600 capitalize">
                          Risk Level: {healthScore?.risk_level || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Health Score Components */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {healthScore?.components?.map((component, index) => (
                      <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className={`text-lg font-semibold ${
                          (component?.score || 0) >= 80 ? 'text-green-600' :
                          (component?.score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {component?.score?.toFixed(1) || 0}%
                        </div>
                        <div className="text-sm text-gray-600 capitalize">
                          {(component?.component || 'unknown').replace('_', ' ')}
                        </div>
                        <div className="text-xs text-gray-500">
                          Weight: {((component?.weight || 0) * 100)?.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {healthScore?.recommendations && healthScore.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Recommendations:</h4>
                      <ul className="space-y-1">
                        {healthScore.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Revenue Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {biKpis?.revenue?.total_revenue ? formatRevenue(biKpis.revenue.total_revenue) : '$0'}
                    </div>
                    <p className="text-gray-600">Total Revenue</p>
                    {biKpis?.revenue?.change_percentage && (
                      <p className={`text-sm ${formatGrowthRate(biKpis.revenue.change_percentage).color}`}>
                        {formatGrowthRate(biKpis.revenue.change_percentage).text} vs previous period
                      </p>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {biKpis?.revenue?.mrr ? formatRevenue(biKpis.revenue.mrr) : '$0'}
                    </div>
                    <p className="text-gray-600">Monthly Recurring Revenue</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {biKpis?.revenue?.churn_rate ? biKpis.revenue.churn_rate.toFixed(1) + '%' : '0%'}
                    </div>
                    <p className="text-gray-600">Churn Rate</p>
                  </div>
                </div>

                {/* Top Revenue Tenants */}
                {biKpis?.revenue?.top_revenue_tenants && biKpis.revenue.top_revenue_tenants.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3">Top Revenue Tenants</h4>
                    <div className="space-y-2">
                      {biKpis.revenue.top_revenue_tenants.slice(0, 5).map((tenant, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                              {index + 1}
                            </div>
                            <span className="font-medium">{tenant?.name || `Tenant ${index + 1}`}</span>
                          </div>
                          <span className="font-bold text-green-600">
                            {formatRevenue(tenant?.revenue || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Performance Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Performance Trends</h4>
                    {monitoringMetrics['24h'] && monitoringMetrics['7d'] ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>24h Requests:</span>
                          <span className="font-medium">{monitoringMetrics['24h'].total_requests.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>7d Requests:</span>
                          <span className="font-medium">{monitoringMetrics['7d'].total_requests.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Daily Requests:</span>
                          <span className="font-medium">
                            {(monitoringMetrics['7d'].total_requests / 7).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Performance Score:</span>
                          <span className={`font-medium ${
                            monitoringMetrics['24h'].avg_response_time_ms < 500 ? 'text-green-600' : 
                            monitoringMetrics['24h'].avg_response_time_ms < 2000 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {monitoringMetrics['24h'].avg_response_time_ms < 500 ? 'Excellent' : 
                             monitoringMetrics['24h'].avg_response_time_ms < 2000 ? 'Good' : 'Needs Attention'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">Loading performance data...</div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold">Reliability Metrics</h4>
                    {upTimeStats ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Current Session:</span>
                          <span className="font-medium text-green-600">
                            {upTimeStats.uptime_by_period?.current_session?.duration_human}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>7d Uptime:</span>
                          <span className="font-medium">
                            {upTimeStats.uptime_by_period?.last_7d?.uptime_percentage?.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>30d Uptime:</span>
                          <span className="font-medium">
                            {upTimeStats.uptime_by_period?.last_30d?.uptime_percentage?.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Downtime Events:</span>
                          <span className="font-medium">
                            {upTimeStats.recent_downtime_events?.length || 0} recent
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-500">Loading reliability data...</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BI Enhancement Notice */}
            <div className="mt-6">
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <span>Phase 8.3 Business Intelligence: Advanced analytics with revenue forecasting, churn prediction, and interactive charts are now available!</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedBiPeriod('quarterly')}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
                      >
                        View Quarterly
                      </button>
                      <button 
                        onClick={() => setSelectedBiPeriod('yearly')}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                      >
                        View Yearly
                      </button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </TabsContent>

        {/* BI Reports Tab */}
        <TabsContent value="reports">
          <div className="space-y-6">
            {/* Report Generation */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Business Intelligence Reports</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => handleGenerateReport('json')}
                      disabled={loading}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleGenerateReport('csv')}
                      disabled={loading}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="report-period">Report Period</Label>
                    <Select value={selectedBiPeriod} onValueChange={setSelectedBiPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-gray-600">
                      Generate comprehensive KPI reports with revenue analytics, operational metrics, user engagement data, and support quality indicators for the selected period.
                    </div>
                  </div>
                </div>

                {/* Generated Report Display */}
                {biReports && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-semibold">Generated Report Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Revenue KPIs Summary */}
                      {biReports.revenue_kpis && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Revenue KPIs</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Total Revenue:</span>
                                <span className="font-medium">{formatRevenue(biReports.revenue_kpis.total_revenue || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>MRR:</span>
                                <span className="font-medium">{formatRevenue(biReports.revenue_kpis.mrr || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Growth Rate:</span>
                                <span className={`font-medium ${formatGrowthRate(biReports.revenue_kpis.growth_rate || 0).color}`}>
                                  {formatGrowthRate(biReports.revenue_kpis.growth_rate || 0).text}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Operational KPIs Summary */}
                      {biReports.operational_kpis && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Operational KPIs</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Active Tenants:</span>
                                <span className="font-medium">{biReports.operational_kpis.active_tenants || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Tenants:</span>
                                <span className="font-medium">{biReports.operational_kpis.total_tenants || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>System Uptime:</span>
                                <span className="font-medium">{(biReports.operational_kpis.system_uptime || 0).toFixed(1)}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* User Engagement KPIs Summary */}
                      {biReports.user_engagement_kpis && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">User Engagement</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Active Users:</span>
                                <span className="font-medium">{(biReports.user_engagement_kpis.active_users || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Retention Rate:</span>
                                <span className="font-medium">{(biReports.user_engagement_kpis.retention_rate || 0).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg Session:</span>
                                <span className="font-medium">{(biReports.user_engagement_kpis.avg_session_duration || 0).toFixed(1)}min</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Support KPIs Summary */}
                      {biReports.support_kpis && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Support Quality</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Open Tickets:</span>
                                <span className="font-medium">{biReports.support_kpis.open_tickets || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg Resolution:</span>
                                <span className="font-medium">{(biReports.support_kpis.avg_resolution_time || 0).toFixed(1)}h</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Satisfaction:</span>
                                <span className="font-medium">{(biReports.support_kpis.satisfaction_score || 0).toFixed(1)}/5</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comparative Analytics */}
            {comparativeData && comparativeData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tenant Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {comparativeData.slice(0, 10).map((tenant, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index < 3 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{tenant?.name || `Tenant ${index + 1}`}</div>
                            <div className="text-sm text-gray-600">{tenant?.status || 'Unknown Status'}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{formatRevenue(tenant?.revenue || 0)}</div>
                          <div className="text-sm text-gray-600">{tenant?.users || 0} users</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Security & Compliance Tab */}
        <TabsContent value="security">
          <SecurityDashboard />
        </TabsContent>

        {/* ML Provisioning Tab */}
        <TabsContent value="ml-provisioning">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                <Bot className="w-8 h-8 text-blue-600" />
                ML Account Provisioning
              </h2>
              <p className="text-gray-600 mt-2">
                Easy provisioning for new Machine Learning analytics accounts with specialized configuration
              </p>
            </div>
            
            <MLProvisioningForm 
              onSuccess={(result) => {
                // Refresh tenant data
                loadTenants();
              }}
              token={token}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Tenant</h2>
            
            <div className="space-y-4">
              {/* Company Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={createTenantData.company_name}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="ACME Gaming LLC"
                  />
                </div>
                <div>
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select 
                    value={createTenantData.business_type}
                    onValueChange={(value) => setCreateTenantData(prev => ({ ...prev, business_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arcade">Arcade</SelectItem>
                      <SelectItem value="bar_restaurant">Bar/Restaurant</SelectItem>
                      <SelectItem value="convenience_store">Convenience Store</SelectItem>
                      <SelectItem value="hotel_casino">Hotel/Casino</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Admin User Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="admin_first_name">Admin First Name *</Label>
                  <Input
                    id="admin_first_name"
                    value={createTenantData.admin_first_name}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, admin_first_name: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="admin_last_name">Admin Last Name *</Label>
                  <Input
                    id="admin_last_name"
                    value={createTenantData.admin_last_name}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, admin_last_name: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="admin_email">Admin Email *</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={createTenantData.admin_email}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, admin_email: e.target.value }))}
                    placeholder="john@acmegaming.com"
                  />
                </div>
                <div>
                  <Label htmlFor="admin_phone">Admin Phone</Label>
                  <Input
                    id="admin_phone"
                    value={createTenantData.admin_phone}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, admin_phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Subscription Plan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subscription_plan">Initial Subscription Plan</Label>
                  <Select 
                    value={createTenantData.initial_subscription_plan}
                    onValueChange={(value) => setCreateTenantData(prev => ({ ...prev, initial_subscription_plan: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter - $3/machine + $25/user</SelectItem>
                      <SelectItem value="growth">Growth - Advanced features</SelectItem>
                      <SelectItem value="enterprise">Enterprise - Full features</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expected_machines">Expected Machine Count</Label>
                  <Input
                    id="expected_machines"
                    type="number"
                    min="1"
                    value={createTenantData.expected_machine_count}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, expected_machine_count: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address">Address (Optional)</Label>
                <Input
                  id="address"
                  value={createTenantData.address_line1}
                  onChange={(e) => setCreateTenantData(prev => ({ ...prev, address_line1: e.target.value }))}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={createTenantData.city}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Atlanta"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={createTenantData.state}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="GA"
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={createTenantData.zip_code}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="30309"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    id="auto_activate"
                    type="checkbox"
                    checked={createTenantData.auto_activate}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, auto_activate: e.target.checked }))}
                  />
                  <Label htmlFor="auto_activate">Auto-activate tenant</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    id="send_welcome"
                    type="checkbox"
                    checked={createTenantData.send_welcome_email}
                    onChange={(e) => setCreateTenantData(prev => ({ ...prev, send_welcome_email: e.target.checked }))}
                  />
                  <Label htmlFor="send_welcome">Send welcome email</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTenant}
                disabled={!createTenantData.company_name || !createTenantData.admin_email || !createTenantData.admin_first_name || !createTenantData.admin_last_name}
              >
                Create Tenant
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;