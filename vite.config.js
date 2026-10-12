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
    // Proxy same-origin pour les environnements preview : avec VITE_API_BASE_URL=/api,
    // le navigateur appelle /api sur l'origine du dev server, qui relaie vers Laravel.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
});
