const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function buildLoader() {
  try {
    // Read the loader script template
    const loaderContent = `
      (function() {
        // Load required scripts
        function loadScript(src) {
          return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Load styles
        function loadStyles() {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'CHATBOT_URL/dental-chatbot.css';
          document.head.appendChild(link);
        }

        // Initialize chatbot
        async function initializeChatbot(config) {
          try {
            // Load React and ReactDOM from CDN
            await Promise.all([
              loadScript('https://unpkg.com/react@18/umd/react.production.min.js'),
              loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js')
            ]);

            // Load our chatbot widget
            await loadScript('CHATBOT_URL/dental-chatbot.umd.js');
            loadStyles();

            // Initialize with config
            window.DentalChatbot.initDentalChatbot(config);
          } catch (error) {
            console.error('Failed to load dental chatbot:', error);
          }
        }

        // Auto-initialize if config is present
        if (window.DENTAL_CHATBOT_CONFIG) {
          initializeChatbot(window.DENTAL_CHATBOT_CONFIG);
        }

        // Expose initialization function
        window.initDentalChatbot = initializeChatbot;
      })();
    `;

    // Minify the loader script
    const minified = await minify(loaderContent, {
      compress: true,
      mangle: true
    });

    // Ensure dist directory exists
    const distDir = path.resolve(__dirname, '../dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir);
    }

    // Write minified loader to dist
    fs.writeFileSync(
      path.resolve(distDir, 'loader.min.js'),
      minified.code
    );

    console.log('Loader script built successfully!');
  } catch (error) {
    console.error('Error building loader script:', error);
    process.exit(1);
  }
}

buildLoader(); 