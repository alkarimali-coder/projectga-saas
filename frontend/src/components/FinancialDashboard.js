import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, PieChart, FileText, AlertTriangle } from 'lucide-react';

const FinancialDashboard = ({ userRole }) => {
    const [financialData, setFinancialData] = useState(null);
    const [assetPerformance, setAssetPerformance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    useEffect(() => {
        fetchFinancialData();
        fetchAssetPerformance();
    }, [dateRange]);

    const fetchFinancialData = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/financial/dashboard?period_start=${dateRange.start}&period_end=${dateRange.end}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setFinancialData(data);
            } else {
                throw new Error(`Failed to fetch financial data: ${response.status}`);
            }
        } catch (err) {
            console.error('Error fetching financial data:', err);
            setError(err.message);
        }
    };

    const fetchAssetPerformance = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/financial/asset-performance?period_start=${dateRange.start}&period_end=${dateRange.end}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setAssetPerformance(data);
            } else {
                console.warn('Could not fetch asset performance data');
            }
        } catch (err) {
            console.warn('Error fetching asset performance:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const formatPercent = (percent) => {
        return `${(percent || 0).toFixed(2)}%`;
    };

    const getPerformanceColor = (category) => {
        switch (category) {
            case 'top': return 'text-green-600 bg-green-50';
            case 'average': return 'text-yellow-600 bg-yellow-50';
            case 'underperforming': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getTrendIcon = (growth) => {
        if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
        if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    };

    const downloadReport = async (reportType, format) => {
        try {
            const token = localStorage.getItem('token');
            const url = `${backendUrl}/api/financial/reports/${reportType}?period_start=${dateRange.start}&period_end=${dateRange.end}&format=${format}`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `${reportType}_report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
                
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch) {
                        filename = filenameMatch[1];
                    }
                }

                const url_obj = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url_obj;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url_obj);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to generate report');
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            setError(`Failed to download ${reportType} report: ${error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading financial data...</div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert className="m-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    Error loading financial data: {error}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Financial Dashboard</h1>
                
                {/* Date Range Selector */}
                <div className="flex items-center space-x-2">
                    <label>Period:</label>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        className="px-3 py-1 border rounded"
                    />
                    <span>to</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        className="px-3 py-1 border rounded"
                    />
                    <Button onClick={() => {
                        fetchFinancialData();
                        fetchAssetPerformance();
                    }} size="sm">
                        Update
                    </Button>
                </div>
            </div>

            {/* Key Metrics Cards */}
            {financialData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(financialData.total_revenue)}</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                {getTrendIcon(financialData.revenue_growth)}
                                <span className="ml-1">{formatPercent(financialData.revenue_growth)} from last period</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(financialData.total_expenses)}</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                {getTrendIcon(financialData.expense_growth)}
                                <span className="ml-1">{formatPercent(financialData.expense_growth)} from last period</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(financialData.net_profit)}</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                {getTrendIcon(financialData.profit_growth)}
                                <span className="ml-1">{formatPercent(financialData.profit_growth)} from last period</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                            <PieChart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatPercent(financialData.profit_margin)}</div>
                            <div className="text-xs text-muted-foreground">
                                Revenue per machine: {formatCurrency(financialData.revenue_per_machine)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Alerts and Insights */}
            {financialData && (financialData.financial_alerts?.length > 0 || financialData.key_insights?.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {financialData.financial_alerts?.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center">
                                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                                    Financial Alerts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {financialData.financial_alerts.map((alert, index) => (
                                        <Alert key={index} className="border-red-200 bg-red-50">
                                            <AlertDescription>{alert}</AlertDescription>
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {financialData.key_insights?.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center">
                                    <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                                    Key Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {financialData.key_insights.map((insight, index) => (
                                        <div key={index} className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                                            {insight}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            <Tabs defaultValue="performance" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="performance">Asset Performance</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Asset Performance Analytics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {assetPerformance.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {assetPerformance.slice(0, 6).map((asset) => (
                                            <Card key={asset.asset_id} className="border">
                                                <CardContent className="pt-4">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-medium">{asset.asset_name}</h4>
                                                            <span className={`px-2 py-1 text-xs rounded-full ${getPerformanceColor(asset.performance_category)}`}>
                                                                {asset.performance_category}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            COAM ID: {asset.coam_id}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            Location: {asset.location_name}
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                                            <div>
                                                                <div className="text-gray-500">Revenue</div>
                                                                <div className="font-medium">{formatCurrency(asset.total_revenue)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-gray-500">ROI</div>
                                                                <div className="font-medium">{formatPercent(asset.roi_percentage)}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Rank: #{asset.performance_rank} | {formatCurrency(asset.revenue_per_day)}/day
                                                        </div>
                                                        {asset.optimization_suggestions?.length > 0 && (
                                                            <div className="mt-2">
                                                                <div className="text-xs font-medium text-blue-600 mb-1">Suggestions:</div>
                                                                {asset.optimization_suggestions.slice(0, 1).map((suggestion, idx) => (
                                                                    <div key={idx} className="text-xs text-blue-600 bg-blue-50 p-1 rounded">
                                                                        {suggestion}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                    
                                    {assetPerformance.length > 6 && (
                                        <div className="text-center">
                                            <Button variant="outline">
                                                View All {assetPerformance.length} Assets
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    No asset performance data available for this period
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Financial Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Button 
                                        className="w-full h-16 flex flex-col items-center justify-center"
                                        onClick={() => downloadReport('profit-loss', 'excel')}
                                    >
                                        <FileText className="h-5 w-5 mb-1" />
                                        P&L Report (Excel)
                                    </Button>
                                    <Button 
                                        variant="outline"
                                        className="w-full h-10 text-sm"
                                        onClick={() => downloadReport('profit-loss', 'pdf')}
                                    >
                                        PDF Version
                                    </Button>
                                </div>
                                
                                <Button 
                                    variant="outline" 
                                    className="h-20 flex flex-col items-center justify-center"
                                    onClick={() => downloadReport('expense-report', 'excel')}
                                >
                                    <PieChart className="h-6 w-6 mb-2" />
                                    Expense Report
                                </Button>
                                
                                <Button 
                                    variant="outline" 
                                    className="h-20 flex flex-col items-center justify-center"
                                    onClick={() => downloadReport('revenue-analysis', 'excel')}
                                >
                                    <TrendingUp className="h-6 w-6 mb-2" />
                                    Revenue Analysis
                                </Button>
                                
                                <Button 
                                    variant="outline" 
                                    className="h-20 flex flex-col items-center justify-center"
                                    onClick={() => downloadReport('commission-report', 'excel')}
                                >
                                    <DollarSign className="h-6 w-6 mb-2" />
                                    Commission Report
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default FinancialDashboard;