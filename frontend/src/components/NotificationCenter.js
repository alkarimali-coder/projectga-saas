import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
    Bell, 
    CheckCircle, 
    AlertTriangle, 
    Clock, 
    DollarSign,
    Wrench,
    Package,
    Calendar,
    Settings,
    Filter,
    RefreshCw,
    MoreVertical
} from 'lucide-react';

const NotificationCenter = ({ userRole }) => {
    const [notifications, setNotifications] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // all, unread, priority
    const [autoRefresh, setAutoRefresh] = useState(true);

    const backendUrl = process.env.REACT_APP_BACKEND_URL;

    useEffect(() => {
        fetchNotifications();
        fetchStats();

        // Set up auto-refresh every 30 seconds
        let interval;
        if (autoRefresh) {
            interval = setInterval(() => {
                fetchNotifications();
                fetchStats();
            }, 30000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [filter, autoRefresh]);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const unreadOnly = filter === 'unread';
            
            const response = await fetch(
                `${backendUrl}/api/notifications?limit=50&unread_only=${unreadOnly}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
            } else {
                throw new Error(`Failed to fetch notifications: ${response.status}`);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/notifications/stats`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${backendUrl}/api/notifications/${notificationId}/read`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.ok) {
                // Update local state
                setNotifications(prev => 
                    prev.map(notif => 
                        notif.notification_id === notificationId 
                            ? { ...notif, read: true, read_at: new Date().toISOString() }
                            : notif
                    )
                );
                // Refresh stats
                fetchStats();
            }
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'renewal_reminder':
                return <Calendar className="h-5 w-5 text-blue-500" />;
            case 'overdue_service':
                return <Clock className="h-5 w-5 text-red-500" />;
            case 'low_inventory':
                return <Package className="h-5 w-5 text-orange-500" />;
            case 'revenue_drop':
                return <DollarSign className="h-5 w-5 text-red-500" />;
            case 'cost_discrepancy':
                return <DollarSign className="h-5 w-5 text-yellow-500" />;
            case 'urgent_issue':
                return <AlertTriangle className="h-5 w-5 text-red-600" />;
            case 'job_auto_repost':
                return <RefreshCw className="h-5 w-5 text-blue-500" />;
            case 'job_failed':
                return <Wrench className="h-5 w-5 text-red-500" />;
            default:
                return <Bell className="h-5 w-5 text-gray-500" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical':
                return 'bg-red-600 text-white';
            case 'urgent':
                return 'bg-red-500 text-white';
            case 'high':
                return 'bg-orange-500 text-white';
            case 'medium':
                return 'bg-yellow-500 text-white';
            case 'low':
                return 'bg-gray-500 text-white';
            default:
                return 'bg-gray-400 text-white';
        }
    };

    const formatTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    const handleNotificationClick = (notification) => {
        // Mark as read
        if (!notification.read) {
            markAsRead(notification.notification_id);
        }
        
        // Navigate to action URL if provided
        if (notification.action_url) {
            window.location.href = notification.action_url;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading notifications...</div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert className="m-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    Error loading notifications: {error}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-bold">Notifications</h1>
                    {stats && (
                        <Badge variant="outline" className="text-sm">
                            {stats.unread_count} unread
                        </Badge>
                    )}
                </div>
                
                <div className="flex items-center space-x-2">
                    <Button
                        variant={autoRefresh ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Auto Refresh
                    </Button>
                    
                    <Button variant="outline" size="sm" onClick={fetchNotifications}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total</p>
                                    <p className="text-2xl font-bold">{stats.total_notifications}</p>
                                </div>
                                <Bell className="h-8 w-8 text-gray-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Unread</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.unread_count}</p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-red-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Urgent</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {(stats.by_priority?.urgent || 0) + (stats.by_priority?.critical || 0)}
                                    </p>
                                </div>
                                <AlertTriangle className="h-8 w-8 text-orange-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Today</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {notifications.filter(n => {
                                            const today = new Date().toDateString();
                                            const notifDate = new Date(n.created_at).toDateString();
                                            return today === notifDate;
                                        }).length}
                                    </p>
                                </div>
                                <Calendar className="h-8 w-8 text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                {['all', 'unread', 'priority'].map((filterType) => (
                    <Button
                        key={filterType}
                        variant={filter === filterType ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilter(filterType)}
                        className="flex-1"
                    >
                        {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                    </Button>
                ))}
            </div>

            {/* Notifications List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Bell className="h-5 w-5 mr-2" />
                        Recent Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id || notification.notification_id}
                                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                                        !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {notification.title}
                                                </p>
                                                <div className="flex items-center space-x-2">
                                                    <Badge className={`text-xs ${getPriorityColor(notification.priority)}`}>
                                                        {notification.priority}
                                                    </Badge>
                                                    <span className="text-xs text-gray-500">
                                                        {formatTimeAgo(notification.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <p className="text-sm text-gray-600 mt-1">
                                                {notification.message}
                                            </p>
                                            
                                            {notification.data && Object.keys(notification.data).length > 0 && (
                                                <div className="mt-2 text-xs text-gray-500">
                                                    {notification.data.machine_id && (
                                                        <span className="mr-3">Machine: {notification.data.machine_id}</span>
                                                    )}
                                                    {notification.data.location_id && (
                                                        <span className="mr-3">Location: {notification.data.location_id}</span>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {!notification.read && (
                                                <div className="mt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            markAsRead(notification.notification_id);
                                                        }}
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Mark as Read
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No notifications to display</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default NotificationCenter;