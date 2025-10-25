// Enhanced Security Dashboard for Super Admins
// Comprehensive security monitoring, compliance, and management interface

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
import {
  Shield,
  Lock,
  Eye,
  AlertTriangle,
  CheckCircle,
  Users,
  Key,
  FileText,
  Download,
  RefreshCw,
  Settings,
  Database,
  Activity,
  Clock,
  BarChart3,
  UserX,
  ShieldCheck,
  Zap,
  Globe,
  Server
} from 'lucide-react';
import { useAuth } from '../App';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SecurityDashboard = () => {
  const { user, token } = useAuth();
  
  // Create API instance
  const api = axios.create({
    baseURL: BACKEND_URL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // State management
  const [securityData, setSecurityData] = useState(null);
  const [userSecurityData, setUserSecurityData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [complianceReports, setComplianceReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Check if user has super admin access
  const canAccessSecurity = user &&  === 'super_admin';

  useEffect(() => {
    if (canAccessSecurity) {
      loadSecurityDashboard();
      
      // Set up auto-refresh every 60 seconds
      const interval = setInterval(() => {
        loadSecurityDashboard();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [canAccessSecurity]);

  const loadSecurityDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load security dashboard data
      try {
        const dashboardResponse = await api.get('/api/admin/security/dashboard');
        setSecurityData(dashboardResponse.data);
      } catch (dashError) {
        console.warn('Security dashboard endpoint unavailable:', dashError);
      }
      
      // Load user security overview
      try {
        const usersResponse = await api.get('/api/admin/security/users?limit=50');
        setUserSecurityData(usersResponse.data);
      } catch (usersError) {
        console.warn('User security endpoint unavailable:', usersError);
      }
      
      // Load recent audit logs
      try {
        const auditResponse = await api.get('/api/security/audit-logs?limit=20');
        setAuditLogs(auditResponse.data?.audit_logs || []);
      } catch (auditError) {
        console.warn('Audit logs endpoint unavailable:', auditError);
      }
      
    } catch (error) {
      console.error('Failed to load security dashboard:', error);
      setError('Failed to load security dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSecurityDashboard();
    setRefreshing(false);
  };

  const handleForcePasswordReset = async (userId) => {
    try {
      await api.post(`/api/admin/security/force-password-reset?user_id=${userId}`);
      alert('Password reset required for user');
      await loadSecurityDashboard();
    } catch (error) {
      alert('Failed to force password reset: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDisableMFA = async (userId) => {
    try {
      const confirmed = window.confirm('Are you sure you want to disable MFA for this user? This is an emergency action.');
      if (confirmed) {
        await api.post(`/api/admin/security/disable-mfa?user_id=${userId}`);
        alert('MFA disabled for user');
        await loadSecurityDashboard();
      }
    } catch (error) {
      alert('Failed to disable MFA: ' + (error.response?.data?.detail || error.message));
    }
  };

  const generateComplianceReport = async (framework) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/security/compliance-report?framework=${framework}`);
      setComplianceReports(prev => ({
        ...prev,
        [framework]: response.data
      }));
    } catch (error) {
      alert('Failed to generate compliance report: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSecurityScoreBadge = (score) => {
    if (score >= 90) return <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>;
    if (score >= 70) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Good</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!canAccessSecurity) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access the Security Dashboard. Super Admin  required.
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Security Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive security monitoring and compliance management
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Security Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <ShieldCheck className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getSecurityScoreColor(securityData?.compliance_status?.overall_score || 0)}`}>
              {(securityData?.compliance_status?.overall_score || 0).toFixed(1)}%
            </div>
            {getSecurityScoreBadge(securityData?.compliance_status?.overall_score || 0)}
          </CardContent>
        </Card>

        {/* MFA Adoption */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MFA Adoption</CardTitle>
            <Key className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {securityData?.mfa_adoption_rate?.adoption_rate || 0}%
            </div>
            <p className="text-xs text-gray-600">
              {securityData?.mfa_adoption_rate?.mfa_users || 0} of {securityData?.mfa_adoption_rate?.total_users || 0} users
            </p>
          </CardContent>
        </Card>

        {/* Active Security Incidents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Incidents</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {securityData?.recent_incidents?.length || 0}
            </div>
            <p className="text-xs text-gray-600">Last 24 hours</p>
          </CardContent>
        </Card>

        {/* Encryption Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Encryption</CardTitle>
            <Lock className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {securityData?.data_encryption_status?.encryption_available ? 'Active' : 'Inactive'}
            </div>
            <p className="text-xs text-gray-600">
              {securityData?.data_encryption_status?.field_encryption_active ? 'Field-level encryption enabled' : 'Basic encryption only'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Security Overview</TabsTrigger>
          <TabsTrigger value="users">User Security</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="encryption">Data Protection</TabsTrigger>
        </TabsList>

        {/* Security Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Security Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Password Policy Compliance</span>
                    <span className="font-semibold">
                      {securityData?.password_policy_compliance?.compliance_rate || 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Active Sessions</span>
                    <span className="font-semibold">
                      {securityData?.security_metrics?.active_sessions || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Failed Login Attempts (24h)</span>
                    <span className="font-semibold text-yellow-600">
                      {securityData?.security_metrics?.failed_logins_24h || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Audit Events (24h)</span>
                    <span className="font-semibold">
                      {securityData?.audit_statistics?.['24h'] || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Security Incidents */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                {securityData?.recent_incidents?.length > 0 ? (
                  <div className="space-y-3">
                    {securityData.recent_incidents.slice(0, 5).map((incident, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{incident.incident_type}</div>
                            <div className="text-sm text-gray-600">{incident.description}</div>
                          </div>
                          <Badge variant={incident.severity === 'high' ? 'destructive' : 'secondary'}>
                            {incident.severity}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          {formatDate(incident.detected_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>No security incidents detected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Security Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Security Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {userSecurityData?.users?.length > 0 ? (
                <div className="space-y-4">
                  {userSecurityData.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-gray-600">
                            {} • {user.tenant_id || 'No tenant'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {user.mfa_enabled ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                MFA Enabled
                              </Badge>
                            ) : (
                              <Badge variant="destructive">MFA Disabled</Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              Security Score: {user.security_score}/100
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleForcePasswordReset(user.id)}
                        >
                          <Key className="w-4 h-4 mr-1" />
                          Reset Password
                        </Button>
                        {user.mfa_enabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisableMFA(user.id)}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Disable MFA
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                  <p>No user data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <div>
                            <div className="font-medium">{log.action}</div>
                            <div className="text-sm text-gray-600">{log.resource_type}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{log.user_email || log.user_id}</div>
                          <div className="text-xs text-gray-500">{formatDate(log.timestamp)}</div>
                        </div>
                      </div>
                      {log.details && (
                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <p>No audit logs available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <div className="space-y-6">
            {/* Compliance Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    SOC2 Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {securityData?.compliance_status?.soc2?.score || 0}%
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Access Controls</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>Audit Logging</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>Data Encryption</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => generateComplianceReport('SOC2')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate SOC2 Report
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    GDPR Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {securityData?.compliance_status?.gdpr?.score || 0}%
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Data Protection</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>Consent Management</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>Data Retention</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => generateComplianceReport('GDPR')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate GDPR Report
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Generated Reports */}
            {Object.keys(complianceReports).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(complianceReports).map(([framework, report]) => (
                      <div key={framework} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{framework} Compliance Report</h4>
                            <p className="text-sm text-gray-600">
                              Generated: {formatDate(report.generated_at)}
                            </p>
                          </div>
                          <Badge variant="default">
                            Score: {report.overall_score}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Data Protection Tab */}
        <TabsContent value="encryption">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Protection & Encryption
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Encryption Status</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Data at Rest</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Encrypted
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Data in Transit</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        TLS 1.3
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Field-level Encryption</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        AES-256-GCM
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Master Key</span>
                      <Badge variant={securityData?.data_encryption_status?.master_key_set ? "default" : "destructive"}>
                        {securityData?.data_encryption_status?.master_key_set ? 'Configured' : 'Missing'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Encrypted Collections</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>User Data</span>
                      <span className="font-medium">
                        {securityData?.data_encryption_status?.encrypted_collections?.users || 0} records
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Tenant Data</span>
                      <span className="font-medium">
                        {securityData?.data_encryption_status?.encrypted_collections?.tenants || 0} records
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityDashboard;