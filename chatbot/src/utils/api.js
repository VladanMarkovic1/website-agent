import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
const BUSINESS_ID = import.meta.env.VITE_BUSINESS_ID

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Generate a random session ID if not exists
const getSessionId = () => {
  let sessionId = localStorage.getItem('chatSessionId');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2);
    localStorage.setItem('chatSessionId', sessionId);
  }
  return sessionId;
}

export const sendMessage = async (messageText) => {
  try {
    const sessionId = getSessionId();
    const businessId = import.meta.env.VITE_BUSINESS_ID;

    if (!messageText || !sessionId || !businessId) {
      console.error('Missing required fields:', { messageText, sessionId, businessId });
      throw new Error('Missing required fields for chat message');
    }

    console.log('Sending message with:', { messageText, sessionId, businessId });

    const response = await api.post('/chatbot/message', {
      message: messageText,
      sessionId: sessionId,
      businessId: businessId
    });
    
    console.log('Response received:', response.data);
    return response;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
} 