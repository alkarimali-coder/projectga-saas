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
  MapPin, 
  Clock, 
  User, 
  Package, 
  Camera,
  Navigation,
  Bell,
  Filter,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Search,
  QrCode,
  Truck,
  RefreshCw,
  DollarSign,
  PiggyBank,
  Bot,
  Settings,
  CreditCard
} from "lucide-react";
import { useAuth, useOffline } from "../App";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TechDashboard = () => {
  const { user } = useAuth();
  const { isOnline, addPendingAction } = useOffline();
  const navigate = useNavigate();
  
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [truckInventory, setTruckInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [jobsRes, notificationsRes, inventoryRes] = await Promise.all([
        axios.get(`${API}/jobs?assigned_tech_id=${user.id}`),
        axios.get(`${API}/notifications`),
        axios.get(`${API}/tech/truck-inventory`)
      ]);
      
      setJobs(jobsRes.data);
      setNotifications(notificationsRes.data.filter(n => !n.read).slice(0, 5));
      setTruckInventory(inventoryRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Load from cache if offline
      const cachedJobs = JSON.parse(localStorage.getItem('cachedJobs') || '[]');
      setJobs(cachedJobs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCheckIn = async (jobId) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        try {
          if (isOnline) {
            await axios.post(`${API}/tech/checkin`, {
              job_id: jobId,
              location,
              notes: ''
            });
          } else {
            // Queue for later sync
            addPendingAction({
              method: 'POST',
              url: `${API}/tech/checkin`,
              data: { job_id: jobId, location, notes: '' }
            });
          }
          
          // Update local state
          setJobs(prev => prev.map(job => 
            job.id === jobId 
              ? { ...job, status: 'in_progress', check_in: { location, timestamp: new Date() }}
              : job
          ));
          
        } catch (error) {
          console.error('Check-in failed:', error);
          alert('Check-in failed. Please try again.');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please enable location services.');
      }
    );
  };

  const handleCheckOut = async (jobId) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Check if job has parts used for auto-deduction
        const job = jobs.find(j => j.id === jobId);
        const useAutoDeduction = job && job.parts_used && job.parts_used.length > 0;

        try {
          if (isOnline) {
            if (useAutoDeduction) {
              // Use enhanced completion with auto-deduction
              await axios.post(`${API}/jobs/${jobId}/complete-with-parts`, {
                parts_used: job.parts_used,
                tech_notes: job.tech_notes || '',
                completion_location: location
              });
            } else {
              // Standard checkout
              await axios.post(`${API}/tech/checkout`, {
                job_id: jobId,
                location,
                notes: ''
              });
            }
          } else {
            addPendingAction({
              method: 'POST',
              url: useAutoDeduction ? `${API}/jobs/${jobId}/complete-with-parts` : `${API}/tech/checkout`,
              data: useAutoDeduction ? {
                parts_used: job.parts_used,
                tech_notes: job.tech_notes || '',
                completion_location: location
              } : { job_id: jobId, location, notes: '' }
            });
          }
          
          setJobs(prev => prev.map(job => 
            job.id === jobId 
              ? { ...job, status: 'completed', check_out: { location, timestamp: new Date() }}
              : job
          ));
          
          if (useAutoDeduction) {
            alert('Job completed! Parts have been automatically deducted from inventory.');
          }
          
        } catch (error) {
          console.error('Check-out failed:', error);
          alert('Check-out failed. Please try again.');
        }
      }
    );
  };

  const filteredJobs = jobs.filter(job => {
    const matchesFilter = filter === 'all' || job.status === filter || 
      (filter === 'urgent' && job.priority === 'urgent') ||
      (filter === 'today' && new Date(job.scheduled_date || job.created_at).toDateString() === new Date().toDateString());
    
    const matchesSearch = !searchTerm || 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'on_hold': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (priority === 'high') return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    return <Clock className="w-4 h-4 text-gray-500" />;
  };

  const JobCard = ({ job }) => (
    <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500" data-testid="job-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getPriorityIcon(job.priority)}
              <h3 className="font-semibold text-slate-800 truncate">{job.title}</h3>
            </div>
            <Badge className={`text-xs ${getStatusColor(job.status)}`}>
              {job.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">
              {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'No date'}
            </p>
          </div>
        </div>
        
        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{job.description}</p>
        
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>Location ID: {job.location_id}</span>
          </div>
          {job.machine_id && (
            <div className="flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              <span>Machine: {job.machine_id.slice(0, 8)}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Link to={`/job/${job.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          
          {job.status === 'assigned' && (
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleCheckIn(job.id)}
              disabled={!isOnline && !navigator.onLine}
            >
              Check In
            </Button>
          )}
          
          {job.status === 'in_progress' && (
            <Button 
              size="sm" 
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => handleCheckOut(job.id)}
            >
              Check Out
            </Button>
          )}
          
          {job.status === 'completed' && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const InventoryItem = ({ item }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
      <div className="flex items-center gap-3">
        <Package className="w-8 h-8 text-blue-600" />
        <div>
          <h4 className="font-medium text-slate-800">Part #{item.part_id.slice(0, 8)}</h4>
          <p className="text-sm text-slate-500">Available: {item.quantity}</p>
        </div>
      </div>
      <Badge variant={item.quantity > 5 ? "default" : "destructive"}>
        {item.quantity > 5 ? "In Stock" : "Low"}
      </Badge>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading dashboard...</p>
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
            <div>
              <h1 className="text-lg font-bold text-slate-800">Field Operations</h1>
              <p className="text-sm text-slate-600">Welcome back, {user.first_name}</p>
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
              <Link to="/notifications">
                <Button variant="ghost" size="sm" className="relative" data-testid="notifications-button">
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link to="/scanner">
                <Button variant="ghost" size="sm" data-testid="scanner-button">
                  <QrCode className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/inventory">
                <Button variant="ghost" size="sm" data-testid="inventory-button">
                  <Package className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/expenses">
                <Button variant="ghost" size="sm" data-testid="expenses-button">
                  <DollarSign className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/revenue">
                <Button variant="ghost" size="sm" data-testid="revenue-button">
                  <PiggyBank className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/notification-center">
                <Button variant="ghost" size="sm" data-testid="notifications-button">
                  <Bell className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/automation">
                <Button variant="ghost" size="sm" data-testid="automation-button">
                  <Bot className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/notification-settings">
                <Button variant="ghost" size="sm" data-testid="settings-button">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/billing">
                <Button variant="ghost" size="sm" data-testid="billing-button">
                  <CreditCard className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <Tabs defaultValue="jobs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="jobs" data-testid="jobs-tab">Jobs ({jobs.length})</TabsTrigger>
            <TabsTrigger value="inventory" data-testid="inventory-tab">Truck Inventory</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="notifications-tab">
              Notifications {notifications.length > 0 && `(${notifications.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="job-search-input"
                />
              </div>
              
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger data-testid="job-filter-select">
                  <SelectValue placeholder="Filter jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Job Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{jobs.filter(j => j.status === 'assigned').length}</p>
                  <p className="text-xs text-slate-600">Assigned</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">{jobs.filter(j => j.status === 'in_progress').length}</p>
                  <p className="text-xs text-slate-600">In Progress</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{jobs.filter(j => j.status === 'completed').length}</p>
                  <p className="text-xs text-slate-600">Completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Jobs List */}
            <div className="space-y-3">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Wrench className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Jobs Found</h3>
                    <p className="text-slate-600">No jobs match your current filter criteria</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="w-5 h-5" />
                  Truck Inventory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {truckInventory.length > 0 ? (
                  truckInventory.map((item) => (
                    <InventoryItem key={item.id} item={item} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Inventory Items</h3>
                    <p className="text-slate-600">Your truck inventory is empty</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="space-y-3">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <Card key={notification.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-800">{notification.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-slate-500 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No New Notifications</h3>
                    <p className="text-slate-600">You're all caught up!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TechDashboard;