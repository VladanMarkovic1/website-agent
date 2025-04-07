import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000'; // Your backend server URL

// Generate a random session ID
const generateSessionId = () => {
  return 'session_' + Math.random().toString(36).substr(2, 9);
};

// Get or create session ID
const getSessionId = () => {
  let sessionId = localStorage.getItem('chatSessionId');
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem('chatSessionId', sessionId);
  }
  return sessionId;
};

export const initializeSocket = (businessId) => {
  const sessionId = getSessionId();
  
  const socket = io(SOCKET_URL, {
    query: { businessId, sessionId },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('Connected to chat server with businessId:', businessId);
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server initiated disconnect, try to reconnect
      socket.connect();
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Add message event handler for debugging
  socket.on('message', (response) => {
    console.log('Received response:', response);
  });

  return socket;
}; 