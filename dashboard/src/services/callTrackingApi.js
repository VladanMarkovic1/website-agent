import axios from 'axios';

// Create axios instance with base configuration for call tracking
// Note: Call tracking routes use /api/call-tracking (without v1)
const api = axios.create({
    baseURL: 'http://localhost:5000/api/call-tracking',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Analytics API endpoints
export const analyticsApi = {
  // Get analytics data with timeframe filter
  getAnalytics: async (businessId, timeframe = '24h') => {
    const response = await api.get(`/${businessId}/analytics?timeframe=${timeframe}`);
    return response.data;
  },

  // Get call trends for charts
  getCallTrends: async (businessId, timeframe = '7d') => {
    const response = await api.get(`/${businessId}/analytics/trends?timeframe=${timeframe}`);
    return response.data;
  },

  // Get call distribution data
  getCallDistribution: async (businessId, timeframe = '24h') => {
    const response = await api.get(`/${businessId}/analytics/distribution?timeframe=${timeframe}`);
    return response.data;
  },

  // Get revenue recovery data
  getRevenueRecovery: async (businessId, timeframe = '30d') => {
    const response = await api.get(`/${businessId}/analytics/revenue?timeframe=${timeframe}`);
    return response.data;
  }
};

// Calls API endpoints
export const callsApi = {
  // Get recent calls with pagination
  getRecentCalls: async (businessId, page = 1, limit = 20, filter = 'all') => {
    const response = await api.get(`/${businessId}/recent-calls?page=${page}&limit=${limit}&filter=${filter}`);
    return response.data;
  },

  // Get missed calls specifically
  getMissedCalls: async (businessId, page = 1, limit = 20) => {
    const response = await api.get(`/${businessId}/missed-calls?page=${page}&limit=${limit}`);
    return response.data;
  },

  // Update call status
  updateCallStatus: async (businessId, callId, status) => {
    const response = await api.put(`/${businessId}/calls/${callId}/status`, { status });
    return response.data;
  },

  // Add call notes
  addCallNotes: async (businessId, callId, notes) => {
    const response = await api.put(`/${businessId}/calls/${callId}/notes`, { notes });
    return response.data;
  },

  // Get call recording URL
  getCallRecording: async (businessId, callId) => {
    const response = await api.get(`/${businessId}/calls/${callId}/recording`);
    return response.data;
  }
};

// SMS API endpoints
export const smsApi = {
  // Get SMS conversations
  getConversations: async (businessId, page = 1, limit = 20, filter = 'all') => {
    const response = await api.get(`/${businessId}/conversations?page=${page}&limit=${limit}&filter=${filter}`);
    return response.data;
  },

  // Get messages for a specific conversation
  getConversationMessages: async (businessId, conversationId) => {
    const response = await api.get(`/${businessId}/conversations/${conversationId}/messages`);
    return response.data;
  },

  // Send SMS reply
  sendSMSReply: async (businessId, conversationId, message) => {
    const response = await api.post(`/${businessId}/conversations/${conversationId}/reply`, { message });
    return response.data;
  },

  // Mark conversation as read
  markConversationRead: async (businessId, conversationId) => {
    const response = await api.put(`/${businessId}/conversations/${conversationId}/read`);
    return response.data;
  },

  // Update conversation status
  updateConversationStatus: async (businessId, conversationId, status) => {
    const response = await api.put(`/${businessId}/conversations/${conversationId}/status`, { status });
    return response.data;
  }
};

// Phone Settings API endpoints
export const phoneSettingsApi = {
  // Get current phone settings
  getSettings: async () => {
    const response = await api.get('/settings/phone');
    return response.data;
  },

  // Update phone settings
  updateSettings: async (settings) => {
    const response = await api.put('/settings/phone', settings);
    return response.data;
  },

  // Get SMS templates
  getSMSTemplates: async () => {
    const response = await api.get('/settings/sms-templates');
    return response.data;
  },

  // Update SMS templates
  updateSMSTemplates: async (templates) => {
    const response = await api.put('/settings/sms-templates', templates);
    return response.data;
  },

  // Get business hours
  getBusinessHours: async () => {
    const response = await api.get('/settings/business-hours');
    return response.data;
  },

  // Update business hours
  updateBusinessHours: async (hours) => {
    const response = await api.put('/settings/business-hours', hours);
    return response.data;
  }
};

// System Health API endpoints
export const systemHealthApi = {
  // Get overall system health
  getSystemHealth: async () => {
    const response = await api.get('/system/health');
    return response.data;
  },

  // Get webhook health status
  getWebhookHealth: async () => {
    const response = await api.get('/system/webhooks/health');
    return response.data;
  },

  // Test webhook endpoints
  testWebhooks: async () => {
    const response = await api.post('/system/webhooks/test');
    return response.data;
  }
};

// Number Porting API endpoints
export const numberPortingApi = {
  // Get business setup information
  getBusinessSetupInfo: async () => {
    const response = await api.get('/number-porting/business-info');
    return response.data;
  },

  // Update business setup information
  updateBusinessSetupInfo: async (businessInfo) => {
    const response = await api.put('/number-porting/business-info', businessInfo);
    return response.data;
  },

  // Get setup options
  getSetupOptions: async () => {
    const response = await api.get('/number-porting/setup-options');
    return response.data;
  },

  // Submit setup request
  submitSetupRequest: async (setupData) => {
    const response = await api.post('/number-porting/setup-request', setupData);
    return response.data;
  },

  // Get setup status
  getSetupStatus: async () => {
    const response = await api.get('/number-porting/setup-status');
    return response.data;
  }
};

// Admin API endpoints (require admin role)
export const adminApi = {
  // Setup ported number (Admin only)
  setupPortedNumber: async (setupData) => {
    const response = await api.post('/admin/setup-ported-number', setupData);
    return response.data;
  },

  // Setup tracking number (Admin only)
  setupTrackingNumber: async (setupData) => {
    const response = await api.post('/admin/setup-tracking-number', setupData);
    return response.data;
  },

  // Setup hybrid numbers (Admin only)
  setupHybridNumbers: async (setupData) => {
    const response = await api.post('/admin/setup-hybrid-numbers', setupData);
    return response.data;
  },

  // Get all business setups (Admin only)
  getAllSetups: async () => {
    const response = await api.get('/admin/all-setups');
    return response.data;
  },

  // Get ported numbers (Admin only)
  getPortedNumbers: async () => {
    const response = await api.get('/admin/ported-numbers');
    return response.data;
  },

  // Update business setup (Admin only)
  updateBusinessSetup: async (businessId, setupData) => {
    const response = await api.put(`/admin/business-setup/${businessId}`, setupData);
    return response.data;
  }
};

// Webhook Health API endpoints
export const webhookHealthApi = {
  // Check voice webhook health
  checkVoiceHealth: async () => {
    const response = await api.get('/webhooks/voice/health');
    return response.data;
  },

  // Check SMS webhook health
  checkSMSHealth: async () => {
    const response = await api.get('/webhooks/sms/health');
    return response.data;
  },

  // Check porting webhook health
  checkPortingHealth: async () => {
    const response = await api.get('/webhooks/porting/health');
    return response.data;
  }
};

// Utility functions
export const callTrackingUtils = {
  // Handle API errors
  handleApiError: (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'An error occurred';
      const status = error.response.status;
      return { message, status, data: error.response.data };
    } else if (error.request) {
      // Request was made but no response received
      return { message: 'No response from server', status: 0, data: null };
    } else {
      // Something else happened
      return { message: error.message || 'Unknown error', status: 0, data: null };
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },

  // Get current user
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Get current business ID
  getCurrentBusinessId: () => {
    const user = callTrackingUtils.getCurrentUser();
    return user?.businessId || null;
  },

  // Format phone number for display
  formatPhoneNumber: (phoneNumber) => {
    if (!phoneNumber) return '';
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phoneNumber;
  },

  // Format currency
  formatCurrency: (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  },

  // Format date
  formatDate: (date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }
};

export default api; 