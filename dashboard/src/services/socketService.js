import { io } from 'socket.io-client';

// Socket event constants
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  
  // Call tracking events
  NEW_CALL: 'new-call',
  MISSED_CALL: 'missed-call',
  CALL_COMPLETED: 'call-completed',
  CALL_UPDATED: 'call-updated',
  
  // SMS events
  NEW_SMS: 'new-sms',
  SMS_SENT: 'sms-sent',
  CONVERSATION_UPDATED: 'conversation-updated',
  
  // Lead events
  LEAD_CREATED: 'lead-created',
  LEAD_UPDATED: 'lead-updated',
  
  // Analytics events
  ANALYTICS_UPDATED: 'analytics-updated',
  
  // System events
  SYSTEM_HEALTH_UPDATED: 'system-health-updated'
};

/**
 * Socket Service for Real-time Communication
 * Handles WebSocket connections for live updates
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.connectionCallbacks = new Set();
    this.notificationPermission = 'default';
    this.initNotifications();
    this.eventSubscriptions = new Map();
    
    // Get socket URL from environment variables
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api/v1';
    this.socketUrl = backendUrl.replace('/api/v1', ''); // Remove /api/v1 for socket connection
  }

  // Initialize browser notification permission
  async initNotifications() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
    }
  }

  // Connect to the WebSocket server
  connect(token) {
    if (this.socket && this.socket.connected) {
      return;
    }

    // Create socket connection with authentication
    this.socket = io(this.socketUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.setupConnectionHandlers();
    this.setupEventHandlers();
  }

  // Setup connection event handlers
  setupConnectionHandlers() {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection-status', { connected: true });
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      this.isConnected = false;
      this.emit('connection-status', { connected: false, reason });
    });

    this.socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
      this.reconnectAttempts++;
      this.emit('connection-error', { error, attempts: this.reconnectAttempts });
    });
  }

  // Setup business event handlers
  setupEventHandlers() {
    if (!this.socket) return;

    // Call events
    this.socket.on(SOCKET_EVENTS.NEW_CALL, (data) => {
      this.emit('new-call', data);
      this.notifyNewCall(data);
    });

    this.socket.on(SOCKET_EVENTS.MISSED_CALL, (data) => {
      this.emit('missed-call', data);
      this.notifyMissedCall(data);
    });

    this.socket.on(SOCKET_EVENTS.CALL_COMPLETED, (data) => {
      this.emit('call-completed', data);
    });

    this.socket.on(SOCKET_EVENTS.CALL_UPDATED, (data) => {
      this.emit('call-updated', data);
    });

    // SMS events
    this.socket.on(SOCKET_EVENTS.NEW_SMS, (data) => {
      this.emit('new-sms', data);
      this.notifyNewSMS(data);
    });

    this.socket.on(SOCKET_EVENTS.SMS_SENT, (data) => {
      this.emit('sms-sent', data);
    });

    this.socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, (data) => {
      this.emit('conversation-updated', data);
    });

    // Lead events
    this.socket.on(SOCKET_EVENTS.LEAD_CREATED, (data) => {
      this.emit('lead-created', data);
      this.notifyLeadCreated(data);
    });

    this.socket.on(SOCKET_EVENTS.LEAD_UPDATED, (data) => {
      this.emit('lead-updated', data);
    });

    // Analytics events
    this.socket.on(SOCKET_EVENTS.ANALYTICS_UPDATED, (data) => {
      this.emit('analytics-updated', data);
    });

    // System events
    this.socket.on(SOCKET_EVENTS.SYSTEM_HEALTH_UPDATED, (data) => {
      this.emit('system-health-updated', data);
    });
  }

  // Subscribe to events
  subscribe(event, callback) {
    if (!this.eventSubscriptions.has(event)) {
      this.eventSubscriptions.set(event, new Set());
    }
    this.eventSubscriptions.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.eventSubscriptions.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.eventSubscriptions.delete(event);
        }
      }
    };
  }

  // Emit events to subscribers
  emit(event, data) {
    const callbacks = this.eventSubscriptions.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  // Send message to server
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot send message');
    }
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.eventSubscriptions.clear();
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Reconnect manually
  reconnect() {
    if (this.socket) {
      this.socket.connect();
    }
  }

  // Browser Notification Service
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  showNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
  }

  // Specific notification methods
  notifyNewCall(callData) {
    this.showNotification('New Call Received', {
      body: `Call from ${callData.fromNumber || 'Unknown'}`,
      tag: 'new-call',
      icon: '/icons/phone-call.png'
    });
  }

  notifyMissedCall(callData) {
    this.showNotification('Missed Call Alert', {
      body: `Missed call from ${callData.fromNumber || 'Unknown'} - SMS sent automatically`,
      tag: 'missed-call',
      icon: '/icons/missed-call.png',
      requireInteraction: true
    });
  }

  notifyNewSMS(smsData) {
    this.showNotification('New SMS Message', {
      body: `Message from ${smsData.fromNumber || 'Unknown'}: ${smsData.message?.substring(0, 50)}...`,
      tag: 'new-sms',
      icon: '/icons/sms.png'
    });
  }

  notifyLeadCreated(leadData) {
    this.showNotification('New Lead Generated', {
      body: `New lead: ${leadData.name || 'Unknown'} - ${leadData.leadType || 'General'}`,
      tag: 'new-lead',
      icon: '/icons/lead.png',
      requireInteraction: true
    });
  }
}

// Create singleton instance
const socketService = new SocketService();

// Helper functions for common use cases
export const connectToCallTracking = (userId, businessId) => {
  socketService.connect(userId, businessId);
};

export const disconnectFromCallTracking = () => {
  socketService.disconnect();
};

export const subscribeToCallEvents = (callbacks) => {
  const unsubscribers = [];

  if (callbacks.onNewCall) {
    unsubscribers.push(socketService.subscribe('new-call', callbacks.onNewCall));
  }
  if (callbacks.onMissedCall) {
    unsubscribers.push(socketService.subscribe('missed-call', callbacks.onMissedCall));
  }
  if (callbacks.onCallCompleted) {
    unsubscribers.push(socketService.subscribe('call-completed', callbacks.onCallCompleted));
  }
  if (callbacks.onCallUpdated) {
    unsubscribers.push(socketService.subscribe('call-updated', callbacks.onCallUpdated));
  }

  // Return function to unsubscribe from all
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
};

export const subscribeToSMSEvents = (callbacks) => {
  const unsubscribers = [];

  if (callbacks.onNewSMS) {
    unsubscribers.push(socketService.subscribe('new-sms', callbacks.onNewSMS));
  }
  if (callbacks.onSMSSent) {
    unsubscribers.push(socketService.subscribe('sms-sent', callbacks.onSMSSent));
  }
  if (callbacks.onConversationUpdated) {
    unsubscribers.push(socketService.subscribe('conversation-updated', callbacks.onConversationUpdated));
  }

  // Return function to unsubscribe from all
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
};

export const subscribeToLeadEvents = (callbacks) => {
  const unsubscribers = [];

  if (callbacks.onLeadCreated) {
    unsubscribers.push(socketService.subscribe('lead-created', callbacks.onLeadCreated));
  }
  if (callbacks.onLeadUpdated) {
    unsubscribers.push(socketService.subscribe('lead-updated', callbacks.onLeadUpdated));
  }

  // Return function to unsubscribe from all
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
};

export const subscribeToAnalyticsEvents = (callbacks) => {
  const unsubscribers = [];

  if (callbacks.onAnalyticsUpdated) {
    unsubscribers.push(socketService.subscribe('analytics-updated', callbacks.onAnalyticsUpdated));
  }

  // Return function to unsubscribe from all
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
};

export const subscribeToConnectionEvents = (callbacks) => {
  const unsubscribers = [];

  if (callbacks.onConnectionStatus) {
    unsubscribers.push(socketService.subscribe('connection-status', callbacks.onConnectionStatus));
  }
  if (callbacks.onConnectionError) {
    unsubscribers.push(socketService.subscribe('connection-error', callbacks.onConnectionError));
  }

  // Return function to unsubscribe from all
  return () => {
    unsubscribers.forEach(unsubscribe => unsubscribe());
  };
};

export default socketService; 