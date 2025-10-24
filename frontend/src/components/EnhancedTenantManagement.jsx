// Enhanced Tenant Management with Churn Prediction and Risk Assessment
// Advanced tenant lifecycle management with export capabilities

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  TrendingDown,
  AlertTriangle,
  Users,
  Download,
  FileText,
  Activity,
  DollarSign,
  Clock,
  Target,
  Shield,
  Zap,
  BarChart3,
  RefreshCw,
  Filter,
  Search,
  Calendar,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const EnhancedTenantManagement = ({ token }) => {
  // Create API instance
  const api = axios.create({
    baseURL: BACKEND_URL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // State management
  const [churnData, setChurnData] = useState(null);
  const [atRiskTenants, setAtRiskTenants] = useState([]);
  const [retentionMetrics, setRetentionMetrics] = useState({});
  const [allTenants, setAllTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Export configuration
  const [exportConfig, setExportConfig] = useState({
    format: 'json',
    export_type: 'analytics_only',
    include_pii: false,
    include_metrics: true,
    include_usage_data: true,
    include_billing_data: false,
    selected_tenants: []
  });

  useEffect(() => {
    loadTenantAnalytics();
    
    // Set up auto-refresh every 2 minutes
    const interval = setInterval(loadTenantAnalytics, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Filter tenants based on search and filters
    let filtered = allTenants;
    
    if (searchTerm) {
      filtered = filtered.filter(tenant =>
        tenant.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.admin_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tenant => tenant.status === statusFilter);
    }
    
    if (riskFilter !== 'all') {
      filtered = filtered.filter(tenant => tenant.risk_category === riskFilter);
    }
    
    setFilteredTenants(filtered);
  }, [allTenants, searchTerm, statusFilter, riskFilter]);

  const loadTenantAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load churn analysis
      const churnResponse = await api.get('/api/admin/tenants/churn-analysis');
      setChurnData(churnResponse.data.churn_analysis);
      setAtRiskTenants(churnResponse.data.at_risk_tenants || []);
      setRetentionMetrics(churnResponse.data.retention_metrics || {});
      
      // Load all tenants for management
      const tenantsResponse = await api.get('/api/admin/tenants?limit=1000');
      const tenantList = tenantsResponse.data?.tenants || [];
      
      // Merge risk data with tenant data
      const enhancedTenants = tenantList.map(tenant => {
        const riskInfo = atRiskTenants.find(risk => risk.id === tenant.id);
        return {
          ...tenant,
          risk_score: riskInfo?.risk_score || 0,
          risk_category: riskInfo?.risk_category || 'low',
          days_since_login: riskInfo?.days_since_login || 0
        };
      });
      
      setAllTenants(enhancedTenants);
      
    } catch (error) {
      console.error('Failed to load tenant analytics:', error);
      setError('Failed to load tenant analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportTenants = async () => {
    try {
      setExporting(true);
      
      const exportRequest = {
        ...exportConfig,
        tenant_ids: exportConfig.selected_tenants.length > 0 ? exportConfig.selected_tenants : null
      };
      
      const response = await api.post('/api/admin/tenants/export-data', exportRequest, {
        responseType: exportConfig.format === 'json' ? 'json' : 'blob'
      });
      
      if (exportConfig.format === 'json') {
        // For JSON, create a downloadable file
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tenant_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // For CSV/Excel, the backend should return a blob
        const url = window.URL.createObjectURL(response.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tenant_export_${new Date().toISOString().split('T')[0]}.${exportConfig.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      
    } catch (error) {
      console.error('Failed to export tenant data:', error);
      alert('Failed to export tenant data: ' + (error.response?.data?.detail || error.message));
    } finally {
      setExporting(false);
    }
  };

  const getRiskBadge = (category, score) => {
    const variants = {
      critical: { variant: 'destructive', label: 'Critical Risk' },
      high: { variant: 'destructive', label: 'High Risk' },
      medium: { variant: 'secondary', label: 'Medium Risk' },
      low: { variant: 'default', label: 'Low Risk' }
    };
    
    const config = variants[category] || variants.low;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label} ({score})
      </Badge>
    );
  };

  const getChurnTrendIcon = (trend) => {
    return trend === 'increasing' ? 
      <TrendingDown className="w-4 h-4 text-red-500" /> :
      <Activity className="w-4 h-4 text-green-500" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Churn Analysis Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Churn Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate (30d)</CardTitle>
            {getChurnTrendIcon(churnData?.churn_trend)}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (churnData?.churn_rate_30d || 0) > 10 ? 'text-red-600' :
              (churnData?.churn_rate_30d || 0) > 5 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {churnData?.churn_rate_30d || 0}%
            </div>
            <p className="text-xs text-gray-600">
              {churnData?.churned_tenants_30d || 0} tenants churned
            </p>
          </CardContent>
        </Card>

        {/* At Risk Tenants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk Tenants</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {atRiskTenants?.length || 0}
            </div>
            <p className="text-xs text-gray-600">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        {/* Low Engagement */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Engagement</CardTitle>
            <Clock className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {churnData?.low_engagement_count || 0}
            </div>
            <p className="text-xs text-gray-600">
              Inactive for 30+ days
            </p>
          </CardContent>
        </Card>

        {/* Payment Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Issues</CardTitle>
            <DollarSign className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {churnData?.overdue_payments_count || 0}
            </div>
            <p className="text-xs text-gray-600">
              Overdue payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Risk Overview</TabsTrigger>
          <TabsTrigger value="tenants">Tenant Management</TabsTrigger>
          <TabsTrigger value="retention">Retention Analysis</TabsTrigger>
          <TabsTrigger value="export">Data Export</TabsTrigger>
        </TabsList>

        {/* Risk Overview Tab */}
        <TabsContent value="overview">
          <div className="space-y-6">
            {/* At Risk Tenants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-500" />
                  High Risk Tenants
                </CardTitle>
              </CardHeader>
              <CardContent>
                {atRiskTenants?.length > 0 ? (
                  <div className="space-y-4">
                    {atRiskTenants.slice(0, 10).map((tenant) => (
                      <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <div className="font-medium">{tenant?.company_name || 'Unknown Company'}</div>
                            <div className="text-sm text-gray-600">
                              {tenant?.admin_email || 'No Email'} • {tenant?.business_type || 'Unknown Type'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Last login: {tenant.days_since_login} days ago
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {getRiskBadge(tenant.risk_category, tenant.risk_score)}
                          <div className="text-xs text-gray-500 mt-1">
                            {tenant.tier} • {tenant.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Target className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>No high-risk tenants identified</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            {churnData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    Action Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {churnData.recommendations?.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <Activity className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tenant Management Tab */}
        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Enhanced Tenant Management</CardTitle>
                <Button variant="outline" onClick={loadTenantAnalytics}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search tenants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tenant List */}
              <div className="space-y-3">
                {filteredTenants.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{tenant?.company_name || 'Unknown Company'}</div>
                        <div className="text-sm text-gray-600">
                          {tenant?.admin_email || 'No Email'} • Created: {formatDate(tenant?.created_at)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                            {tenant.status}
                          </Badge>
                          <Badge variant="outline">{tenant.tier}</Badge>
                          {getRiskBadge(tenant.risk_category, tenant.risk_score)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {tenant.metrics?.machine_count || 0} machines
                      </div>
                      <div className="text-xs text-gray-500">
                        Last login: {tenant.days_since_login || 0} days ago
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredTenants.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                  <p>No tenants match the current filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Analysis Tab */}
        <TabsContent value="retention">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Retention Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(retentionMetrics).map(([period, data]) => (
                  <div key={period} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {data.rate}%
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {period.replace('_', ' ')} Retention
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {data.retained}/{data.cohort_size} tenants
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Tenant Data Export
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Export Format</Label>
                    <Select value={exportConfig.format} onValueChange={(value) =>
                      setExportConfig(prev => ({ ...prev, format: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Export Type</Label>
                    <Select value={exportConfig.export_type} onValueChange={(value) =>
                      setExportConfig(prev => ({ ...prev, export_type: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="analytics_only">Analytics Only</SelectItem>
                        <SelectItem value="full_data">Full Data</SelectItem>
                        <SelectItem value="ml_dataset">ML Dataset</SelectItem>
                        <SelectItem value="security_audit">Security Audit</SelectItem>
                        <SelectItem value="compliance_report">Compliance Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Include Options</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include_pii"
                          checked={exportConfig.include_pii}
                          onCheckedChange={(checked) =>
                            setExportConfig(prev => ({ ...prev, include_pii: checked }))
                          }
                        />
                        <Label htmlFor="include_pii">Include PII (Personal Information)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include_metrics"
                          checked={exportConfig.include_metrics}
                          onCheckedChange={(checked) =>
                            setExportConfig(prev => ({ ...prev, include_metrics: checked }))
                          }
                        />
                        <Label htmlFor="include_metrics">Include Metrics</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include_billing"
                          checked={exportConfig.include_billing_data}
                          onCheckedChange={(checked) =>
                            setExportConfig(prev => ({ ...prev, include_billing_data: checked }))
                          }
                        />
                        <Label htmlFor="include_billing">Include Billing Data</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <Button
                  onClick={handleExportTenants}
                  disabled={exporting}
                  className="w-full"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export Tenant Data ({filteredTenants.length} tenants)
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Export Information</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Exports are logged for security and compliance purposes</li>
                  <li>• PII data requires explicit permission and is audit logged</li>
                  <li>• ML datasets are anonymized by default</li>
                  <li>• Large exports may take several minutes to process</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedTenantManagement;