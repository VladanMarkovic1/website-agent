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
      fileName: () => 'dental-chatbot.js',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        extend: true,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'dental-chatbot.css';
          }
          return assetInfo.name;
        },
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    cssCodeSplit: false,
    minify: 'terser',
    sourcemap: true
  },
}); 