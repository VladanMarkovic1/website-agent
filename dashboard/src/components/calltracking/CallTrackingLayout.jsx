import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  PhoneIcon, 
  ChartBarIcon, 
  ChatBubbleLeftRightIcon, 
  Cog6ToothIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SignalIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import socketService, { 
  connectToCallTracking, 
  disconnectFromCallTracking, 
  subscribeToConnectionEvents,
  subscribeToCallEvents,
  subscribeToSMSEvents,
  subscribeToLeadEvents
} from '../../services/socketService';

const CallTrackingLayout = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ connected: false });
  const [notifications, setNotifications] = useState([]);
  const [user] = useState({
    name: 'Dr. Sarah Johnson',
    email: 'demo@dentalpractice.com',
    businessName: 'Bright Smile Dental',
    role: 'business_owner'
  });

  // Navigation items
  const navigation = [
    { name: 'Analytics', href: '/call-tracking-test', icon: ChartBarIcon },
    { name: 'Recent Calls', href: '/call-tracking-test/calls', icon: PhoneIcon },
    { name: 'SMS Conversations', href: '/call-tracking-test/conversations', icon: ChatBubbleLeftRightIcon },
    { name: 'Settings', href: '/call-tracking-test/settings', icon: Cog6ToothIcon },
  ];

  // Admin navigation (only for admin users)
  const adminNavigation = user.role === 'admin' ? [
    { name: 'Number Porting', href: '/call-tracking-test/admin/porting', icon: Cog6ToothIcon },
  ] : [];

  useEffect(() => {
    // Connect to WebSocket
    connectToCallTracking('demo-user-id', 'demo-business-id');

    // Subscribe to connection events
    const unsubscribeConnection = subscribeToConnectionEvents({
      onConnectionStatus: (status) => {
        setConnectionStatus(status);
        if (status.connected) {
          addNotification('Connected to call tracking system', 'success');
        } else {
          addNotification('Disconnected from call tracking system', 'warning');
        }
      },
      onConnectionError: (error) => {
        console.error('Connection error:', error);
        addNotification('Connection error - attempting to reconnect...', 'error');
      }
    });

    // Subscribe to call events
    const unsubscribeCalls = subscribeToCallEvents({
      onNewCall: (data) => {
        addNotification(`New call from ${data.fromNumber}`, 'info');
      },
      onMissedCall: (data) => {
        addNotification(`Missed call from ${data.fromNumber} - SMS sent`, 'warning');
      },
      onCallCompleted: (data) => {
        addNotification(`Call completed - Duration: ${data.duration}`, 'success');
      }
    });

    // Subscribe to SMS events
    const unsubscribeSMS = subscribeToSMSEvents({
      onNewSMS: (data) => {
        addNotification(`New SMS from ${data.fromNumber}`, 'info');
      },
      onSMSSent: (data) => {
        addNotification(`SMS sent to ${data.toNumber}`, 'success');
      }
    });

    // Subscribe to lead events
    const unsubscribeLeads = subscribeToLeadEvents({
      onLeadCreated: (data) => {
        addNotification(`New lead: ${data.name} - ${data.leadType}`, 'success');
      }
    });

    // Request notification permission
    socketService.requestNotificationPermission();

    return () => {
      unsubscribeConnection();
      unsubscribeCalls();
      unsubscribeSMS();
      unsubscribeLeads();
      disconnectFromCallTracking();
    };
  }, []);

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type, timestamp: new Date() };
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectFromCallTracking();
    navigate('/login');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <PhoneIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-lg font-semibold text-gray-900">Call Tracking</span>
            </div>
            <button
              className="lg:hidden text-gray-400 hover:text-gray-600"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Connection Status */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${connectionStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-sm ${connectionStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                {connectionStatus.connected ? 'Live' : 'Disconnected'}
              </span>
              {!connectionStatus.connected && (
                <button
                  onClick={() => socketService.reconnect()}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Reconnect
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
                end={item.href === '/call-tracking-test'}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </NavLink>
            ))}

            {adminNavigation.length > 0 && (
              <>
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Admin
                  </p>
                </div>
                {adminNavigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.businessName}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:pl-0">
        {/* Top Navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  className="lg:hidden text-gray-400 hover:text-gray-600"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <h1 className="ml-4 lg:ml-0 text-lg font-semibold text-gray-900">
                  {user.businessName} - Call Tracking Dashboard
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                {/* Connection Status Indicator */}
                <div className="flex items-center space-x-2">
                  {connectionStatus.connected ? (
                    <div className="flex items-center text-green-600">
                      <SignalIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm">Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      <span className="text-sm">Offline</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      {/* Notifications Panel */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border shadow-lg transform transition-all duration-300 slide-in ${getNotificationColor(notification.type)}`}
          >
            <div className="flex items-start">
              <span className="flex-shrink-0 text-lg mr-2">
                {getNotificationIcon(notification.type)}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
                <p className="text-xs mt-1 opacity-75">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default CallTrackingLayout; 