import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatWidget from './components/ChatWidget';
import './index.css';

// Function to initialize the chatbot
export function initDentalChatbot(config) {
  // Create container for the chatbot if it doesn't exist
  let container = document.getElementById('dental-chatbot-widget');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dental-chatbot-widget';
    document.body.appendChild(container);
  }

  // Create React root and render the chatbot
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ChatWidget
        businessId={config.businessId}
        backendApiUrl={config.backendApiUrl}
        position={config.position || 'bottom-right'}
        buttonText={config.buttonText || 'Chat with us'}
        primaryColor={config.primaryColor || '#4F46E5'}
      />
    </React.StrictMode>
  );

  // Return cleanup function
  return () => {
    root.unmount();
    container.remove();
  };
}

// Auto-initialize if config is present in window
if (window.myChatbotConfig) {
  // Ensure backendApiUrl is included in the config passed
  const defaultConfig = {
    position: 'bottom-right',
    buttonText: 'Chat with us',
    primaryColor: '#4F46E5',
    // Add other defaults as needed
  };
  const config = { ...defaultConfig, ...window.myChatbotConfig };

  if (!config.businessId) {
    console.error("Chatbot Error: businessId is missing in window.myChatbotConfig");
  } else if (!config.backendApiUrl) {
    // Decide on fallback or error for backend URL
    // Option 1: Error out
    console.error("Chatbot Error: backendApiUrl is missing in window.myChatbotConfig");
    // Option 2: Use a default (less ideal for multi-tenant)
    // config.backendApiUrl = 'http://localhost:8080/api/v1'; // Example default
    // initDentalChatbot(config);
  } else {
    initDentalChatbot(config);
  }
}

// Export for manual initialization
export default { initDentalChatbot }; 