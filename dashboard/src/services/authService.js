import apiClient from './api'; // Import the configured Axios instance
import { clearCSRFToken } from './csrfService.js';

/**
 * Makes an API call to log in a user.
 * @param {object} credentials - User credentials.
 * @param {string} credentials.email - User's email.
 * @param {string} credentials.password - User's password.
 * @returns {Promise<object>} - The response data from the API (e.g., { token, user }).
 */
export const loginUser = async (credentials) => {
    try {
        // Make POST request to the backend login endpoint
        // Adjust '/auth/login' if your backend route is different
        const response = await apiClient.post('/auth/login', credentials);
        return response.data; // Assuming backend returns { success: true, token: '...', user: {...} } on success
    } catch (error) {
        console.error("Error logging in:", error);
        // Error is already processed by the interceptor, re-throw it 
        // or return a specific error structure if needed by AuthContext
        throw error; 
    }
};

/**
 * Makes an API call to register a new user.
 * @param {object} userData - User registration data.
 * @param {string} userData.email - User's email.
 * @param {string} userData.password - User's password.
 * @param {string} userData.businessName - User's business name. 
 * // Add other fields as required by your backend registration endpoint
 * @returns {Promise<object>} - The response data from the API.
 */
export const registerUser = async (userData) => {
    try {
        // Make POST request to the backend registration endpoint
        // Adjust '/auth/register' if your backend route is different
        const response = await apiClient.post('/auth/register', userData);
        return response.data; // Assuming backend returns { success: true, ... } or similar
    } catch (error) {
        console.error("Error registering user:", error);
         // Error is already processed by the interceptor, re-throw it
        throw error;
    }
};

/**
 * Logout user and clear all tokens
 */
export const logoutUser = () => {
    // Clear session storage
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    // Clear CSRF token
    clearCSRFToken();
}; 