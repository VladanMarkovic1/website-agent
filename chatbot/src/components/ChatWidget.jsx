import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from './ChatWindow';
import ChatButton from './ChatButton';
import { initializeSocket } from '../utils/socket';

const ChatWidget = ({ businessId, position = 'bottom-right', buttonText, primaryColor }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const hasGreetedRef = useRef(false);
  const messageQueueRef = useRef([]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = initializeSocket(businessId);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      
      // Send greeting if not sent yet
      if (!hasGreetedRef.current) {
        newSocket.emit('message', { 
          businessId,
          message: 'hello'
        });
        hasGreetedRef.current = true;
      }

      // Process any queued messages
      while (messageQueueRef.current.length > 0) {
        const queuedMessage = messageQueueRef.current.shift();
        newSocket.emit('message', queuedMessage);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
      setIsConnected(false);
    };
  }, [businessId]);

  // Handle incoming messages
  useEffect(() => {
    if (!socket) return;

    const messageHandler = (message) => {
      if (message && message.response) {
        setMessages((prevMessages) => {
          // Prevent duplicate messages
          const isDuplicate = prevMessages.some(
            (msg) => msg.content === message.response && 
                    msg.timestamp === message.timestamp
          );
          if (isDuplicate) return prevMessages;

          return [...prevMessages, {
            type: 'assistant',
            content: message.response,
            timestamp: new Date().toISOString(),
            messageType: message.type
          }];
        });
      }
    };

    socket.on('message', messageHandler);

    return () => {
      socket.off('message', messageHandler);
    };
  }, [socket]);

  // Handle sending messages
  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      type: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    
    const messageData = { 
      businessId,
      message: text
    };

    if (socket && isConnected) {
      socket.emit('message', messageData);
    } else {
      // Queue message to be sent when connection is restored
      messageQueueRef.current.push(messageData);
      console.log('Message queued for later sending:', messageData);
    }
  };

  // Position styles
  const positionStyles = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
  };

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
          isConnected={isConnected}
          primaryColor={primaryColor}
        />
      ) : (
        <ChatButton
          onClick={() => {
            setIsOpen(true);
            if (!hasGreetedRef.current && socket && isConnected) {
              socket.emit('message', { 
                businessId,
                message: 'hello'
              });
              hasGreetedRef.current = true;
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