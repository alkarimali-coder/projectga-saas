import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Package, 
  RefreshCw,
  Plus,
  Truck,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  DollarSign
} from "lucide-react";
import { useAuth } from "../App";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RMAManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [rmas, setRmas] = useState([]);
  const [parts, setParts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorPickups, setVendorPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateRMA, setShowCreateRMA] = useState(false);
  const [showCreatePickup, setShowCreatePickup] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [rmaRes, partsRes, vendorsRes, pickupsRes] = await Promise.all([
        axios.get(`${API}/rma`),
        axios.get(`${API}/enhanced-parts`),
        axios.get(`${API}/vendors`),
        axios.get(`${API}/vendor-pickups`)
      ]);
      
      setRmas(rmaRes.data);
      setParts(partsRes.data);
      setVendors(vendorsRes.data);
      setVendorPickups(pickupsRes.data);
    } catch (error) {
      console.error('Error fetching RMA data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'initiated': 'bg-blue-100 text-blue-800',
      'approved': 'bg-green-100 text-green-800',
      'shipped': 'bg-purple-100 text-purple-800',
      'received': 'bg-yellow-100 text-yellow-800',
      'under_repair': 'bg-orange-100 text-orange-800',
      'repaired': 'bg-green-100 text-green-800',
      'replaced': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'returned': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPickupStatusColor = (status) => {
    const colors = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'en_route': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const updateRMAStatus = async (rmaId, newStatus, additionalData = {}) => {
    try {
      const response = await axios.put(`${API}/rma/${rmaId}/status`, {
        rma_id: rmaId,
        new_status: newStatus,
        ...additionalData
      });
      
      setRmas(prev => prev.map(rma => 
        rma.id === rmaId ? response.data : rma
      ));
      
      alert(`RMA status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating RMA status:', error);
      alert('Failed to update RMA status');
    }
  };

  const updatePickupStatus = async (pickupId, newStatus, additionalData = {}) => {
    try {
      const response = await axios.put(`${API}/vendor-pickups/${pickupId}/status`, {
        status: newStatus,
        ...additionalData
      });
      
      setVendorPickups(prev => prev.map(pickup => 
        pickup.id === pickupId ? response.data : pickup
      ));
      
      alert(`Pickup status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating pickup status:', error);
      alert('Failed to update pickup status');
    }
  };

  const CreateRMADialog = () => {
    const [formData, setFormData] = useState({
      supplier: '',
      reason_summary: '',
      items: [],
      job_id: '',
      repost_job: false
    });

    const [newItem, setNewItem] = useState({
      part_id: '',
      quantity: 1,
      reason: '',
      condition: 'defective'
    });

    const addItem = () => {
      if (newItem.part_id && newItem.reason) {
        setFormData(prev => ({
          ...prev,
          items: [...prev.items, { ...newItem }]
        }));
        setNewItem({ part_id: '', quantity: 1, reason: '', condition: 'defective' });
      }
    };

    const removeItem = (index) => {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    };

    const submitRMA = async () => {
      try {
        await axios.post(`${API}/rma`, formData);
        setShowCreateRMA(false);
        fetchData();
        alert('RMA created successfully');
      } catch (error) {
        console.error('Error creating RMA:', error);
        alert('Failed to create RMA');
      }
    };

    return (
      <Dialog open={showCreateRMA} onOpenChange={setShowCreateRMA}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New RMA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Supplier</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <Label>Related Job ID (Optional)</Label>
                <Input
                  value={formData.job_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, job_id: e.target.value }))}
                  placeholder="Job ID"
                />
              </div>
            </div>

            <div>
              <Label>Reason Summary</Label>
              <Textarea
                value={formData.reason_summary}
                onChange={(e) => setFormData(prev => ({ ...prev, reason_summary: e.target.value }))}
                placeholder="Describe the reason for the RMA"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.repost_job}
                  onChange={(e) => setFormData(prev => ({ ...prev, repost_job: e.target.checked }))}
                />
                Auto-repost job when RMA is approved
              </Label>
            </div>

            <div className="border-t pt-4">
              <Label>Add Items</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <Select value={newItem.part_id} onValueChange={(value) => setNewItem(prev => ({ ...prev, part_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select part" />
                  </SelectTrigger>
                  <SelectContent>
                    {parts.map(part => (
                      <SelectItem key={part.id} value={part.id}>
                        {part.name} ({part.part_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                  placeholder="Qty"
                />
                <Select value={newItem.condition} onValueChange={(value) => setNewItem(prev => ({ ...prev, condition: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defective">Defective</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="wrong_part">Wrong Part</SelectItem>
                    <SelectItem value="excess">Excess</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addItem} size="sm">Add</Button>
              </div>
              <Input
                className="mt-2"
                value={newItem.reason}
                onChange={(e) => setNewItem(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for return"
              />
            </div>

            {formData.items.length > 0 && (
              <div>
                <Label>Items to Return</Label>
                <div className="space-y-2 mt-2">
                  {formData.items.map((item, index) => {
                    const part = parts.find(p => p.id === item.part_id);
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <span>{part?.name} (Qty: {item.quantity}) - {item.condition}</span>
                        <Button size="sm" variant="outline" onClick={() => removeItem(index)}>
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateRMA(false)}>
                Cancel
              </Button>
              <Button onClick={submitRMA} disabled={!formData.supplier || !formData.reason_summary || formData.items.length === 0}>
                Create RMA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const RMACard = ({ rma }) => (
    <Card className="hover:shadow-md transition-shadow duration-200" data-testid="rma-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-800">RMA {rma.rma_number}</h3>
            <p className="text-sm text-slate-600">Supplier: {rma.supplier}</p>
            <p className="text-sm text-slate-600">Created: {new Date(rma.created_at).toLocaleDateString()}</p>
          </div>
          <Badge className={getStatusColor(rma.status)}>
            {rma.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        <p className="text-sm text-slate-700 mb-3">{rma.reason_summary}</p>

        <div className="space-y-2 mb-4">
          <Label className="text-xs font-medium text-slate-600">ITEMS ({rma.items.length})</Label>
          {rma.items.map((item, index) => {
            const part = parts.find(p => p.id === item.part_id);
            return (
              <div key={index} className="flex items-center justify-between text-sm">
                <span>{part?.name || 'Unknown Part'}</span>
                <span>Qty: {item.quantity}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
          <span>Total Value: ${rma.total_value.toFixed(2)}</span>
          {rma.tracking_number && (
            <span>Tracking: {rma.tracking_number}</span>
          )}
        </div>

        {user.role !== 'tech' && (
          <div className="flex gap-2">
            {rma.status === 'initiated' && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 flex-1"
                  onClick={() => updateRMAStatus(rma.id, 'approved')}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 flex-1"
                  onClick={() => updateRMAStatus(rma.id, 'rejected')}
                >
                  Reject
                </Button>
              </>
            )}
            {rma.status === 'approved' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const tracking = prompt('Enter tracking number:');
                  if (tracking) {
                    updateRMAStatus(rma.id, 'shipped', { tracking_number: tracking });
                  }
                }}
              >
                Mark as Shipped
              </Button>
            )}
            {rma.status === 'under_repair' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => updateRMAStatus(rma.id, 'repaired')}
              >
                Mark as Repaired
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const PickupCard = ({ pickup }) => (
    <Card className="hover:shadow-md transition-shadow duration-200" data-testid="pickup-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-800">Pickup {pickup.pickup_number}</h3>
            <p className="text-sm text-slate-600">
              Vendor: {vendors.find(v => v.id === pickup.vendor_id)?.name || 'Unknown'}
            </p>
            <p className="text-sm text-slate-600">
              Scheduled: {new Date(pickup.scheduled_date).toLocaleDateString()}
            </p>
          </div>
          <Badge className={getPickupStatusColor(pickup.status)}>
            {pickup.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-slate-600">Contact: {pickup.contact_person}</p>
            <p className="text-slate-600">Phone: {pickup.contact_phone}</p>
          </div>
          <div>
            <p className="text-slate-600">Estimated Value: ${pickup.estimated_value.toFixed(2)}</p>
            {pickup.actual_cost && (
              <p className="text-slate-600">Actual Cost: ${pickup.actual_cost.toFixed(2)}</p>
            )}
          </div>
        </div>

        {pickup.items_for_pickup.length > 0 && (
          <div className="mb-4">
            <Label className="text-xs font-medium text-slate-600">ITEMS ({pickup.items_for_pickup.length})</Label>
            {pickup.items_for_pickup.slice(0, 2).map((item, index) => (
              <div key={index} className="text-sm text-slate-700">
                {item.description || `Item ${index + 1}`} (Qty: {item.quantity})
              </div>
            ))}
            {pickup.items_for_pickup.length > 2 && (
              <p className="text-xs text-slate-500">+{pickup.items_for_pickup.length - 2} more items</p>
            )}
          </div>
        )}

        {user.role !== 'tech' && (
          <div className="flex gap-2">
            {pickup.status === 'scheduled' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => updatePickupStatus(pickup.id, 'en_route')}
              >
                Mark En Route
              </Button>
            )}
            {pickup.status === 'en_route' && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 flex-1"
                onClick={() => {
                  const cost = prompt('Enter actual cost:');
                  if (cost) {
                    updatePickupStatus(pickup.id, 'completed', { 
                      actual_cost: parseFloat(cost),
                      cost_verified: true,
                      actual_pickup_date: new Date().toISOString()
                    });
                  }
                }}
              >
                Complete Pickup
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading RMA management...</p>
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
                <h1 className="text-lg font-bold text-slate-800">RMA & Vendor Management</h1>
                <p className="text-sm text-slate-600">Manage returns, repairs, and vendor pickups</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateRMA(true)}
                data-testid="create-rma-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                New RMA
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
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{rmas.length}</p>
              <p className="text-sm text-slate-600">Total RMAs</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full mx-auto mb-2">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {rmas.filter(r => ['initiated', 'approved', 'shipped'].includes(r.status)).length}
              </p>
              <p className="text-sm text-slate-600">Pending</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {rmas.filter(r => ['repaired', 'replaced', 'returned'].includes(r.status)).length}
              </p>
              <p className="text-sm text-slate-600">Resolved</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mx-auto mb-2">
                <Truck className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {vendorPickups.filter(p => ['scheduled', 'en_route'].includes(p.status)).length}
              </p>
              <p className="text-sm text-slate-600">Active Pickups</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rmas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rmas" data-testid="rmas-tab">
              RMAs ({rmas.length})
            </TabsTrigger>
            <TabsTrigger value="pickups" data-testid="pickups-tab">
              Vendor Pickups ({vendorPickups.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rmas" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rmas.length > 0 ? (
                rmas.map((rma) => (
                  <RMACard key={rma.id} rma={rma} />
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center">
                    <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No RMAs</h3>
                    <p className="text-slate-600">No return merchandise authorizations have been created</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="pickups" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vendorPickups.length > 0 ? (
                vendorPickups.map((pickup) => (
                  <PickupCard key={pickup.id} pickup={pickup} />
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center">
                    <Truck className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Vendor Pickups</h3>
                    <p className="text-slate-600">No vendor pickups have been scheduled</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateRMADialog />
    </div>
  );
};

export default RMAManagement;