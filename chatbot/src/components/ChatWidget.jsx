import React, { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';
import ChatButton from './ChatButton';
import { initializeSocket } from '../utils/socket';
import { fetchChatHistory } from '../utils/api';

const ChatWidget = ({ businessId, position = 'bottom-right', buttonText, primaryColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = initializeSocket(businessId);
    setSocket(newSocket);

    // Load chat history
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const history = await fetchChatHistory(businessId);
        setMessages(history);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
      setIsLoading(false);
    };
    loadHistory();

    // Cleanup socket on unmount
    return () => newSocket.close();
  }, [businessId]);

  // Handle incoming messages
  useEffect(() => {
    if (!socket) return;

    socket.on('message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
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
    socket.emit('message', { businessId, content: text });
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
          primaryColor={primaryColor}
        />
      ) : (
        <ChatButton
          onClick={() => setIsOpen(true)}
          text={buttonText}
          primaryColor={primaryColor}
        />
      )}
    </div>
  );
};

export default ChatWidget; 