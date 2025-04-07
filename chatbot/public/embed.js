(function() {
  // Create a div to mount the React app
  const chatContainer = document.createElement('div');
  chatContainer.id = 'dental-chat-widget';
  document.body.appendChild(chatContainer);

  // Load React and ReactDOM
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);

  const script2 = document.createElement('script');
  script2.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
  script2.crossOrigin = 'anonymous';
  document.head.appendChild(script2);

  // Load the chatbot component
  const chatScript = document.createElement('script');
  chatScript.src = 'https://your-chatbot-domain.com/chatbot.js';
  chatScript.crossOrigin = 'anonymous';
  document.head.appendChild(chatScript);

  // Initialize the chatbot when all scripts are loaded
  window.addEventListener('load', function() {
    const config = {
      businessId: window.dentalChatConfig?.businessId || 'default',
      position: window.dentalChatConfig?.position || 'bottom-right',
      primaryColor: window.dentalChatConfig?.primaryColor || '#3B82F6',
      buttonText: window.dentalChatConfig?.buttonText || 'Chat with us'
    };

    const root = ReactDOM.createRoot(document.getElementById('dental-chat-widget'));
    root.render(
      React.createElement(window.DentalChatWidget, config)
    );
  });
})(); 