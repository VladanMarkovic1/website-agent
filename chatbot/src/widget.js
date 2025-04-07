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
if (window.DENTAL_CHATBOT_CONFIG) {
  initDentalChatbot(window.DENTAL_CHATBOT_CONFIG);
}

// Export for manual initialization
export default { initDentalChatbot }; 