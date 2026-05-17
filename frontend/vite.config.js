import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // ✅ Gzip compression for all assets > 1 kB
    compression({ algorithm: 'gzip', ext: '.gz', deleteOriginFile: false }),
    // ✅ Brotli compression (better than Gzip – modern browsers)
    compression({ algorithm: 'brotliCompress', ext: '.br', deleteOriginFile: false }),
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.warn'],
      },
      mangle: { safari10: true },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 🚀 PRIORITY: Editor (heavy, must not bleed into react core via @lexical/react)
            if (id.includes('lexical') || id.includes('@lexical') || id.includes('prismjs')) {
              return 'vendor-editor';
            }
            // React Core – tiny, cached forever (safeguard against substring matches like @lexical/react)
            if (id.includes('/react/') || id.includes('/react-dom/')) {
              return 'vendor-react';
            }
            // Router
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // Icons – tree-shaken by Vite automatically
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Socket
            if (id.includes('socket.io')) {
              return 'vendor-socket';
            }
            // Utils
            if (id.includes('axios') || id.includes('date-fns') || id.includes('idb')) {
              return 'vendor-utils';
            }
            // PDF export (dynamically imported at runtime – stays separate)
            if (id.includes('html2pdf') || id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-pdf';
            }
            // Everything else vendor
            return 'vendor-misc';
          }
        },
        // Long-term cache-friendly filenames
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(name ?? '')) {
            return 'assets/img/[name]-[hash][extname]';
          }
          if (/\.css$/i.test(name ?? '')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[ext]/[name]-[hash][extname]';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: true,
  },
});
