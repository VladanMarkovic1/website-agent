import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeads } from '../services/leadService';

export const useFetchLeads = (businessId) => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const pollIntervalRef = useRef(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clear interval on unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Core fetching function
  const fetchLeadsInternal = useCallback(async (showLoadingState = true) => {
    if (!businessId) {
      setError('No business ID found. Please log in again.');
      setLoading(false);
      navigate('/login'); // Redirect if no business ID
      return;
    }

    if (isOffline) {
      setError('You are currently offline. Please check your internet connection.');
      setLoading(false);
      return;
    }

    if (showLoadingState) {
      setLoading(true);
    }
    setRefreshing(true);
    setError(''); // Clear previous errors

    try {
      // Call the service function
      const data = await getLeads(businessId);
      // Data structure validated within the service now
      setLeads(data.leads);
      if (data.count === 0) {
        setError('No leads found for your business.'); // Informative message, not necessarily an error state
      }
    } catch (err) {
      console.error('Error in useFetchLeads hook:', err);
      let errorMessage = err.message || 'Failed to fetch leads. Please try again.';

      // Check for specific error scenarios
      if (errorMessage.includes('security software') || errorMessage.includes('blocked')) {
        errorMessage = 'Your security software (like Kaspersky) might be blocking connections to our server. Please add this website to your trusted sites or temporarily disable web protection.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Redirecting to login...';
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else if (err.response?.status === 404) {
         errorMessage = 'Business not found. Please check your login details.';
      }

      setError(errorMessage);
      setLeads([]); // Clear leads on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, navigate, isOffline]); // Dependencies for the fetching logic

  // Effect for initial fetch and polling
  useEffect(() => {
    fetchLeadsInternal(); // Initial fetch

    // Clear previous interval if any
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    // Set up polling only if online
    if (!isOffline) {
      pollIntervalRef.current = setInterval(() => {
        console.log('Polling for new leads...');
        fetchLeadsInternal(false); // Don't show loading state for polls
      }, 30000); // Poll every 30 seconds
    }

    // Cleanup interval on effect change or unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchLeadsInternal, isOffline, retryCount]); // Re-run fetch/polling if businessId, online status, or retryCount changes

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    fetchLeadsInternal(true); // Show loading state on manual refresh
  }, [fetchLeadsInternal]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1); // Increment retry count to trigger useEffect
  }, []);

  return {
    leads,
    setLeads, // Expose setLeads for optimistic updates if needed
    loading,
    error,
    isOffline,
    refreshing,
    handleRefresh,
    handleRetry,
    fetchLeads: fetchLeadsInternal // Expose the core fetch function
  };
}; 