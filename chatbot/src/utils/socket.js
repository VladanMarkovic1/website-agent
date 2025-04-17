import { io } from 'socket.io-client';

// Remove the old getSessionId function that used localStorage
// const getSessionId = () => { ... };

export const initializeSocket = (businessId) => {
  // Generate a new, unique session ID for *this specific* chat instance
  const sessionId = crypto.randomUUID(); 
  console.log(`[Socket] Initializing with NEW Session ID: ${sessionId}`);
  
  const socket = io(window.DENTAL_CHATBOT_CONFIG.backendUrl || 'http://localhost:5000', {
    // Pass the unique sessionId and businessId in the query
    query: { businessId, sessionId }, 
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('Connected to chat server with businessId:', businessId);
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    // Try to reconnect with polling if websocket fails
    if (socket.io.opts.transports[0] === 'websocket') {
      socket.io.opts.transports = ['polling', 'websocket'];
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
    if (reason === 'io server disconnect' || reason === 'transport close') {
      // Try to reconnect
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