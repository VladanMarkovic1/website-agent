import React, { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import ChatButton from './ChatButton';
import { initializeSocket } from '../utils/socket';
import { fetchChatHistory } from '../utils/api';

const ChatWidget = ({ businessId, position = 'bottom-right', buttonText, primaryColor }) => {
  const [isOpen, setIsOpen] = useState(true); // Start with chat open
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = initializeSocket(businessId);
    setSocket(newSocket);

    // Load chat history and send initial greeting
    const initialize = async () => {
      setIsLoading(true);
      try {
        setMessages([]);
        
        // Wait for socket connection before sending greeting
        newSocket.on('connect', () => {
          if (!hasGreeted) {
            // Send an empty message to trigger the greeting
            newSocket.emit('message', { 
              businessId,
              message: 'hello'
            });
            setHasGreeted(true);
          }
        });
      } catch (error) {
        console.error('Failed to initialize chat:', error);
      }
      setIsLoading(false);
    };
    initialize();

    // Cleanup socket on unmount
    return () => newSocket.close();
  }, [businessId]);

  // Handle incoming messages
  useEffect(() => {
    if (!socket) return;

    socket.on('message', (message) => {
      setMessages((prevMessages) => [...prevMessages, {
        type: 'assistant',
        content: message.response,
        timestamp: new Date().toISOString(),
        messageType: message.type
      }]);
    });

    return () => {
      socket.off('message');
    };
  }, [socket]);

  // Handle sending messages
  const sendMessage = async (text) => {
    if (!socket || !text.trim()) return;

    const userMessage = {
      type: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    // Send message with session ID (handled by socket initialization)
    socket.emit('message', { 
      businessId,
      message: text
    });
  };

  // Position styles
  const positionStyles = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
  };

  // Auto-hide chat after 5 minutes of inactivity
  useEffect(() => {
    let inactivityTimer;
    
    if (isOpen) {
      inactivityTimer = setTimeout(() => {
        setIsOpen(false);
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, [isOpen, messages]); // Reset timer when new messages arrive

  return (
    <div
      className="fixed z-50"
      style={positionStyles[position]}
    >
      {isOpen ? (
        <ChatWindow
          messages={messages}
          onSendMessage={sendMessage}
          onClose={() => setIsOpen(false)}
          isLoading={isLoading}
          primaryColor={primaryColor}
        />
      ) : (
        <ChatButton
          onClick={() => {
            setIsOpen(true);
            // Send greeting if chat was closed and reopened
            if (!hasGreeted) {
              socket?.emit('message', { 
                businessId,
                message: 'hello'
              });
              setHasGreeted(true);
            }
          }}
          text={buttonText}
          primaryColor={primaryColor}
        />
      )}
    </div>
  );
};

export default ChatWidget; 