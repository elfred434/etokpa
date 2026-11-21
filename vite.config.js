import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Cible d'API configurable pour tester un backend distant sans dépendre de son CORS.
const API_PROXY_TARGET = (process.env.TOKPA_API_PROXY_TARGET || 'http://127.0.0.1:8000').trim();

// Configuration de base Vite + React + Tailwind v4
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Ne jamais exposer les source maps en production (fuite du code source).
    sourcemap: false,
  },
  server: {
    host: true, // accessible depuis le réseau (preview distante)
    port: 5173,
    allowedHosts: true,
    // Proxy same-origin : quand VITE_API_BASE_URL=/api, les appels API, les images locales
    // /storage et l'auth Reverb sont relayés vers Laravel depuis le dev server.
    proxy: {
      '/api': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      '/storage': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      '/broadcasting': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
});
