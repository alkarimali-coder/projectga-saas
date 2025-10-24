// ML Tenant Provisioning Form
// Easy provisioning for new ML accounts with specialized configuration

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertDescription } from './ui/alert';
import {
  Bot,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Settings,
  Cpu,
  Database,
  BarChart3,
  Zap,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MLProvisioningForm = ({ onSuccess, token }) => {
  const [formData, setFormData] = useState({
    // Company Information
    company_name: '',
    website: '',
    business_type: 'ml_analytics',
    
    // Admin User Information
    admin_email: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_phone: '',
    
    // Address Information
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    
    // ML-Specific Configuration
    ml_features: [],
    expected_machine_count: 10,
    data_retention_days: 365,
    
    // Subscription Configuration
    subscription_plan: 'professional',
    
    // Setup Options
    send_welcome_email: true,
    setup_sample_data: false,
    enable_api_access: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState(1);

  // Create API instance
  const api = axios.create({
    baseURL: BACKEND_URL,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const mlFeatureOptions = [
    { id: 'predictive_modeling', label: 'Predictive Modeling', description: 'Build and deploy predictive models' },
    { id: 'advanced_analytics', label: 'Advanced Analytics', description: 'Complex data analysis and insights' },
    { id: 'custom_algorithms', label: 'Custom Algorithms', description: 'Deploy custom ML algorithms' },
    { id: 'real_time_processing', label: 'Real-time Processing', description: 'Real-time data processing and predictions' },
    { id: 'data_visualization', label: 'Data Visualization', description: 'Advanced charting and visualization tools' },
    { id: 'automated_insights', label: 'Automated Insights', description: 'Automatic pattern recognition and alerts' },
    { id: 'anomaly_detection', label: 'Anomaly Detection', description: 'Identify unusual patterns in data' },
    { id: 'forecasting', label: 'Forecasting', description: 'Time series forecasting capabilities' },
    { id: 'classification', label: 'Classification', description: 'Classify data into categories' },
    { id: 'clustering', label: 'Clustering', description: 'Group similar data points together' }
  ];

  const subscriptionPlans = [
    { 
      value: 'professional', 
      label: 'Professional', 
      description: 'Up to 50 machines, advanced analytics',
      price: '$99/month'
    },
    { 
      value: 'enterprise', 
      label: 'Enterprise', 
      description: 'Unlimited machines, all features',
      price: '$299/month'
    }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureToggle = (featureId) => {
    setFormData(prev => ({
      ...prev,
      ml_features: prev.ml_features.includes(featureId)
        ? prev.ml_features.filter(f => f !== featureId)
        : [...prev.ml_features, featureId]
    }));
  };

  const validateStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        return formData.company_name && formData.admin_email && formData.admin_first_name && formData.admin_last_name;
      case 2:
        return formData.ml_features.length > 0 && formData.expected_machine_count > 0;
      case 3:
        return true; // Review step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      setError(null);
    } else {
      setError('Please fill in all required fields');
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/api/admin/tenants/provision-ml', formData);
      
      setSuccess(response.data);
      if (onSuccess) {
        onSuccess(response.data);
      }
      
    } catch (error) {
      console.error('Failed to provision ML tenant:', error);
      setError(error.response?.data?.detail || 'Failed to provision ML tenant');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            ML tenant provisioned successfully! Tenant ID: {success.tenant_id}
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-green-600" />
              ML Tenant Setup Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tenant ID</Label>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                  {success.tenant_id}
                </div>
              </div>
              <div>
                <Label>Admin User ID</Label>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                  {success.admin_user_id}
                </div>
              </div>
            </div>
            
            <div>
              <Label>ML API Keys</Label>
              <div className="space-y-2 mt-2">
                {Object.entries(success.api_keys || {}).map(([keyType, keyValue]) => (
                  <div key={keyType} className="flex items-center gap-2">
                    <Badge variant="outline">{keyType}</Badge>
                    <div className="font-mono text-xs bg-gray-100 p-1 rounded flex-1">
                      {keyValue}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Enabled Features</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {success.ml_features_enabled?.enabled_features?.map((feature) => (
                  <Badge key={feature} variant="default" className="text-xs">
                    {feature.replace('_', ' ').toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
            
            <Button 
              onClick={() => {
                setSuccess(null);
                setFormData({
                  company_name: '',
                  website: '',
                  business_type: 'ml_analytics',
                  admin_email: '',
                  admin_first_name: '',
                  admin_last_name: '',
                  admin_phone: '',
                  address_line1: '',
                  city: '',
                  state: '',
                  zip_code: '',
                  ml_features: [],
                  expected_machine_count: 10,
                  data_retention_days: 365,
                  subscription_plan: 'professional',
                  send_welcome_email: true,
                  setup_sample_data: false,
                  enable_api_access: true
                });
                setStep(1);
              }}
              className="w-full"
            >
              Provision Another ML Tenant
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${step >= stepNumber 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
              }
            `}>
              {stepNumber}
            </div>
            {stepNumber < 3 && (
              <div className={`
                w-8 h-0.5 mx-2
                ${step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'}
              `} />
            )}
          </div>
        ))}
      </div>

      <div className="text-center">
        <h3 className="font-medium">
          {step === 1 && 'Company & Admin Information'}
          {step === 2 && 'ML Configuration'}
          {step === 3 && 'Review & Provision'}
        </h3>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Company & Admin Information */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company & Admin Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Company Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>

            {/* Admin User Information */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Admin User
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="admin_first_name">First Name *</Label>
                  <Input
                    id="admin_first_name"
                    value={formData.admin_first_name}
                    onChange={(e) => handleInputChange('admin_first_name', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label htmlFor="admin_last_name">Last Name *</Label>
                  <Input
                    id="admin_last_name"
                    value={formData.admin_last_name}
                    onChange={(e) => handleInputChange('admin_last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <Label htmlFor="admin_email">Email Address *</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={formData.admin_email}
                    onChange={(e) => handleInputChange('admin_email', e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="admin_phone">Phone Number</Label>
                  <Input
                    id="admin_phone"
                    value={formData.admin_phone}
                    onChange={(e) => handleInputChange('admin_phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address (Optional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address_line1">Address Line 1</Label>
                  <Input
                    id="address_line1"
                    value={formData.address_line1}
                    onChange={(e) => handleInputChange('address_line1', e.target.value)}
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="State"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!validateStep(1)}>
                Next: ML Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: ML Configuration */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              ML Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ML Features */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Bot className="w-4 h-4" />
                ML Features *
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mlFeatureOptions.map((feature) => (
                  <div 
                    key={feature.id}
                    className={`
                      p-3 border rounded-lg cursor-pointer transition-colors
                      ${formData.ml_features.includes(feature.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => handleFeatureToggle(feature.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={formData.ml_features.includes(feature.id)}
                        onChange={() => handleFeatureToggle(feature.id)}
                      />
                      <div>
                        <div className="font-medium text-sm">{feature.label}</div>
                        <div className="text-xs text-gray-600">{feature.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration Options */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configuration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expected_machine_count">Expected Machine Count *</Label>
                  <Input
                    id="expected_machine_count"
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.expected_machine_count}
                    onChange={(e) => handleInputChange('expected_machine_count', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="data_retention_days">Data Retention (Days)</Label>
                  <Select 
                    value={formData.data_retention_days.toString()} 
                    onValueChange={(value) => handleInputChange('data_retention_days', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="730">2 years</SelectItem>
                      <SelectItem value="2555">7 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Subscription Plan */}
            <div className="space-y-4">
              <h4 className="font-medium">Subscription Plan</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subscriptionPlans.map((plan) => (
                  <div
                    key={plan.value}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${formData.subscription_plan === plan.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                    onClick={() => handleInputChange('subscription_plan', plan.value)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium">{plan.label}</h5>
                      <div className="text-sm font-bold text-green-600">{plan.price}</div>
                    </div>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
              <Button onClick={handleNext} disabled={!validateStep(2)}>
                Review & Provision
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Provision */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Review & Provision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Review Summary */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Company Information</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Company:</strong> {formData.company_name}</div>
                    <div><strong>Website:</strong> {formData.website || 'Not provided'}</div>
                    <div><strong>Admin:</strong> {formData.admin_first_name} {formData.admin_last_name}</div>
                    <div><strong>Email:</strong> {formData.admin_email}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">ML Configuration</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Features:</strong> {formData.ml_features.length} selected</div>
                    <div><strong>Machines:</strong> {formData.expected_machine_count}</div>
                    <div><strong>Retention:</strong> {formData.data_retention_days} days</div>
                    <div><strong>Plan:</strong> {formData.subscription_plan}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Selected ML Features</h4>
                <div className="flex flex-wrap gap-1">
                  {formData.ml_features.map((featureId) => {
                    const feature = mlFeatureOptions.find(f => f.id === featureId);
                    return (
                      <Badge key={featureId} variant="default" className="text-xs">
                        {feature?.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Setup Options */}
            <div className="space-y-3">
              <h4 className="font-medium">Setup Options</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send_welcome_email"
                    checked={formData.send_welcome_email}
                    onCheckedChange={(checked) => handleInputChange('send_welcome_email', checked)}
                  />
                  <Label htmlFor="send_welcome_email">Send welcome email to admin</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="setup_sample_data"
                    checked={formData.setup_sample_data}
                    onCheckedChange={(checked) => handleInputChange('setup_sample_data', checked)}
                  />
                  <Label htmlFor="setup_sample_data">Setup sample ML datasets</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enable_api_access"
                    checked={formData.enable_api_access}
                    onCheckedChange={(checked) => handleInputChange('enable_api_access', checked)}
                  />
                  <Label htmlFor="enable_api_access">Enable ML API access</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
                className="min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 mr-2" />
                    Provision ML Tenant
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MLProvisioningForm;