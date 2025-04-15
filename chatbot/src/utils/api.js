import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'; // Your backend server URL
const BUSINESS_ID = import.meta.env.VITE_BUSINESS_ID;
const API_KEY = import.meta.env.VITE_BACKEND_API_KEY; // Get the API key from env

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    // Add the API key to default headers if available
    ...(API_KEY && { 'x-api-key': API_KEY })
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Fetch chat history for a business
export const fetchChatHistory = async (businessId) => {
  try {
    const response = await api.get(`/chatbot/history/${businessId}`);
    return response;
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return [];
  }
};

// Save chat message
export const saveMessage = async (businessId, message) => {
  try {
    const response = await api.post(`/chatbot/message`, {
      businessId,
      ...message,
    });
    return response;
  } catch (error) {
    console.error('Failed to save message:', error);
    throw error;
  }
};

export const sendChatMessage = async (messageText) => {
  try {
    // Ensure businessId is passed correctly, maybe in the body or headers
    // The current implementation sends it as a query param, which is fine if backend expects it
    const response = await api.post(`/chatbot/message?businessId=${BUSINESS_ID}`, {
      message: messageText,
      businessId: BUSINESS_ID // Also include businessId in the body if needed by controller
    });
    return response;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const triggerScraping = async () => {
  try {
    const response = await api.get(`/scraper/${BUSINESS_ID}`);
    return response;
  } catch (error) {
    console.error('Scraping Error:', error);
    throw error;
  }
};

export default api; 