import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
    Bot, 
    Calendar, 
    Clock, 
    Package, 
    DollarSign,
    Wrench,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    Play,
    Settings,
    BarChart3,
    TrendingDown,
    TrendingUp,
    Bell
} from 'lucide-react';

const AutomationDashboard = ({ userRole }) => {
    const [stats, setStats] = useState(null);
    const [renewals, setRenewals] = useState([]);
    const [jobReposts, setJobReposts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [runningChecks, setRunningChecks] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    useEffect(() => {
        fetchAutomationStats();
        fetchRenewals();
        fetchJobReposts();
    }, []);

    const fetchAutomationStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/automation/stats`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            } else {
                throw new Error(`Failed to fetch automation stats: ${response.status}`);
            }
        } catch (err) {
            console.error('Error fetching automation stats:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchRenewals = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/renewals`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setRenewals(data.slice(0, 10)); // Show first 10
            }
        } catch (err) {
            console.error('Error fetching renewals:', err);
        }
    };

    const fetchJobReposts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/job-reposts?limit=10`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setJobReposts(data);
            }
        } catch (err) {
            console.error('Error fetching job reposts:', err);
        }
    };

    const runAutomationChecks = async () => {
        try {
            setRunningChecks(true);
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/automation/run-checks`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                // Refresh stats after running checks
                setTimeout(() => {
                    fetchAutomationStats();
                    fetchRenewals();
                    fetchJobReposts();
                }, 2000);
            } else {
                throw new Error('Failed to run automation checks');
            }
        } catch (err) {
            console.error('Error running automation checks:', err);
            setError(err.message);
        } finally {
            setRunningChecks(false);
        }
    };

    const approveJobRepost = async (repostId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/job-reposts/${repostId}/approve`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                // Refresh job reposts
                fetchJobReposts();
            } else {
                throw new Error('Failed to approve job repost');
            }
        } catch (err) {
            console.error('Error approving job repost:', err);
        }
    };

    const markRenewalCompleted = async (renewalId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/renewals/${renewalId}/complete`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                // Refresh renewals
                fetchRenewals();
                fetchAutomationStats();
            } else {
                throw new Error('Failed to mark renewal as completed');
            }
        } catch (err) {
            console.error('Error completing renewal:', err);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getDaysUntilExpiry = (expiryDate) => {
        const today = new Date();
        const expiry = new Date(expiryDate);
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getRenewalUrgency = (days) => {
        if (days < 0) return { color: 'text-red-600', bg: 'bg-red-50', label: 'Overdue' };
        if (days <= 7) return { color: 'text-red-500', bg: 'bg-red-50', label: 'Critical' };
        if (days <= 30) return { color: 'text-orange-500', bg: 'bg-orange-50', label: 'Urgent' };
        return { color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Upcoming' };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading automation dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert className="m-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    Error loading automation dashboard: {error}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center">
                    <Bot className="h-8 w-8 mr-3 text-blue-600" />
                    Automation & Alerts
                </h1>
                
                <div className="flex items-center space-x-3">
                    <Button
                        onClick={runAutomationChecks}
                        disabled={runningChecks}
                        className="flex items-center"
                    >
                        {runningChecks ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4 mr-2" />
                        )}
                        {runningChecks ? 'Running Checks...' : 'Run Automation Checks'}
                    </Button>
                    
                    <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-1" />
                        Settings
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Renewals</p>
                                    <p className="text-2xl font-bold">{stats.total_renewals}</p>
                                </div>
                                <Calendar className="h-8 w-8 text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                                    <p className="text-2xl font-bold text-orange-600">{stats.expiring_soon}</p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-orange-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Overdue Services</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.overdue_services}</p>
                                </div>
                                <Clock className="h-8 w-8 text-red-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Low Inventory</p>
                                    <p className="text-2xl font-bold text-yellow-600">{stats.low_inventory_items}</p>
                                </div>
                                <Package className="h-8 w-8 text-yellow-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Auto Reposts Today</p>
                                    <p className="text-2xl font-bold text-blue-600">{stats.auto_reposts_today}</p>
                                </div>
                                <RefreshCw className="h-8 w-8 text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                                    <p className="text-2xl font-bold text-purple-600">{stats.pending_approvals}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-purple-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs for Different Views */}
            <Tabs defaultValue="renewals" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="renewals">Renewals & Contracts</TabsTrigger>
                    <TabsTrigger value="reposts">Job Reposts</TabsTrigger>
                    <TabsTrigger value="alerts">System Alerts</TabsTrigger>
                </TabsList>

                <TabsContent value="renewals" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Calendar className="h-5 w-5 mr-2" />
                                Upcoming Renewals
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {renewals.length > 0 ? (
                                    renewals.map((renewal) => {
                                        const daysUntilExpiry = getDaysUntilExpiry(renewal.expiry_date);
                                        const urgency = getRenewalUrgency(daysUntilExpiry);
                                        
                                        return (
                                            <div key={renewal.id} className={`p-4 border rounded-lg ${urgency.bg}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3">
                                                            <h4 className="font-medium">{renewal.name}</h4>
                                                            <Badge variant="outline" className="text-xs">
                                                                {renewal.type}
                                                            </Badge>
                                                            <Badge className={`text-xs ${urgency.color}`}>
                                                                {urgency.label}
                                                            </Badge>
                                                        </div>
                                                        
                                                        <div className="mt-2 text-sm text-gray-600">
                                                            <span>Expires: {formatDate(renewal.expiry_date)}</span>
                                                            {daysUntilExpiry >= 0 ? (
                                                                <span className={`ml-3 ${urgency.color} font-medium`}>
                                                                    ({daysUntilExpiry} days remaining)
                                                                </span>
                                                            ) : (
                                                                <span className="ml-3 text-red-600 font-medium">
                                                                    ({Math.abs(daysUntilExpiry)} days overdue)
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {renewal.vendor_name && (
                                                            <div className="mt-1 text-xs text-gray-500">
                                                                Vendor: {renewal.vendor_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center space-x-2">
                                                        {renewal.cost && (
                                                            <span className="text-sm text-gray-600">
                                                                ${renewal.cost.toFixed(2)}
                                                            </span>
                                                        )}
                                                        
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => markRenewalCompleted(renewal.id)}
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Complete
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8">
                                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500">No renewals to display</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reposts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <RefreshCw className="h-5 w-5 mr-2" />
                                Failed Job Auto-Reposts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {jobReposts.length > 0 ? (
                                    jobReposts.map((repost) => (
                                        <div key={repost.id} className="p-4 border rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3">
                                                        <h4 className="font-medium">
                                                            Job #{repost.original_job_id.slice(0, 8)}
                                                        </h4>
                                                        <Badge 
                                                            variant={repost.repost_status === 'success' ? 'default' : 'destructive'}
                                                            className="text-xs"
                                                        >
                                                            {repost.repost_status}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                            {repost.action_taken}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="mt-2 text-sm text-gray-600">
                                                        <div>Failure Reason: {repost.failure_reason}</div>
                                                        <div>Failed: {formatDate(repost.failure_date)}</div>
                                                        {repost.suggested_parts && repost.suggested_parts.length > 0 && (
                                                            <div className="mt-1">
                                                                Suggested Parts: {repost.suggested_parts.map(p => p.name).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {repost.requires_approval && !repost.approved_at && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => approveJobRepost(repost.id)}
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Approve Repost
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500">No job reposts to display</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <TrendingDown className="h-5 w-5 mr-2 text-red-500" />
                                    Revenue Alerts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 mb-4">
                                    Automatic monitoring for revenue drops and cost increases
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm">Revenue Drop Threshold:</span>
                                        <span className="text-sm font-medium">15%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm">Cost Variance Threshold:</span>
                                        <span className="text-sm font-medium">20%</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Package className="h-5 w-5 mr-2 text-orange-500" />
                                    Inventory Alerts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 mb-4">
                                    Automatic alerts when inventory levels are low
                                </p>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm">Low Stock Threshold:</span>
                                        <span className="text-sm font-medium">5 items</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm">Critical Stock Threshold:</span>
                                        <span className="text-sm font-medium">2 items</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AutomationDashboard;