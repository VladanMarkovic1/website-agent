import axios from 'axios';
import { addCSRFInterceptor, clearCSRFToken } from './csrfService.js';

/**
 * Call Tracking Service
 * Handles all API calls related to call tracking functionality
 * Note: Call tracking routes are mounted at /api/call-tracking (not /api/v1)
 */

// Create a separate axios instance for call tracking API
const callTrackingApi = axios.create({
    baseURL: (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace('/api/v1', '') + '/api/call-tracking',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    timeout: 15000,
});

// Add CSRF protection to all state-changing requests
addCSRFInterceptor(callTrackingApi);

// Add auth interceptor
callTrackingApi.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('❌ Call tracking API request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor
callTrackingApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('🔑 Authentication error - redirecting to login');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            clearCSRFToken(); // Clear CSRF token on auth failure
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Get call tracking analytics
export const getCallTrackingAnalytics = async (businessId, timeframe = '1d') => {
    try {
        const url = `/${businessId}/analytics`;
        
        const response = await callTrackingApi.get(url, {
            params: { timeframe }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Error fetching call tracking analytics:', error);
        console.error('❌ Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: error.config
        });
        throw error;
    }
};

// Get recent calls
export const getRecentCalls = async (businessId, limit = 20, missedOnly = false) => {
    try {
        const response = await callTrackingApi.get(`/${businessId}/recent-calls`, {
            params: { limit, missed_only: missedOnly }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching recent calls:', error);
        throw error;
    }
};

// Get missed calls
export const getMissedCalls = async (businessId, limit = 20) => {
    try {
        const response = await callTrackingApi.get(`/${businessId}/missed-calls`, {
            params: { limit }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching missed calls:', error);
        throw error;
    }
};

// Get SMS conversations
export const getSMSConversations = async (businessId, limit = 20, status = 'all') => {
    try {
        const response = await callTrackingApi.get(`/${businessId}/conversations`, {
            params: { limit, status }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching SMS conversations:', error);
        throw error;
    }
};

// Get phone settings
export const getPhoneSettings = async (businessId) => {
    try {
        const response = await callTrackingApi.get(`/${businessId}/phone-settings`);
        return response.data;
    } catch (error) {
        console.error('Error fetching phone settings:', error);
        throw error;
    }
};

// Update phone settings
export const updatePhoneSettings = async (businessId, settings) => {
    try {
        const response = await callTrackingApi.put(`/${businessId}/phone-settings`, settings);
        return response.data;
    } catch (error) {
        console.error('Error updating phone settings:', error);
        throw error;
    }
};

// Send manual SMS
export const sendManualSMS = async (businessId, phoneNumber, message) => {
    try {
        const response = await callTrackingApi.post(`/${businessId}/send-sms`, {
            phoneNumber,
            message
        });
        return response.data;
    } catch (error) {
        console.error('Error sending manual SMS:', error);
        throw error;
    }
};

// Get call tracking trends for charts
export const getCallTrends = async (businessId, timeframe = '1d') => {
    try {
        const url = `/${businessId}/trends`;
        
        const response = await callTrackingApi.get(url, {
            params: { timeframe }
        });
        return response.data;
    } catch (error) {
        console.error('❌ Error fetching call trends:', error);
        console.error('❌ Trends error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            config: error.config
        });
        throw error;
    }
};

// Helper function to format analytics data for dashboard
export const formatAnalyticsForDashboard = (analyticsData) => {
    if (!analyticsData || !analyticsData.analytics) {
        return null;
    }

    const { calls, sms, leads, summary } = analyticsData.analytics;

    return {
        totalCalls: calls.totalCalls,
        missedCalls: calls.missedCalls,
        smsConversations: sms.total,
        leadsGenerated: leads.totalLeads,
        revenueRecovered: summary.revenue.recovered,
        recoveryRate: summary.revenue.recoveryRate,
        trends: {
            totalCalls: calls.trends?.totalCalls || 0,
            missedCalls: calls.trends?.missedCalls || 0,
            smsConversations: sms.trends?.growth || 0,
            leadsGenerated: leads.trends?.growth || 0,
            revenueRecovered: summary.revenue.trends?.growth || 0,
            recoveryRate: summary.revenue.trends?.recoveryRate || 0
        }
    };
};

// Helper function to format call trends for charts
export const formatCallTrendsForCharts = (trendsData) => {
    if (!trendsData || !trendsData.trends) {
        return [];
    }

    return trendsData.trends.map(trend => ({
        time: trend.hour || trend.date,
        calls: trend.totalCalls,
        answered: trend.answeredCalls,
        missed: trend.missedCalls
    }));
};

// Helper function to format call distribution for pie chart
export const formatCallDistribution = (callsData) => {
    if (!callsData) {
        return [];
    }

    const answered = callsData.totalCalls - callsData.missedCalls;
    const missed = callsData.missedCalls;

    return [
        { name: 'Answered', value: answered, color: '#10B981' },
        { name: 'Missed', value: missed, color: '#EF4444' }
    ];
}; 