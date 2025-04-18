import axios from 'axios';

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    console.error("Error: VITE_API_BASE_URL is not defined in the environment variables.");
    // Handle this appropriately - maybe show an error message to the user
}

// Create an Axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- Axios Interceptor for Authentication ---
// This automatically adds the auth token to requests
apiClient.interceptors.request.use(
    (config) => {
        // Attempt to retrieve the token (e.g., from localStorage)
        // Use the key 'token' to match what LoginPage saves
        const token = localStorage.getItem('token'); 
        
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- Axios Interceptor for Response Handling ---
// This handles common response scenarios, like unauthorized errors
apiClient.interceptors.response.use(
    (response) => {
        // Any status code within the range of 2xx cause this function to trigger
        return response; // Simply return successful responses
    },
    (error) => {
        // Any status codes outside the range of 2xx cause this function to trigger
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('API Error Response:', error.response.data);
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);

            if (error.response.status === 401) {
                // Handle unauthorized errors (e.g., redirect to login, clear token)
                console.error("Unauthorized request - logging out or redirecting...");
                localStorage.removeItem('authToken'); // Example: clear token
                // window.location.href = '/login'; // Example: redirect
            }
            // You might want to return a structured error object or re-throw
            // Return the error response data if available
            return Promise.reject(error.response.data || error.message);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('API No Response Error:', error.request);
            return Promise.reject('Network Error: No response received from server.');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('API Request Setup Error:', error.message);
            return Promise.reject(error.message);
        }
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