import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  Package, 
  Wrench,
  Clock,
  Users,
  RotateCcw
} from "lucide-react";
import { useAuth } from "../App";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setRefreshing(true);
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    
    try {
      await Promise.all(
        unreadNotifications.map(notif => 
          axios.put(`${API}/notifications/${notif.id}/read`)
        )
      );
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const iconProps = { className: "w-5 h-5" };
    
    switch (type) {
      case 'job_assigned':
      case 'job_approved':
        return <Wrench {...iconProps} className="w-5 h-5 text-blue-600" />;
      case 'urgent_job':
        return <AlertTriangle {...iconProps} className="w-5 h-5 text-red-600" />;
      case 'low_inventory':
      case 'part_replenishment':
        return <Package {...iconProps} className="w-5 h-5 text-orange-600" />;
      case 'rma_update':
        return <Users {...iconProps} className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell {...iconProps} className="w-5 h-5 text-slate-600" />;
    }
  };

  const getNotificationColor = (type, read) => {
    if (read) {
      return "bg-slate-50 border-slate-200";
    }
    
    switch (type) {
      case 'urgent_job':
        return "bg-red-50 border-red-200";
      case 'job_assigned':
      case 'job_approved':
        return "bg-blue-50 border-blue-200";
      case 'low_inventory':
      case 'part_replenishment':
        return "bg-orange-50 border-orange-200";
      case 'rma_update':
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  const NotificationCard = ({ notification }) => (
    <Card 
      className={`hover:shadow-md transition-shadow duration-200 cursor-pointer ${getNotificationColor(notification.notification_type, notification.read)}`}
      onClick={() => markAsRead(notification.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.notification_type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-medium ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
                {notification.title}
              </h3>
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
              )}
            </div>
            
            <p className={`text-sm mt-1 ${notification.read ? 'text-slate-500' : 'text-slate-700'}`}>
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-slate-500">
                {new Date(notification.created_at).toLocaleString()}
              </p>
              
              <Badge 
                variant="outline" 
                className="text-xs capitalize"
              >
                {notification.notification_type.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

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
                <h1 className="text-lg font-bold text-slate-800">Notifications</h1>
                <p className="text-sm text-slate-600">
                  {unreadNotifications.length} unread
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchNotifications}
                disabled={refreshing}
                data-testid="refresh-button"
              >
                <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              {unreadNotifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  data-testid="mark-all-read-button"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <Tabs defaultValue="unread" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unread" data-testid="unread-tab">
              Unread ({unreadNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="all-tab">
              All Notifications ({notifications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="space-y-3">
            {unreadNotifications.length > 0 ? (
              <>
                {/* Quick Actions */}
                {unreadNotifications.length > 3 && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4 text-center">
                      <Bell className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-blue-800 font-medium">
                        You have {unreadNotifications.length} unread notifications
                      </p>
                      <Button
                        size="sm"
                        className="mt-2 bg-blue-600 hover:bg-blue-700"
                        onClick={markAllAsRead}
                      >
                        Mark All as Read
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Unread Notifications */}
                {unreadNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">All Caught Up!</h3>
                  <p className="text-slate-600">You have no unread notifications</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-3">
            {notifications.length > 0 ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-blue-600">{unreadNotifications.length}</p>
                      <p className="text-xs text-slate-600">Unread</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-green-600">{readNotifications.length}</p>
                      <p className="text-xs text-slate-600">Read</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-slate-600">{notifications.length}</p>
                      <p className="text-xs text-slate-600">Total</p>
                    </CardContent>
                  </Card>
                </div>

                {/* All Notifications */}
                {notifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">No Notifications</h3>
                  <p className="text-slate-600">You'll receive notifications for job updates, parts alerts, and more</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Notifications;