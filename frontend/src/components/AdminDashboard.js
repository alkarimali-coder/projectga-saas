import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Users, 
  MapPin, 
  Settings, 
  Monitor,
  LogOut,
  Shield,
  Activity,
  BarChart3,
  Calendar,
  Clock,
  Package
} from "lucide-react";
import { useAuth } from "../App";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dashboardResponse, jobsResponse] = await Promise.all([
        axios.get(`${API}/admin/dashboard`),
        axios.get(`${API}/jobs`)
      ]);
      
      setStats(dashboardResponse.data);
      setRecentJobs(jobsResponse.data.slice(0, 10));

      // Only fetch tenants if super admin
      if (user.role === 'super_admin') {
        const tenantsResponse = await axios.get(`${API}/tenants`);
        setTenants(tenantsResponse.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = "blue", description }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 font-medium">{title}</p>
            <p className={`text-3xl font-bold text-${color}-600 mt-1`}>
              {value || 0}
            </p>
            {description && (
              <p className="text-xs text-slate-500 mt-1">{description}</p>
            )}
          </div>
          <div className={`p-3 bg-${color}-100 rounded-full`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const TenantCard = ({ tenant }) => (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">{tenant.name}</h3>
          <Badge variant={tenant.is_active ? "default" : "secondary"}>
            {tenant.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <p><strong>Company:</strong> {tenant.company_name}</p>
          <p><strong>Email:</strong> {tenant.contact_email}</p>
          <p><strong>License:</strong> {tenant.license_number || 'N/A'}</p>
          <p><strong>Created:</strong> {new Date(tenant.created_at).toLocaleDateString()}</p>
        </div>
      </CardContent>
    </Card>
  );

  const JobCard = ({ job }) => {
    const getStatusColor = (status) => {
      const colors = {
        'pending': 'bg-yellow-100 text-yellow-800',
        'assigned': 'bg-blue-100 text-blue-800',
        'in_progress': 'bg-purple-100 text-purple-800',
        'completed': 'bg-green-100 text-green-800'
      };
      return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-slate-800 truncate">{job.title}</h3>
            <Badge className={`text-xs ${getStatusColor(job.status)} ml-2`}>
              {job.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{job.description}</p>
          
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(job.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{job.job_type}</span>
            </div>
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
          <p className="mt-2 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">COAM SaaS Platform</h1>
                <p className="text-sm text-slate-600">
                  {user.role === 'super_admin' ? 'System Administration' : 'Tenant Management'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-600">
                Welcome, <span className="font-medium">{user?.first_name} {user?.last_name}</span>
              </div>
              <Badge variant="outline" className="capitalize">
                {user?.role?.replace('_', ' ')}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logout}
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {user.role === 'super_admin' ? 'System Overview' : 'Operations Dashboard'}
          </h2>
          <p className="text-slate-600">
            {user.role === 'super_admin' ? 'Monitor system-wide operations' : 'Monitor your COAM operations'}
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-96">
            <TabsTrigger value="dashboard" data-testid="dashboard-tab">Dashboard</TabsTrigger>
            <TabsTrigger value="jobs" data-testid="jobs-tab">Recent Jobs</TabsTrigger>
            {user.role === 'super_admin' && (
              <TabsTrigger value="tenants" data-testid="tenants-tab">Tenants</TabsTrigger>
            )}
            <TabsTrigger value="system" data-testid="system-tab">System</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {user.role === 'super_admin' ? (
                <>
                  <StatCard 
                    title="Total Tenants" 
                    value={stats?.total_tenants} 
                    icon={Building2}
                    color="blue"
                    description="Active master licensees"
                  />
                  <StatCard 
                    title="Total Users" 
                    value={stats?.total_users} 
                    icon={Users}
                    color="green"
                    description="System-wide users"
                  />
                  <StatCard 
                    title="Total Machines" 
                    value={stats?.total_machines} 
                    icon={Monitor}
                    color="purple"
                    description="All COAM machines"
                  />
                  <StatCard 
                    title="Recent Logins" 
                    value={stats?.recent_logins} 
                    icon={Activity}
                    color="orange"
                    description="Last 24 hours"
                  />
                </>
              ) : (
                <>
                  <StatCard 
                    title="Total Jobs" 
                    value={stats?.total_jobs} 
                    icon={BarChart3}
                    color="blue"
                    description="All time"
                  />
                  <StatCard 
                    title="Pending Jobs" 
                    value={stats?.pending_jobs} 
                    icon={Clock}
                    color="orange"
                    description="Awaiting assignment"
                  />
                  <StatCard 
                    title="Active Jobs" 
                    value={stats?.in_progress_jobs} 
                    icon={Activity}
                    color="purple"
                    description="Currently in progress"
                  />
                  <StatCard 
                    title="Active Techs" 
                    value={stats?.active_techs} 
                    icon={Users}
                    color="green"
                    description="Field technicians"
                  />
                </>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {user.role === 'ml_admin' ? (
                    <>
                      <Link to="/dispatch" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Calendar className="w-4 h-4 mr-2" />
                          Dispatch Center
                        </Button>
                      </Link>
                      <Link to="/jobs/create" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Users className="w-4 h-4 mr-2" />
                          Create Job
                        </Button>
                      </Link>
                      <Link to="/inventory" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Package className="w-4 h-4 mr-2" />
                          Inventory Management
                        </Button>
                      </Link>
                      <Link to="/assets" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Monitor className="w-4 h-4 mr-2" />
                          Asset Management
                        </Button>
                      </Link>
                      <Link to="/rma" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Package className="w-4 h-4 mr-2" />
                          RMA & Vendor
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to="/users" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Users className="w-4 h-4 mr-2" />
                          Manage Users
                        </Button>
                      </Link>
                      <Link to="/tenants/create" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Building2 className="w-4 h-4 mr-2" />
                          Add Tenant
                        </Button>
                      </Link>
                      <Link to="/system/logs" className="block">
                        <Button variant="outline" className="w-full justify-start">
                          <Activity className="w-4 h-4 mr-2" />
                          System Logs
                        </Button>
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Platform Status</span>
                      <Badge variant="default">Operational</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Database</span>
                      <Badge variant="default">Connected</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">API Services</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Last Backup</span>
                      <span className="text-slate-600 text-sm">2 hours ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Recent Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentJobs.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recentJobs.map((job) => (
                      <JobCard key={job.id} job={job} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Recent Jobs</h3>
                    <p className="text-slate-600">No jobs have been created yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {user.role === 'super_admin' && (
            <TabsContent value="tenants" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Master Licensees</h3>
                <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-tenant-button">
                  <Building2 className="w-4 h-4 mr-2" />
                  Add Tenant
                </Button>
              </div>

              {tenants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tenants.map((tenant) => (
                    <TenantCard key={tenant.id} tenant={tenant} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Tenants Yet</h3>
                    <p className="text-slate-600">Create your first Master Licensee to get started</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-600">Platform Version</label>
                    <p className="font-medium">v1.0.0</p>
                  </div>
                  <div>
                    <label className="text-slate-600">Environment</label>
                    <p className="font-medium">Development</p>
                  </div>
                  <div>
                    <label className="text-slate-600">Database</label>
                    <p className="font-medium">MongoDB</p>
                  </div>
                  <div>
                    <label className="text-slate-600">Multi-Tenant</label>
                    <Badge variant="default">Enabled</Badge>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <label className="text-slate-600">Security Features</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span>JWT Authentication</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Role-Based Access Control</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Audit Logging</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>MFA Support</span>
                      <Badge variant="default">Available</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Offline Support</span>
                      <Badge variant="default">Active</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;