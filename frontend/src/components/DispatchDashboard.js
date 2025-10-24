import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  MapPin, 
  Clock, 
  Package, 
  Send,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  Calendar,
  Truck,
  Filter,
  Search,
  RotateCcw
} from "lucide-react";
import { useAuth } from "../App";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DispatchDashboard = () => {
  const { user } = useAuth();
  
  const [jobs, setJobs] = useState([]);
  const [techs, setTechs] = useState([]);
  const [parts, setParts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, usersRes, partsRes, inventoryRes] = await Promise.all([
        axios.get(`${API}/jobs`),
        axios.get(`${API}/users`),
        axios.get(`${API}/parts`),
        axios.get(`${API}/inventory`)
      ]);
      
      setJobs(jobsRes.data);
      setTechs(usersRes.data.filter(u => u.role === 'tech' && u.is_active));
      setParts(partsRes.data);
      setInventory(inventoryRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelect = (jobId, checked) => {
    if (checked) {
      setSelectedJobs(prev => [...prev, jobId]);
    } else {
      setSelectedJobs(prev => prev.filter(id => id !== jobId));
    }
  };

  const handleBulkAssignment = async (techId) => {
    if (selectedJobs.length === 0) {
      alert('Please select at least one job to assign.');
      return;
    }

    setAssigning(true);
    try {
      const assignments = [{
        job_ids: selectedJobs,
        tech_id: techId,
        scheduled_date: new Date().toISOString()
      }];

      await axios.post(`${API}/jobs/bulk-approve`, { assignments });
      
      // Refresh data and clear selections
      await fetchData();
      setSelectedJobs([]);
      alert(`Successfully assigned ${selectedJobs.length} job(s) to technician.`);
    } catch (error) {
      console.error('Bulk assignment failed:', error);
      alert('Failed to assign jobs. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const getJobPriorityColor = (priority) => {
    const colors = {
      'urgent': 'bg-red-100 text-red-800 border-red-200',
      'high': 'bg-orange-100 text-orange-800 border-orange-200',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'low': 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-gray-100 text-gray-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'on_hold': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const JobCard = ({ job, onSelect, isSelected }) => {
    const tech = techs.find(t => t.id === job.assigned_tech_id);
    
    return (
      <Card className={`hover:shadow-md transition-all duration-200 ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect(job.id, checked)}
              className="mt-1"
              data-testid={`job-checkbox-${job.id}`}
            />
            
            <div className="flex-1 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{job.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{job.description}</p>
                </div>
                <div className="text-right">
                  <Badge className={`text-xs ${getJobPriorityColor(job.priority)}`}>
                    {job.priority.toUpperCase()}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-1">
                    {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'No date'}
                  </p>
                </div>
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Location: {job.location_id?.slice(0, 8) || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Type: {job.job_type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>Tech: {tech ? `${tech.first_name} ${tech.last_name}` : 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getStatusColor(job.status)}`}>
                    {job.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Required Skills */}
              {job.required_skills && job.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {job.required_skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end">
                <Link to={`/job/${job.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const TechCard = ({ tech }) => {
    const assignedJobs = jobs.filter(j => j.assigned_tech_id === tech.id);
    const activeJobs = assignedJobs.filter(j => j.status === 'in_progress').length;
    
    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-800">{tech.first_name} {tech.last_name}</h3>
              <p className="text-sm text-slate-600">{tech.email}</p>
            </div>
            <Badge variant={tech.is_active ? "default" : "secondary"}>
              {tech.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="font-medium text-blue-600">{assignedJobs.length}</p>
              <p className="text-slate-600">Total Jobs</p>
            </div>
            <div>
              <p className="font-medium text-purple-600">{activeJobs}</p>
              <p className="text-slate-600">Active</p>
            </div>
            <div>
              <p className="font-medium text-green-600">{assignedJobs.filter(j => j.status === 'completed').length}</p>
              <p className="text-slate-600">Completed</p>
            </div>
          </div>
          
          {tech.current_location && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Navigation className="w-4 h-4" />
              <span>Last seen: {new Date(tech.last_check_in || tech.last_login).toLocaleTimeString()}</span>
            </div>
          )}
          
          <div className="mt-3">
            <Button 
              size="sm" 
              className="w-full"
              onClick={() => handleBulkAssignment(tech.id)}
              disabled={selectedJobs.length === 0 || assigning}
            >
              Assign Selected Jobs ({selectedJobs.length})
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
          <p className="mt-2 text-slate-600">Loading dispatch dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const assignedJobs = jobs.filter(j => j.status === 'assigned');
  const inProgressJobs = jobs.filter(j => j.status === 'in_progress');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Dispatch Center</h1>
              <p className="text-sm text-slate-600">Manage job assignments and field operations</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedJobs.length > 0 && (
                <Badge variant="secondary">
                  {selectedJobs.length} job{selectedJobs.length > 1 ? 's' : ''} selected
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                data-testid="refresh-button"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full mx-auto mb-2">
                <Clock className="w-4 h-4 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-600">{pendingJobs.length}</p>
              <p className="text-sm text-slate-600">Pending</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mx-auto mb-2">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{assignedJobs.length}</p>
              <p className="text-sm text-slate-600">Assigned</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mx-auto mb-2">
                <Truck className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-600">{inProgressJobs.length}</p>
              <p className="text-sm text-slate-600">In Progress</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{completedJobs.length}</p>
              <p className="text-sm text-slate-600">Completed</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="queue" data-testid="queue-tab">Job Queue ({pendingJobs.length})</TabsTrigger>
            <TabsTrigger value="techs" data-testid="techs-tab">Field Techs ({techs.length})</TabsTrigger>
            <TabsTrigger value="active" data-testid="active-tab">Active Jobs ({inProgressJobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            {/* Bulk Actions */}
            {selectedJobs.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-800">
                        {selectedJobs.length} job{selectedJobs.length > 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => setSelectedJobs([])}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Jobs List */}
            <div className="space-y-3">
              {pendingJobs.length > 0 ? (
                pendingJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onSelect={handleJobSelect}
                    isSelected={selectedJobs.includes(job.id)}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Pending Jobs</h3>
                    <p className="text-slate-600">All jobs have been assigned to technicians</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="techs" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {techs.map((tech) => (
                <TechCard key={tech.id} tech={tech} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <div className="space-y-3">
              {inProgressJobs.length > 0 ? (
                inProgressJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onSelect={() => {}} // No selection for active jobs
                    isSelected={false}
                  />
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Truck className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Active Jobs</h3>
                    <p className="text-slate-600">No technicians are currently working on jobs</p>
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

export default DispatchDashboard;