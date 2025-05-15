import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
  },
  define: {
    'process.env': {}
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget.jsx'),
      name: 'DentalChatbot',
      formats: ['es'],
      fileName: () => 'dental-chatbot.js'
    },
    rollupOptions: {
      // Remove external and globals - bundle React/ReactDOM
      // external: ['react', 'react-dom'], 
      output: {
        assetFileNames: (assetInfo) => {
          // More robust check: if it's a CSS file, rename it.
          // Assumes only one CSS file due to cssCodeSplit: false
          if (assetInfo.name?.endsWith('.css')) { 
            return 'dental-chatbot.css';
          }
          return assetInfo.name;
        },
        // Remove globals definition
        // globals: {
        //   react: 'React',
        //   'react-dom': 'ReactDOM'
        // }
      }
    },
    minify: 'terser',
    sourcemap: false,
    cssCodeSplit: false
  },
}); 