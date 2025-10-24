import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Monitor, 
  ArrowLeft, 
  Wrench,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  BarChart3,
  QrCode,
  RefreshCw,
  Search
} from "lucide-react";
import { useAuth } from "../App";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AssetManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [assets, setAssets] = useState([]);
  const [assetAnalytics, setAssetAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const assetsResponse = await axios.get(`${API}/assets`);
      setAssets(assetsResponse.data);

      // Fetch analytics for machines
      const machineAssets = assetsResponse.data.filter(asset => asset.asset_type === 'machine');
      const analyticsPromises = machineAssets.map(async (asset) => {
        try {
          const response = await axios.get(`${API}/assets/${asset.id}/lifecycle`);
          return { [asset.id]: response.data };
        } catch (error) {
          return { [asset.id]: null };
        }
      });

      const analyticsResults = await Promise.all(analyticsPromises);
      const analyticsMap = analyticsResults.reduce((acc, result) => ({ ...acc, ...result }), {});
      setAssetAnalytics(analyticsMap);
    } catch (error) {
      console.error('Error fetching asset data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getAssetTypeIcon = (type) => {
    switch (type) {
      case 'machine':
        return <Monitor className="w-5 h-5" />;
      case 'part':
        return <Wrench className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'maintenance': 'bg-yellow-100 text-yellow-800',
      'broken': 'bg-red-100 text-red-800',
      'retired': 'bg-purple-100 text-purple-800',
      'rma': 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getReplacementPriority = (score) => {
    if (score >= 80) return { level: 'critical', color: 'bg-red-500 text-white' };
    if (score >= 60) return { level: 'high', color: 'bg-orange-500 text-white' };
    if (score >= 40) return { level: 'medium', color: 'bg-yellow-500 text-white' };
    return { level: 'low', color: 'bg-green-500 text-white' };
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchTerm || 
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_tag.coam_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || asset.asset_type === filterType;
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const AssetCard = ({ asset }) => {
    const analytics = assetAnalytics[asset.id];
    const replacementPriority = analytics ? getReplacementPriority(analytics.replacement_score) : null;
    
    return (
      <Card className="hover:shadow-md transition-shadow duration-200" data-testid="asset-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                {getAssetTypeIcon(asset.asset_type)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{asset.name}</h3>
                <p className="text-sm text-slate-600">ID: {asset.asset_tag.coam_id}</p>
                <p className="text-sm text-slate-600">Serial: {asset.serial_number}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={getStatusColor(asset.status)}>
                {asset.status.toUpperCase()}
              </Badge>
              {replacementPriority && (
                <Badge className={`mt-1 ml-0 ${replacementPriority.color} text-xs`}>
                  {replacementPriority.level} priority
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-slate-600">Model</p>
              <p className="font-medium text-slate-800">{asset.model || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Manufacturer</p>
              <p className="font-medium text-slate-800">{asset.manufacturer || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-600">Age (months)</p>
              <p className="font-medium text-slate-800">{analytics?.age_months || 0}</p>
            </div>
            <div>
              <p className="text-slate-600">Service Cost</p>
              <p className="font-medium text-slate-800">${analytics?.total_service_cost?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          {analytics && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Uptime</span>
                <span className="font-medium text-green-600">{analytics.uptime_percentage.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Replacement Score</span>
                <span className="font-medium text-slate-800">{analytics.replacement_score.toFixed(0)}/100</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Recommended Action</span>
                <span className="font-medium text-slate-800 capitalize">{analytics.recommended_action.replace('_', ' ')}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {asset.next_maintenance 
                  ? `Next: ${new Date(asset.next_maintenance).toLocaleDateString()}`
                  : 'No maintenance scheduled'
                }
              </span>
            </div>
            <div className="flex items-center gap-1">
              <QrCode className="w-4 h-4" />
              <span>{asset.asset_tag.qr_code}</span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1">
              <Wrench className="w-4 h-4 mr-2" />
              Schedule Maintenance
            </Button>
            <Button size="sm" variant="outline">
              <BarChart3 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading asset management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                data-testid="back-button"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Asset Management</h1>
                <p className="text-sm text-slate-600">Track machines, lifecycle, and maintenance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                disabled={refreshing}
                data-testid="refresh-button"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2">
                <Monitor className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{assets.length}</p>
              <p className="text-sm text-slate-600">Total Assets</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {assets.filter(a => a.status === 'active').length}
              </p>
              <p className="text-sm text-slate-600">Active</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full mx-auto mb-2">
                <Wrench className="w-4 h-4 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {assets.filter(a => a.status === 'maintenance').length}
              </p>
              <p className="text-sm text-slate-600">In Maintenance</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full mx-auto mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">
                {Object.values(assetAnalytics).filter(a => a && a.replacement_score >= 80).length}
              </p>
              <p className="text-sm text-slate-600">Need Replacement</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="assets" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assets" data-testid="assets-tab">Assets</TabsTrigger>
            <TabsTrigger value="lifecycle" data-testid="lifecycle-tab">Lifecycle Analytics</TabsTrigger>
            <TabsTrigger value="maintenance" data-testid="maintenance-tab">Maintenance Planning</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search assets by name, COAM ID, or serial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="asset-search"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40" data-testid="type-filter">
                  <SelectValue placeholder="Asset Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="machine">Machines</SelectItem>
                  <SelectItem value="part">Parts</SelectItem>
                  <SelectItem value="chair">Chairs</SelectItem>
                  <SelectItem value="game_board">Game Boards</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40" data-testid="status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="broken">Broken</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assets Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center">
                    <Monitor className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Assets Found</h3>
                    <p className="text-slate-600">No assets match your search criteria</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="lifecycle" className="space-y-4">
            <div className="grid gap-4">
              {Object.entries(assetAnalytics).filter(([_, analytics]) => analytics).map(([assetId, analytics]) => {
                const asset = assets.find(a => a.id === assetId);
                if (!asset) return null;

                return (
                  <Card key={assetId}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Monitor className="w-5 h-5" />
                        {asset.name} - Lifecycle Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{analytics.age_months}</p>
                          <p className="text-sm text-slate-600">Months Old</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{analytics.uptime_percentage.toFixed(1)}%</p>
                          <p className="text-sm text-slate-600">Uptime</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">${analytics.total_service_cost.toFixed(0)}</p>
                          <p className="text-sm text-slate-600">Service Cost</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{analytics.replacement_score.toFixed(0)}</p>
                          <p className="text-sm text-slate-600">Replace Score</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600">Recommended Action</p>
                          <p className="font-semibold text-slate-800 capitalize">
                            {analytics.recommended_action.replace('_', ' ')}
                          </p>
                        </div>
                        {analytics.predicted_failure_date && (
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Predicted Failure</p>
                            <p className="font-semibold text-red-600">
                              {new Date(analytics.predicted_failure_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <div className="grid gap-4">
              {assets.filter(asset => asset.next_maintenance).map(asset => (
                <Card key={asset.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-800">{asset.name}</h4>
                        <p className="text-sm text-slate-600">COAM ID: {asset.asset_tag.coam_id}</p>
                        <p className="text-sm text-slate-600">
                          Next Maintenance: {new Date(asset.next_maintenance).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          new Date(asset.next_maintenance) < new Date() 
                            ? 'bg-red-100 text-red-800'
                            : new Date(asset.next_maintenance) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }>
                          {new Date(asset.next_maintenance) < new Date() 
                            ? 'Overdue'
                            : new Date(asset.next_maintenance) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            ? 'Due Soon'
                            : 'Scheduled'
                          }
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssetManagement;