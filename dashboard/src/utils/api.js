import axios from 'axios';
// import { getAuthToken } from '../context/AuthContext.jsx'; // REMOVE this import

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 15000, // 15 second timeout
});

// Sleep function for retry delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token using the exported getter function
    // const token = getAuthToken(); // REMOVE this line
    const token = sessionStorage.getItem('token'); // Get token directly from sessionStorage
    // console.log('API Interceptor - Attaching token:', token); // REMOVED
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add retry count to config
    config.retryCount = config.retryCount || 0;
    // Log the request for debugging
    // console.log('🚀 API Request:', { // REMOVED
    //   url: config.url, // REMOVED
    //   method: config.method, // REMOVED
    //   headers: config.headers, // REMOVED
    //   data: config.data // REMOVED
    // }); // REMOVED
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Helper function to check if network is available
const isOnline = () => {
  return navigator.onLine;
};

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    // console.log('✅ API Response:', { // REMOVED
    //   url: response.config.url, // REMOVED
    //   status: response.status, // REMOVED
    //   data: response.data // REMOVED
    // }); // REMOVED
    return response;
  },
  async (error) => {
    const config = error.config;

    // Check if we should retry the request
    if (config.retryCount < MAX_RETRIES) {
      config.retryCount += 1;

      // If it's a network error or blocked by security software
      if (!error.response || error.message?.includes('Network Error') || 
          error.message?.includes('ERR_BLOCKED') || 
          (error.response?.status === 0)) {
        
        // console.log(`🔄 Retry attempt ${config.retryCount} of ${MAX_RETRIES}...`); // REMOVED
        
        // Wait before retrying
        await sleep(RETRY_DELAY * config.retryCount);
        
        // Try the request again
        return api(config);
      }
    }

    // If we're offline
    if (!isOnline()) {
      console.error('❌ Network error: Device is offline');
      return Promise.reject({
        response: {
          status: 0,
          data: { error: 'You appear to be offline. Please check your internet connection.' }
        }
      });
    }

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('❌ Response error:', {
        url: error.config.url,
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });

      // Handle authentication errors
      if (error.response.status === 401) {
        console.log('🔑 Authentication error - redirecting to login');
        // Clear sessionStorage (AuthProvider useEffect will clear the currentToken variable)
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        // Redirect to login
        if (window.location.pathname !== '/login') { // Avoid redirect loops
            window.location.href = '/login';
        }
        // It's important to return a rejected promise to stop further processing
        return Promise.reject(error);
      }
      
      return Promise.reject(error);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('❌ Request error:', error.request);
      
      // After all retries failed
      if (error.message?.includes('Network Error') || error.message?.includes('ERR_BLOCKED')) {
        return Promise.reject({
          response: {
            status: 0,
            data: { 
              error: 'Connection blocked. Your security software (like Kaspersky) might be blocking this request. Please try:\n' +
                    '1. Adding this site to your trusted sites\n' +
                    '2. Temporarily disabling web protection\n' +
                    '3. Checking your firewall settings'
            }
          }
        });
      }
      
      // Handle timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return Promise.reject({
          response: {
            status: 408,
            data: { error: 'Request timed out. Please try again.' }
          }
        });
      }
      
      return Promise.reject({
        response: {
          status: 0,
          data: { error: 'Unable to reach the server. Please try again later.' }
        }
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('❌ Error:', error.message);
      return Promise.reject({
        response: {
          status: 0,
          data: { error: 'An unexpected error occurred: ' + error.message }
        }
      });
    }
  }
);

export default api;
