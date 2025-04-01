import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 15000, // 15 second timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Log the request for debugging
    console.log('🚀 API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });
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
    console.log('✅ API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    // Check if network is available
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('❌ Request error:', error.request);
      
      // Check if CORS or security software might be blocking the request
      if (error.message?.includes('Network Error') || error.message?.includes('ERR_BLOCKED')) {
        console.error('🛡️ Possible security software or firewall blocking detected');
        return Promise.reject({
          response: {
            status: 0,
            data: { 
              error: 'Connection blocked. Your security software (like Kaspersky) might be blocking this request. Consider adding this site to your trusted sites or temporarily disabling the web protection.'
            }
          }
        });
      }
      
      // Handle timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return Promise.reject({
          response: {
            status: 408,
            data: { error: 'Request timed out. Please try again or check your connection.' }
          }
        });
      }
      
      return Promise.reject({
        response: {
          status: 0,
          data: { error: 'Unable to reach the server. Please check your connection or try again later.' }
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
