import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 1. Core Frameworks (Critical)
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            // 2. Editor Engine (Heavy - only loaded for Editor)
            if (id.includes('lexical')) {
              return 'vendor-lexical';
            }
            // 3. Icons (Large collection)
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // 4. Networking & Utilities
            if (id.includes('axios') || id.includes('socket.io-client') || id.includes('date-fns')) {
              return 'vendor-utils';
            }
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});

