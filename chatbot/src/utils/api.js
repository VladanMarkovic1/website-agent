import axios from 'axios'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
const BUSINESS_ID = import.meta.env.VITE_BUSINESS_ID

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const sendMessage = async (messageText) => {
  try {
    const response = await api.post(`/chatbot/message?businessId=${BUSINESS_ID}`, {
      message: messageText
    })
    return response
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
} 