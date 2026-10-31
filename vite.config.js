import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Configuration de base Vite + React + Tailwind v4
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // accessible depuis le réseau (preview distante)
    port: 5173,
    allowedHosts: true,
    // Proxy same-origin : quand VITE_API_BASE_URL=/api, les appels API, les images locales
    // /storage et l'auth Reverb sont relayés vers Laravel depuis le dev server.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/broadcasting': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
