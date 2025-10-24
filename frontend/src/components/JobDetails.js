import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Tesseract from 'tesseract.js';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  Package, 
  MapPin, 
  Clock, 
  User,
  FileText,
  DollarSign,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Loader
} from "lucide-react";
import { useAuth, useOffline } from "../App";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline, addPendingAction } = useOffline();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  
  const [job, setJob] = useState(null);
  const [machine, setMachine] = useState(null);
  const [location, setLocation] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [notes, setNotes] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [selectedParts, setSelectedParts] = useState({});

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const jobRes = await axios.get(`${API}/jobs/${jobId}`);
      const jobData = jobRes.data;
      setJob(jobData);
      setNotes(jobData.tech_notes || '');

      // Fetch related data
      if (jobData.machine_id) {
        try {
          const machineRes = await axios.get(`${API}/machines/scan/${jobData.machine_id}`);
          setMachine(machineRes.data);
        } catch (error) {
          console.log('Machine not found');
        }
      }

      if (jobData.location_id) {
        try {
          const locationsRes = await axios.get(`${API}/locations`);
          const loc = locationsRes.data.find(l => l.id === jobData.location_id);
          setLocation(loc);
        } catch (error) {
          console.log('Location not found');
        }
      }

      // Fetch available parts
      const partsRes = await axios.get(`${API}/parts`);
      setParts(partsRes.data);
      
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file, type, description = '') => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('job_id', jobId);
      formData.append('file_type', type);
      formData.append('description', description);

      if (isOnline) {
        await axios.post(`${API}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Store for offline sync
        addPendingAction({
          method: 'POST',
          url: `${API}/upload`,
          data: formData
        });
      }

      // If it's an invoice, process with OCR
      if (type === 'invoice') {
        await processInvoiceOCR(file);
      }

      await fetchJobDetails(); // Refresh data
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const processInvoiceOCR = async (file) => {
    setProcessingOCR(true);
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log(m)
      });
      
      const text = result.data.text;
      
      // Simple regex patterns to extract cost information
      const patterns = [
        /total[:\s]*\$?([\d,]+\.?\d*)/i,
        /amount[:\s]*\$?([\d,]+\.?\d*)/i,
        /cost[:\s]*\$?([\d,]+\.?\d*)/i,
        /\$\s*([\d,]+\.?\d*)/g
      ];
      
      let extractedAmount = '';
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          extractedAmount = match[1] || match[0].replace('$', '');
          break;
        }
      }
      
      if (extractedAmount) {
        setInvoiceAmount(extractedAmount.replace(/,/g, ''));
      }
      
      // Update notes with OCR text
      setNotes(prev => prev + `\n\nOCR Extracted:\n${text}`);
      
    } catch (error) {
      console.error('OCR processing failed:', error);
    } finally {
      setProcessingOCR(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      alert('Camera access denied. Please allow camera permissions.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    canvas.toBlob(blob => {
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      handleFileUpload(file, 'photo', 'Job site photo');
    });
    
    // Stop camera
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
  };

  const handlePartSelection = (partId, quantity) => {
    setSelectedParts(prev => ({
      ...prev,
      [partId]: quantity
    }));
  };

  const handlePartsCheckout = async () => {
    const partsToCheckout = Object.entries(selectedParts)
      .filter(([_, quantity]) => quantity > 0)
      .map(([partId, quantity]) => ({
        part_id: partId,
        quantity: parseInt(quantity)
      }));

    if (partsToCheckout.length === 0) {
      alert('Please select parts to checkout.');
      return;
    }

    try {
      if (isOnline) {
        await axios.post(`${API}/tech/parts/checkout`, {
          job_id: jobId,
          parts: partsToCheckout
        });
      } else {
        addPendingAction({
          method: 'POST',
          url: `${API}/tech/parts/checkout`,
          data: { job_id: jobId, parts: partsToCheckout }
        });
      }
      
      alert('Parts checked out successfully!');
      setSelectedParts({});
    } catch (error) {
      console.error('Parts checkout failed:', error);
      alert('Parts checkout failed. Please try again.');
    }
  };

  const updateJobNotes = async () => {
    try {
      const updateData = {
        tech_notes: notes,
        invoice_total: invoiceAmount ? parseFloat(invoiceAmount) : null
      };

      if (isOnline) {
        await axios.put(`${API}/jobs/${jobId}`, updateData);
      } else {
        addPendingAction({
          method: 'PUT',
          url: `${API}/jobs/${jobId}`,
          data: updateData
        });
      }
      
      alert('Job notes updated successfully!');
    } catch (error) {
      console.error('Failed to update notes:', error);
      alert('Failed to update notes. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Job Not Found</h2>
          <p className="text-slate-600">The requested job could not be found.</p>
          <Button className="mt-4" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'urgent': 'bg-red-100 text-red-800',
      'high': 'bg-orange-100 text-orange-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

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
                <h1 className="text-lg font-bold text-slate-800">{job.title}</h1>
                <p className="text-sm text-slate-600">Job #{job.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(job.status)}>
                {job.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={getPriorityColor(job.priority)}>
                {job.priority.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="overview-tab">Overview</TabsTrigger>
            <TabsTrigger value="parts" data-testid="parts-tab">Parts</TabsTrigger>
            <TabsTrigger value="photos" data-testid="photos-tab">Photos</TabsTrigger>
            <TabsTrigger value="notes" data-testid="notes-tab">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Job Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Job Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-600">Type</Label>
                    <p className="font-medium text-slate-800">{job.job_type}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Priority</Label>
                    <p className="font-medium text-slate-800">{job.priority}</p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Estimated Duration</Label>
                    <p className="font-medium text-slate-800">
                      {job.estimated_duration ? `${job.estimated_duration} minutes` : 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-600">Created</Label>
                    <p className="font-medium text-slate-800">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {job.description && (
                  <div>
                    <Label className="text-slate-600">Description</Label>
                    <p className="text-slate-800">{job.description}</p>
                  </div>
                )}

                {job.required_skills && job.required_skills.length > 0 && (
                  <div>
                    <Label className="text-slate-600">Required Skills</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {job.required_skills.map((skill, index) => (
                        <Badge key={index} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Information */}
            {location && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Location Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <Label className="text-slate-600">Name</Label>
                      <p className="font-medium text-slate-800">{location.name}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Address</Label>
                      <p className="text-slate-800">
                        {location.address}, {location.city}, {location.state} {location.zip_code}
                      </p>
                    </div>
                    {location.contact_person && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-600">Contact Person</Label>
                          <p className="font-medium text-slate-800">{location.contact_person}</p>
                        </div>
                        <div>
                          <Label className="text-slate-600">Phone</Label>
                          <p className="font-medium text-slate-800">{location.contact_phone || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Machine Information */}
            {machine && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Machine Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-600">Serial Number</Label>
                      <p className="font-medium text-slate-800">{machine.serial_number}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Model</Label>
                      <p className="font-medium text-slate-800">{machine.model}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Manufacturer</Label>
                      <p className="font-medium text-slate-800">{machine.manufacturer}</p>
                    </div>
                    <div>
                      <Label className="text-slate-600">Status</Label>
                      <Badge className={machine.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {machine.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  {machine.last_maintenance && (
                    <div className="mt-4">
                      <Label className="text-slate-600">Last Maintenance</Label>
                      <p className="text-slate-800">
                        {new Date(machine.last_maintenance).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="parts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Parts Checkout
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {parts.length > 0 ? (
                  <>
                    {parts.slice(0, 10).map((part) => (
                      <div key={part.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-800">{part.name}</h4>
                          <p className="text-sm text-slate-600">Part #{part.part_number}</p>
                          <p className="text-sm text-slate-500">${part.unit_cost}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="10"
                            placeholder="Qty"
                            className="w-16"
                            value={selectedParts[part.id] || ''}
                            onChange={(e) => handlePartSelection(part.id, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      className="w-full"
                      onClick={handlePartsCheckout}
                      disabled={Object.values(selectedParts).every(qty => !qty || qty === '0')}
                    >
                      Checkout Selected Parts
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Parts Available</h3>
                    <p className="text-slate-600">No parts are currently available for checkout</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parts Used (if any) */}
            {job.parts_used && job.parts_used.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Parts Already Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {job.parts_used.map((partUsage, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-slate-800">Part: {partUsage.part_id.slice(0, 8)}</span>
                        <span className="text-slate-600">Qty: {partUsage.quantity_used}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Photo Documentation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={startCamera}
                    disabled={uploading}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </Button>
                </div>

                {/* Camera Preview */}
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-64 bg-black rounded-lg object-cover"
                    style={{ display: videoRef.current?.srcObject ? 'block' : 'none' }}
                  />
                  {videoRef.current?.srcObject && (
                    <Button
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                      onClick={capturePhoto}
                    >
                      Capture
                    </Button>
                  )}
                </div>

                {/* Upload Status */}
                {uploading && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}

                {processingOCR && (
                  <div className="flex items-center gap-2 text-purple-600">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Processing invoice with OCR...</span>
                  </div>
                )}

                {/* File Upload Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const type = file.type.includes('pdf') ? 'invoice' : 'photo';
                      handleFileUpload(file, type);
                    }
                  }}
                />

                {/* OCR Results */}
                {invoiceAmount && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">Invoice Amount Detected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <Input
                          value={invoiceAmount}
                          onChange={(e) => setInvoiceAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-32"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Existing Files */}
                {job.files && job.files.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-800 mb-3">Uploaded Files</h4>
                    <div className="space-y-2">
                      {job.files.map((file, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <FileText className="w-5 h-5 text-slate-600" />
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{file.file_type}</p>
                            <p className="text-sm text-slate-600">{file.description || 'No description'}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {new Date(file.uploaded_at).toLocaleDateString()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Job Notes & Invoice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="notes">Tech Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add your notes about this job..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="invoice">Invoice Total</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <DollarSign className="w-4 h-4 text-slate-600" />
                    <Input
                      id="invoice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      className="w-32"
                    />
                  </div>
                </div>

                <Button
                  onClick={updateJobNotes}
                  className="w-full"
                  disabled={!isOnline && !navigator.onLine}
                >
                  Save Notes & Invoice
                </Button>

                {/* Previous Notes */}
                {job.dispatch_notes && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Dispatch Notes</h4>
                      <p className="text-blue-700">{job.dispatch_notes}</p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default JobDetails;