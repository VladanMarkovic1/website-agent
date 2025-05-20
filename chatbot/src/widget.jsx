import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatWidget from './components/ChatWidget';
import './index.css';

// Function to fetch the built CSS as a string
async function fetchWidgetCSS() {
  try {
    const response = await fetch('/dental-chatbot-widget.css');
    return await response.text();
  } catch (e) {
    console.error('Failed to fetch widget CSS:', e);
    return '';
  }
}

// Function to initialize the chatbot in Shadow DOM
async function initializeChatbot(config) {
  if (!config || !config.businessId) {
    console.error("Chatbot Error: Missing configuration or businessId.");
    return;
  }
  if (!config.apiKey) {
    console.error("Chatbot Error: Missing apiKey in configuration.");
    return;
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

  // Create Shadow Root
  let shadowRoot = container.shadowRoot;
  if (!shadowRoot) {
    shadowRoot = container.attachShadow({ mode: 'open' });
  }

  // Inject CSS into Shadow Root
  const styleTag = document.createElement('style');
  styleTag.textContent = await fetchWidgetCSS();
  // Remove any previous style tags
  Array.from(shadowRoot.querySelectorAll('style')).forEach(s => s.remove());
  shadowRoot.appendChild(styleTag);

  // Create a div inside shadow root for React to mount
  let reactRootDiv = shadowRoot.getElementById('react-root');
  if (!reactRootDiv) {
    reactRootDiv = document.createElement('div');
    reactRootDiv.id = 'react-root';
    shadowRoot.appendChild(reactRootDiv);
  }

  // Create React root and render the chatbot inside the shadow root
  const root = createRoot(reactRootDiv);
  root.render(
    <React.StrictMode>
      <ChatWidget
        businessId={config.businessId}
        backendUrl={config.backendUrl}
        apiKey={config.apiKey}
        initialPosition={config.position}
        initialButtonText={config.buttonText}
        initialPrimaryColor={config.primaryColor}
      />
    </React.StrictMode>
  );

  // Return cleanup function
  return () => {
    root.unmount();
    container.remove();
  };
}

// --- Auto-initialization Logic ---
const configFromWindow = window.DENTAL_CHATBOT_CONFIG || window.chatbotConfig || null;

if (configFromWindow) {
  initializeChatbot(configFromWindow);
} else {
  const dentalChatbotScriptTagById = document.getElementById('dental-chatbot-script');
  const currentScript = dentalChatbotScriptTagById || document.currentScript;

  if (currentScript && currentScript.dataset.businessId) {
    const configFromAttributes = {
      businessId: currentScript.dataset.businessId,
      apiKey: currentScript.dataset.apiKey,
      backendUrl: currentScript.dataset.backendUrl || 'http://localhost:5000',
      position: currentScript.dataset.position,
      primaryColor: currentScript.dataset.primaryColor,
      buttonText: currentScript.dataset.buttonText
    };
    initializeChatbot(configFromAttributes);
  } else {
    console.error("[Widget Loader] Chatbot configuration not found. Ensure the script tag has id='dental-chatbot-script' and the necessary data attributes, or provide config on window object.");
  }
}

// Export for manual initialization (optional)
// Consider if this global export is needed or if auto-init is sufficient
window.DentalChatbot = { init: initializeChatbot }; 

// Remove default export if auto-init is the primary method
// export default { initDentalChatbot: initializeChatbot }; 