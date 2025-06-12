/**
 * CSRF Token Service
 * Handles CSRF token generation, caching, and automatic refresh
 */

import axios from 'axios';

class CSRFService {
    constructor() {
        this.token = null;
        this.tokenExpiry = null;
        this.refreshPromise = null;
        
        // Create axios instance for CSRF operations (call tracking endpoints)
        this.csrfApi = axios.create({
            baseURL: (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace('/api/v1', '') + '/api/call-tracking',
            timeout: 10000,
        });

        // Add auth interceptor
        this.csrfApi.interceptors.request.use((config) => {
            const token = sessionStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
    }

    /**
     * Get current CSRF token, refresh if needed
     */
    async getToken() {
        try {
            // Check if we have a valid token
            if (this.token && this.tokenExpiry && new Date() < new Date(this.tokenExpiry)) {
                return this.token;
            }

            // If refresh is already in progress, wait for it
            if (this.refreshPromise) {
                return await this.refreshPromise;
            }

            // Start token refresh
            this.refreshPromise = this.refreshToken();
            const result = await this.refreshPromise;
            this.refreshPromise = null;
            
            return result;
        } catch (error) {
            console.error('❌ Failed to get CSRF token:', error);
            this.refreshPromise = null;
            throw error;
        }
    }

    /**
     * Refresh CSRF token from server
     */
    async refreshToken() {
        try {
            const response = await this.csrfApi.get('/csrf-token');
            
            if (response.data && response.data.csrfToken) {
                this.token = response.data.csrfToken;
                this.tokenExpiry = response.data.expires;
                
                return this.token;
            } else {
                throw new Error('Invalid CSRF token response');
            }
        } catch (error) {
            console.error('❌ Failed to refresh CSRF token:', error);
            this.token = null;
            this.tokenExpiry = null;
            throw error;
        }
    }

    /**
     * Clear stored token (on logout or error)
     */
    clearToken() {
        this.token = null;
        this.tokenExpiry = null;
        this.refreshPromise = null;
    }

    /**
     * Check if token needs refresh (expires in next 5 minutes)
     */
    needsRefresh() {
        if (!this.token || !this.tokenExpiry) {
            return true;
        }
        
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        return new Date(this.tokenExpiry) < fiveMinutesFromNow;
    }

    /**
     * Preemptively refresh token if needed
     */
    async preemptiveRefresh() {
        if (this.needsRefresh() && !this.refreshPromise) {
            try {
                await this.getToken();
            } catch (error) {
                console.warn('⚠️ Preemptive CSRF token refresh failed:', error.message);
            }
        }
    }
}

// Export singleton instance
const csrfService = new CSRFService();

/**
 * Get CSRF token for API requests
 */
export const getCSRFToken = async () => {
    return await csrfService.getToken();
};

/**
 * Clear CSRF token (call on logout)
 */
export const clearCSRFToken = () => {
    csrfService.clearToken();
};

/**
 * Preemptively refresh token if needed
 */
export const refreshCSRFTokenIfNeeded = async () => {
    return await csrfService.preemptiveRefresh();
};

/**
 * Higher-order function to wrap API calls with CSRF protection
 */
export const withCSRFProtection = (apiCall) => {
    return async (...args) => {
        try {
            // Get fresh CSRF token
            const csrfToken = await getCSRFToken();
            
            // Add CSRF token to the request
            if (args[0] && typeof args[0] === 'object') {
                // If first argument is config object, add header
                args[0].headers = {
                    ...args[0].headers,
                    'X-CSRF-Token': csrfToken
                };
            } else {
                // If arguments are individual parameters, we need to modify the API call
                // This depends on the specific API call structure
                console.warn('⚠️ CSRF protection: Unable to add header to API call', apiCall.name);
            }

            return await apiCall(...args);
        } catch (error) {
            // If CSRF error, try refreshing token and retry once
            if (error.response?.data?.code?.includes('CSRF')) {
                console.log('🔄 CSRF error, refreshing token and retrying...');
                csrfService.clearToken();
                
                try {
                    const newToken = await getCSRFToken();
                    
                    if (args[0] && typeof args[0] === 'object') {
                        args[0].headers = {
                            ...args[0].headers,
                            'X-CSRF-Token': newToken
                        };
                    }
                    
                    return await apiCall(...args);
                } catch (retryError) {
                    console.error('❌ CSRF retry failed:', retryError);
                    throw retryError;
                }
            }
            
            throw error;
        }
    };
};

/**
 * Axios interceptor to automatically add CSRF tokens
 */
export const addCSRFInterceptor = (axiosInstance) => {
    // Request interceptor to add CSRF token
    axiosInstance.interceptors.request.use(
        async (config) => {
            // Only add CSRF token for state-changing operations
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase())) {
                try {
                    const csrfToken = await getCSRFToken();
                    config.headers['X-CSRF-Token'] = csrfToken;
                } catch (error) {
                    console.error('❌ Failed to add CSRF token to request:', error);
                    // Continue with request anyway - let server handle the error
                }
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor to handle CSRF errors
    axiosInstance.interceptors.response.use(
        (response) => response,
        async (error) => {
            // Handle CSRF token errors
            if (error.response?.data?.code?.includes('CSRF')) {
                console.log('🔄 CSRF error detected, clearing token');
                csrfService.clearToken();
            }
            
            return Promise.reject(error);
        }
    );
};

export default csrfService; 