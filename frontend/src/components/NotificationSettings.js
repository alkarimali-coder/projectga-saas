import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
    Settings, 
    Bell, 
    Mail, 
    Smartphone, 
    Clock,
    Package,
    DollarSign,
    RefreshCw,
    Save,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';

const NotificationSettings = ({ userRole }) => {
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    useEffect(() => {
        fetchLocations();
    }, []);

    useEffect(() => {
        if (selectedLocation) {
            fetchLocationSettings(selectedLocation);
        }
    }, [selectedLocation]);

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/locations`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setLocations(data);
                if (data.length > 0) {
                    setSelectedLocation(data[0].id);
                }
            }
        } catch (err) {
            console.error('Error fetching locations:', err);
            setError('Failed to fetch locations');
        }
    };

    const fetchLocationSettings = async (locationId) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/locations/${locationId}/notification-settings`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            } else if (response.status === 404) {
                // Create default settings
                setSettings(createDefaultSettings(locationId));
            }
        } catch (err) {
            console.error('Error fetching location settings:', err);
            setError('Failed to fetch location settings');
        } finally {
            setLoading(false);
        }
    };

    const createDefaultSettings = (locationId) => {
        const location = locations.find(l => l.id === locationId);
        return {
            location_id: locationId,
            location_name: location?.name || 'Unknown Location',
            renewal_reminder_days: {
                license: 30,
                permit: 30,
                contract: 60,
                insurance: 45,
                certification: 30
            },
            overdue_service_hours: 24,
            enable_auto_escalation: true,
            low_inventory_threshold: 5,
            critical_inventory_threshold: 2,
            revenue_drop_percentage: 15.0,
            cost_variance_percentage: 20.0,
            auto_posting_enabled: true,
            auto_posting_action: 'auto_reschedule',
            auto_posting_max_attempts: 3,
            require_parts_confirmation: true,
            channel_preferences: {
                urgent_issue: ['sms', 'web_push', 'mobile_push'],
                overdue_service: ['web_push', 'email'],
                low_inventory: ['email', 'web_push'],
                revenue_drop: ['email'],
                renewal_reminder: ['email', 'web_push']
            },
            role_notification_routing: {
                TECH: ['urgent_issue', 'overdue_service', 'job_auto_repost'],
                DISPATCH: ['overdue_service', 'job_failed', 'parts_required'],
                ML_ADMIN: ['revenue_drop', 'cost_discrepancy', 'renewal_reminder'],
                WAREHOUSE: ['low_inventory', 'parts_required']
            }
        };
    };

    const saveSettings = async () => {
        if (!settings || !selectedLocation) return;

        try {
            setSaving(true);
            setError(null);
            const token = localStorage.getItem('token');
            
            const response = await fetch(
                `${backendUrl}/api/locations/${selectedLocation}/notification-settings?location_name=${encodeURIComponent(settings.location_name)}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                }
            );

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (err) {
            console.error('Error saving settings:', err);
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = (path, value) => {
        setSettings(prev => {
            const newSettings = { ...prev };
            const keys = path.split('.');
            let current = newSettings;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
            return newSettings;
        });
    };

    const toggleChannelPreference = (notificationType, channel) => {
        const currentChannels = settings.channel_preferences[notificationType] || [];
        const newChannels = currentChannels.includes(channel)
            ? currentChannels.filter(c => c !== channel)
            : [...currentChannels, channel];
        
        updateSetting(`channel_preferences.${notificationType}`, newChannels);
    };

    const toggleRoleNotification = (role, notificationType) => {
        const currentTypes = settings.role_notification_routing[role] || [];
        const newTypes = currentTypes.includes(notificationType)
            ? currentTypes.filter(t => t !== notificationType)
            : [...currentTypes, notificationType];
        
        updateSetting(`role_notification_routing.${role}`, newTypes);
    };

    if (!settings) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center">
                    <Settings className="h-8 w-8 mr-3 text-blue-600" />
                    Notification Settings
                </h1>
                
                <Button onClick={saveSettings} disabled={saving}>
                    {saving ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
            </div>

            {/* Messages */}
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                        Settings saved successfully!
                    </AlertDescription>
                </Alert>
            )}

            {/* Location Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Location</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-4">
                        <Label htmlFor="location-select" className="text-sm font-medium">
                            Configure settings for:
                        </Label>
                        <Select
                            value={selectedLocation}
                            onValueChange={setSelectedLocation}
                        >
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                                {locations.map(location => (
                                    <SelectItem key={location.id} value={location.id}>
                                        {location.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Settings Tabs */}
            <Tabs defaultValue="thresholds" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="thresholds">Alert Thresholds</TabsTrigger>
                    <TabsTrigger value="channels">Channels</TabsTrigger>
                    <TabsTrigger value="roles">Role Routing</TabsTrigger>
                    <TabsTrigger value="automation">Auto-Posting</TabsTrigger>
                </TabsList>

                <TabsContent value="thresholds" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Renewal Reminders */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Clock className="h-5 w-5 mr-2" />
                                    Renewal Reminder Days
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.entries(settings.renewal_reminder_days || {}).map(([type, days]) => (
                                    <div key={type} className="flex items-center justify-between">
                                        <Label className="capitalize">{type}:</Label>
                                        <Input
                                            type="number"
                                            value={days}
                                            onChange={(e) => updateSetting(`renewal_reminder_days.${type}`, parseInt(e.target.value))}
                                            className="w-20"
                                            min="1"
                                            max="365"
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Service Alerts */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Clock className="h-5 w-5 mr-2" />
                                    Service Alert Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Overdue Service Hours:</Label>
                                    <Input
                                        type="number"
                                        value={settings.overdue_service_hours}
                                        onChange={(e) => updateSetting('overdue_service_hours', parseInt(e.target.value))}
                                        className="w-20"
                                        min="1"
                                        max="168"
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <Label>Enable Auto Escalation:</Label>
                                    <Switch
                                        checked={settings.enable_auto_escalation}
                                        onCheckedChange={(checked) => updateSetting('enable_auto_escalation', checked)}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Inventory Alerts */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Package className="h-5 w-5 mr-2" />
                                    Inventory Thresholds
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Low Inventory Threshold:</Label>
                                    <Input
                                        type="number"
                                        value={settings.low_inventory_threshold}
                                        onChange={(e) => updateSetting('low_inventory_threshold', parseInt(e.target.value))}
                                        className="w-20"
                                        min="1"
                                        max="100"
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <Label>Critical Inventory Threshold:</Label>
                                    <Input
                                        type="number"
                                        value={settings.critical_inventory_threshold}
                                        onChange={(e) => updateSetting('critical_inventory_threshold', parseInt(e.target.value))}
                                        className="w-20"
                                        min="0"
                                        max="50"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Financial Alerts */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <DollarSign className="h-5 w-5 mr-2" />
                                    Financial Alert Thresholds
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Revenue Drop %:</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={settings.revenue_drop_percentage}
                                        onChange={(e) => updateSetting('revenue_drop_percentage', parseFloat(e.target.value))}
                                        className="w-20"
                                        min="1"
                                        max="100"
                                    />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <Label>Cost Variance %:</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={settings.cost_variance_percentage}
                                        onChange={(e) => updateSetting('cost_variance_percentage', parseFloat(e.target.value))}
                                        className="w-20"
                                        min="1"
                                        max="100"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="channels" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Channel Preferences</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {Object.entries(settings.channel_preferences || {}).map(([notificationType, channels]) => (
                                    <div key={notificationType} className="space-y-3">
                                        <h4 className="font-medium capitalize">
                                            {notificationType.replace('_', ' ')}
                                        </h4>
                                        
                                        <div className="flex flex-wrap gap-4">
                                            {['web_push', 'email', 'sms', 'mobile_push'].map(channel => (
                                                <label key={channel} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={(channels || []).includes(channel)}
                                                        onChange={() => toggleChannelPreference(notificationType, channel)}
                                                        className="rounded border-gray-300"
                                                    />
                                                    <span className="flex items-center text-sm">
                                                        {channel === 'web_push' && <Bell className="h-4 w-4 mr-1" />}
                                                        {channel === 'email' && <Mail className="h-4 w-4 mr-1" />}
                                                        {channel === 'sms' && <Smartphone className="h-4 w-4 mr-1" />}
                                                        {channel === 'mobile_push' && <Smartphone className="h-4 w-4 mr-1" />}
                                                        {channel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="roles" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Role-Based Notification Routing</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {Object.entries(settings.role_notification_routing || {}).map(([role, notificationTypes]) => (
                                    <div key={role} className="space-y-3">
                                        <h4 className="font-medium">{role}</h4>
                                        
                                        <div className="flex flex-wrap gap-4">
                                            {[
                                                'urgent_issue', 'overdue_service', 'low_inventory', 
                                                'revenue_drop', 'cost_discrepancy', 'renewal_reminder',
                                                'job_auto_repost', 'job_failed', 'parts_required'
                                            ].map(notificationType => (
                                                <label key={notificationType} className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={(notificationTypes || []).includes(notificationType)}
                                                        onChange={() => toggleRoleNotification(role, notificationType)}
                                                        className="rounded border-gray-300"
                                                    />
                                                    <span className="text-sm capitalize">
                                                        {notificationType.replace('_', ' ')}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="automation" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <RefreshCw className="h-5 w-5 mr-2" />
                                Auto-Posting Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Enable Auto-Posting:</Label>
                                <Switch
                                    checked={settings.auto_posting_enabled}
                                    onCheckedChange={(checked) => updateSetting('auto_posting_enabled', checked)}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <Label>Auto-Posting Action:</Label>
                                <Select
                                    value={settings.auto_posting_action}
                                    onValueChange={(value) => updateSetting('auto_posting_action', value)}
                                >
                                    <SelectTrigger className="w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto_reschedule">Auto Reschedule</SelectItem>
                                        <SelectItem value="manual_approval">Manual Approval</SelectItem>
                                        <SelectItem value="suggest_parts">Suggest Parts</SelectItem>
                                        <SelectItem value="escalate">Escalate</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <Label>Max Attempts:</Label>
                                <Input
                                    type="number"
                                    value={settings.auto_posting_max_attempts}
                                    onChange={(e) => updateSetting('auto_posting_max_attempts', parseInt(e.target.value))}
                                    className="w-20"
                                    min="1"
                                    max="10"
                                />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <Label>Require Parts Confirmation:</Label>
                                <Switch
                                    checked={settings.require_parts_confirmation}
                                    onCheckedChange={(checked) => updateSetting('require_parts_confirmation', checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default NotificationSettings;