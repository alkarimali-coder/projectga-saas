import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  Truck,
  RefreshCw,
  Search,
  Filter,
  ArrowLeft,
  Warehouse,
  Boxes,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from "lucide-react";
import { useAuth } from "../App";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InventoryDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [dashboardStats, setDashboardStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [parts, setParts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [statsRes, inventoryRes, partsRes, alertsRes, movementsRes] = await Promise.all([
        axios.get(`${API}/inventory/dashboard`),
        axios.get(`${API}/inventory`),
        axios.get(`${API}/enhanced-parts`),
        axios.get(`${API}/inventory/alerts`),
        axios.get(`${API}/inventory/movements?limit=20`)
      ]);
      
      setDashboardStats(statsRes.data);
      setInventory(inventoryRes.data);
      setParts(partsRes.data);
      setAlerts(alertsRes.data);
      setMovements(movementsRes.data);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await axios.put(`${API}/inventory/alerts/${alertId}/acknowledge`);
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, is_acknowledged: true } : alert
      ));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const runStockCheck = async () => {
    try {
      const response = await axios.post(`${API}/inventory/alerts/check`);
      alert(`Stock check completed. ${response.data.alerts_generated} new alerts generated.`);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error running stock check:', error);
      alert('Failed to run stock check');
    }
  };

  const getLocationColor = (location) => {
    const colors = {
      'warehouse': 'bg-blue-100 text-blue-800',
      'truck': 'bg-green-100 text-green-800',
      'field': 'bg-orange-100 text-orange-800',
      'rma_facility': 'bg-purple-100 text-purple-800'
    };
    return colors[location] || 'bg-gray-100 text-gray-800';
  };

  const getAlertSeverityColor = (severity) => {
    const colors = {
      'critical': 'bg-red-500 text-white',
      'high': 'bg-red-100 text-red-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const filteredInventory = inventory.filter(item => {
    const part = parts.find(p => p.id === item.part_id);
    const matchesSearch = !searchTerm || 
      (part && part.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (part && part.part_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = filterLocation === 'all' || item.location === filterLocation;
    return matchesSearch && matchesLocation;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading inventory dashboard...</p>
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
                <h1 className="text-lg font-bold text-slate-800">Inventory Management</h1>
                <p className="text-sm text-slate-600">Track parts, assets, and stock levels</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runStockCheck}
                disabled={refreshing}
                data-testid="stock-check-button"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Stock Check
              </Button>
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
        {/* Dashboard Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{dashboardStats.total_parts}</p>
                <p className="text-sm text-slate-600">Total Parts</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">${dashboardStats.total_value.toLocaleString()}</p>
                <p className="text-sm text-slate-600">Total Value</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full mx-auto mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-600">{dashboardStats.low_stock_alerts}</p>
                <p className="text-sm text-slate-600">Low Stock</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mx-auto mb-2">
                  <Truck className="w-4 h-4 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-orange-600">{dashboardStats.trucks_needing_restock}</p>
                <p className="text-sm text-slate-600">Trucks Need Restock</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="inventory" data-testid="inventory-tab">Inventory</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="alerts-tab">
              Alerts {alerts.filter(a => !a.is_acknowledged).length > 0 && `(${alerts.filter(a => !a.is_acknowledged).length})`}
            </TabsTrigger>
            <TabsTrigger value="movements" data-testid="movements-tab">Movements</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="analytics-tab">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search parts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="inventory-search"
                />
              </div>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-48" data-testid="location-filter">
                  <SelectValue placeholder="Filter by location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="truck">Trucks</SelectItem>
                  <SelectItem value="field">Field</SelectItem>
                  <SelectItem value="rma_facility">RMA Facility</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inventory Grid */}
            <div className="grid gap-4">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => {
                  const part = parts.find(p => p.id === item.part_id);
                  const isLowStock = item.quantity_on_hand <= item.reorder_point;
                  
                  return (
                    <Card key={item.id} className={`hover:shadow-md transition-shadow ${isLowStock ? 'border-red-200 bg-red-50' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-800">{part?.name || 'Unknown Part'}</h3>
                            <p className="text-sm text-slate-600">Part #: {part?.part_number}</p>
                            <p className="text-sm text-slate-600">Category: {part?.category}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={getLocationColor(item.location)}>
                              {item.location.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {isLowStock && (
                              <Badge className="ml-2 bg-red-500 text-white">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-600">On Hand</p>
                            <p className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-slate-800'}`}>
                              {item.quantity_on_hand}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600">Available</p>
                            <p className="font-semibold text-slate-800">
                              {item.quantity_on_hand - (item.quantity_reserved || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600">Reorder Point</p>
                            <p className="font-semibold text-slate-800">{item.reorder_point}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-slate-600">
                            Unit Cost: ${item.cost_per_unit?.toFixed(2) || '0.00'}
                          </span>
                          <span className="font-semibold text-slate-800">
                            Total: ${(item.quantity_on_hand * (item.cost_per_unit || 0)).toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Inventory Items</h3>
                    <p className="text-slate-600">No inventory items match your search criteria</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <Card key={alert.id} className={`${alert.is_acknowledged ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <h3 className="font-semibold text-slate-800">{alert.title}</h3>
                            <Badge className={getAlertSeverityColor(alert.severity)}>
                              {alert.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-slate-600 mb-2">{alert.message}</p>
                          
                          {alert.current_quantity !== null && (
                            <div className="grid grid-cols-3 gap-4 text-sm text-slate-600">
                              <div>Current: {alert.current_quantity}</div>
                              <div>Reorder Point: {alert.reorder_point}</div>
                              <div>Suggested Order: {alert.suggested_reorder_quantity}</div>
                            </div>
                          )}
                          
                          <p className="text-xs text-slate-500 mt-2">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                        
                        {!alert.is_acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Active Alerts</h3>
                    <p className="text-slate-600">All inventory levels are within acceptable ranges</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            <div className="space-y-3">
              {movements.length > 0 ? (
                movements.map((movement) => {
                  const part = parts.find(p => p.id === movement.part_id);
                  
                  return (
                    <Card key={movement.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              movement.movement_type === 'IN' ? 'bg-green-500' :
                              movement.movement_type === 'OUT' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}></div>
                            <h4 className="font-semibold text-slate-800">
                              {movement.movement_type} - {part?.name || 'Unknown Part'}
                            </h4>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {movement.reference_type || 'Manual'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                          <div>
                            <p>Quantity: {movement.quantity}</p>
                          </div>
                          <div>
                            <p>Unit Cost: ${movement.unit_cost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p>Total: ${movement.total_cost.toFixed(2)}</p>
                          </div>
                          <div>
                            <p>{new Date(movement.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        
                        {movement.notes && (
                          <p className="text-sm text-slate-600 mt-2 italic">{movement.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Recent Movements</h3>
                    <p className="text-slate-600">No inventory movements recorded recently</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stock Status Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Normal Stock</span>
                      <span className="font-medium">
                        {inventory.filter(item => item.quantity_on_hand > item.reorder_point).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Low Stock</span>
                      <span className="font-medium text-orange-600">
                        {inventory.filter(item => item.quantity_on_hand <= item.reorder_point && item.quantity_on_hand > 0).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Out of Stock</span>
                      <span className="font-medium text-red-600">
                        {inventory.filter(item => item.quantity_on_hand === 0).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Location Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['warehouse', 'truck', 'field'].map(location => {
                      const locationItems = inventory.filter(item => item.location === location);
                      const locationValue = locationItems.reduce((sum, item) => 
                        sum + (item.quantity_on_hand * (item.cost_per_unit || 0)), 0
                      );
                      
                      return (
                        <div key={location} className="flex items-center justify-between">
                          <span className="text-slate-600 capitalize">{location.replace('_', ' ')}</span>
                          <div className="text-right">
                            <span className="font-medium">{locationItems.length} items</span>
                            <p className="text-sm text-slate-500">${locationValue.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default InventoryDashboard;