import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),  tailwindcss(),  VitePWA({
    registerType: 'autoUpdate', // Mendaftarkan service worker secara otomatis
    manifest: {
      name: 'Kopi Senada',
      short_name: 'Senada',
      description: 'Kopi Senada',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      icons: [
        {
          src: '/icons/pwa-150x150.jpg',
          sizes: '144x144',
          type: 'image/jpg'
        },
        {
          src: '/icons/pwa-150x150.jpg',
          sizes: '150x150',
          type: 'image/jpg'
        }
      ],
    },
  }),],
})
