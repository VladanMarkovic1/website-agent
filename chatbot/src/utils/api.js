import axios from 'axios';

const API_URL = 'http://localhost:5000'; // Your backend server URL

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
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

export default api; 