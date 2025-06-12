import { useState, useEffect, useCallback } from 'react';
import { getCSRFToken, refreshCSRFTokenIfNeeded } from '../services/csrfService.js';

/**
 * React hook for CSRF token management
 * Provides token state and refresh functionality
 */
export const useCSRF = () => {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Fetch CSRF token
     */
    const fetchToken = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const csrfToken = await getCSRFToken();
            setToken(csrfToken);
        } catch (err) {
            console.error('Failed to fetch CSRF token:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Refresh token if needed (preemptive)
     */
    const refreshToken = useCallback(async () => {
        try {
            await refreshCSRFTokenIfNeeded();
            // Get the potentially new token
            const csrfToken = await getCSRFToken();
            setToken(csrfToken);
        } catch (err) {
            console.error('Failed to refresh CSRF token:', err);
            setError(err.message);
        }
    }, []);

    // Auto-fetch token on mount
    useEffect(() => {
        fetchToken();
    }, [fetchToken]);

    // Auto-refresh token every 30 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            refreshToken();
        }, 30 * 60 * 1000); // 30 minutes

        return () => clearInterval(interval);
    }, [refreshToken]);

    return {
        token,
        loading,
        error,
        fetchToken,
        refreshToken
    };
};

/**
 * Hook for components that need to make protected API calls
 * Provides functions wrapped with CSRF protection
 */
export const useProtectedAPI = () => {
    const { token, loading, error } = useCSRF();

    /**
     * Execute a protected API call with automatic CSRF token handling
     */
    const executeProtectedCall = useCallback(async (apiFunction, ...args) => {
        if (!token && !loading) {
            throw new Error('CSRF token not available');
        }

        // Wait for token if still loading
        if (loading) {
            // Simple polling wait
            let attempts = 0;
            while (loading && attempts < 50) { // Max 5 seconds wait
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (!token) {
                throw new Error('Failed to obtain CSRF token');
            }
        }

        return await apiFunction(...args);
    }, [token, loading]);

    return {
        executeProtectedCall,
        csrfReady: !!token,
        csrfLoading: loading,
        csrfError: error
    };
};

export default useCSRF; 