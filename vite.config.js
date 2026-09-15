import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuration de base Vite + React
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // accessible depuis le réseau (preview distante)
    port: 5173,
  },
});
