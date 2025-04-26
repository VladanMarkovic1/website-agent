import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatWidget from './components/ChatWidget';
import './index.css';

// Function to initialize the chatbot
function initializeChatbot(config) {
  // Basic validation
  if (!config || !config.businessId) {
    console.error("Chatbot Error: Missing configuration or businessId.");
    return;
  }
  if (!config.apiKey) {
      console.error("Chatbot Error: Missing apiKey in configuration.");
      // Potentially display an error to the user or disable the widget
      return; // Stop initialization if key is missing
  }
  if (!config.backendUrl) {
      console.error("Chatbot Error: Missing backendUrl in configuration.");
      return;
  }

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
        backendUrl={config.backendUrl} // Pass backendUrl
        apiKey={config.apiKey}         // Pass apiKey
        // Pass initial values from config as fallbacks for ChatWidget's dynamic fetching
        initialPosition={config.position} 
        initialButtonText={config.buttonText}
        initialPrimaryColor={config.primaryColor}
      />
    </React.StrictMode>
  );

  // Return cleanup function
  return () => {
    root.unmount();
    // Only remove container if we created it? Optional.
    container.remove(); 
  };
}

// --- Auto-initialization Logic --- 
// Look for config on the window object provided by the host page
const configFromWindow = window.DENTAL_CHATBOT_CONFIG || window.chatbotConfig || null;

if (configFromWindow) {
  // console.log("[Widget Loader] Found config object on window:", configFromWindow); // REMOVED
  initializeChatbot(configFromWindow);
} else {
   // Fallback: Try reading from data attributes of the current script tag
   const currentScript = document.currentScript;
   if (currentScript && currentScript.dataset.businessId) {
        // console.log("[Widget Loader] Found config in data attributes."); // REMOVED
        const configFromAttributes = {
            businessId: currentScript.dataset.businessId,
            apiKey: currentScript.dataset.apiKey, // Will be undefined if not present
            backendUrl: currentScript.dataset.backendUrl || 'http://localhost:5000', // Default if not set
            // Optional: read initial style attributes if needed as fallbacks
            position: currentScript.dataset.position,
            primaryColor: currentScript.dataset.primaryColor,
            buttonText: currentScript.dataset.buttonText
        };
         initializeChatbot(configFromAttributes);
   } else {
       console.error("[Widget Loader] Chatbot configuration not found on window object or script data attributes."); // KEEP
   }
}

// Export for manual initialization (optional)
// Consider if this global export is needed or if auto-init is sufficient
window.DentalChatbot = { init: initializeChatbot }; 

// Remove default export if auto-init is the primary method
// export default { initDentalChatbot: initializeChatbot }; 