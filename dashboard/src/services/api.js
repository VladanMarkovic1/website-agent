import axios from 'axios';

// Get the API base URL from environment variables
const API_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

if (!API_BACKEND_URL) {
    console.error("Error: VITE_API_BASE_URL is not defined in the environment variables.");
    // Handle this appropriately - maybe show an error message to the user
}

// Create an Axios instance
const apiClient = axios.create({
    baseURL: API_BACKEND_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Axios Interceptor for Authentication ---
// This automatically adds the auth token to requests
apiClient.interceptors.request.use(
    (config) => {
        // Correctly get token from sessionStorage
        const token = sessionStorage.getItem('token'); 
        // console.log('[API Interceptor Request] Using token:', token); 
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('[API Interceptor Request] Error:', error);
        return Promise.reject(error);
    }
);

// --- Axios Interceptor for Response Handling ---
// This handles common response scenarios, like unauthorized errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('[API Interceptor Response] Error:', error.response || error.message);
        if (error.response && error.response.status === 401) {
            console.log('[API Interceptor Response] Unauthorized (401). Logging out.');
            // Correctly remove token from sessionStorage
            sessionStorage.removeItem('token');
            // Remove user info as well
            sessionStorage.removeItem('user');
            // Redirect to login page (Ensure AuthContext handles state cleanup if needed)
            window.location.href = '/login'; 
            // Optionally, you could call a logout function from AuthContext if accessible here
            // Example: import { logout } from './auth'; logout();
        }
        // Return a rejected promise with error details for specific handling in components/services
        return Promise.reject(error.response ? error.response.data : error.message);
    }
);

// --- API Service Functions ---
// Example functions for client management (adapt as needed)

export const fetchClients = async () => {
    try {
        const response = await apiClient.get('/clients');
        return response.data; // Assuming backend returns { success: true, data: [...] }
    } catch (error) {
        console.error("Error fetching clients:", error);
        throw error; // Re-throw the processed error from interceptor
    }
};

export const fetchClientById = async (clientId) => {
    try {
        const response = await apiClient.get(`/clients/${clientId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching client ${clientId}:`, error);
        throw error;
    }
};

export const createClient = async (clientData) => {
    // clientData = { businessName: '...', allowedOrigins: ['...'] }
    try {
        const response = await apiClient.post('/clients', clientData);
        return response.data;
    } catch (error) {
        console.error("Error creating client:", error);
        throw error;
    }
};

export const updateClient = async (clientId, updateData) => {
    try {
        const response = await apiClient.put(`/clients/${clientId}`, updateData);
        return response.data;
    } catch (error) {
        console.error(`Error updating client ${clientId}:`, error);
        throw error;
    }
};

export const deleteClient = async (clientId) => {
    try {
        const response = await apiClient.delete(`/clients/${clientId}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting client ${clientId}:`, error);
        throw error;
    }
};

// You would add other API functions here (e.g., for leads, analytics)

export default apiClient; // Export the configured instance if needed directly 