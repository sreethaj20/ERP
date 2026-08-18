import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.png', 'icons/*.png'],
      manifest: {
        name: 'Mercure Enterprise Platform',
        short_name: 'Mercure',
        description: 'Mercure Enterprise Resource Planning Platform',
        theme_color: '#0b0f19',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*$/,
            handler: 'NetworkOnly'
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    host: false,
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://api.signin.mercuresolution.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => /^\/api\/v1/.test(path) ? path : path.replace(/^\/api/, '/api/v1')
      },
      '/ws': {
        target: 'wss://api.signin.mercuresolution.com',
        ws: true,
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'https://api.signin.mercuresolution.com',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/](xlsx|file-saver)[\\/]/.test(id)) {
              return 'vendor-excel';
            }
            if (/[\\/]node_modules[\\/](jspdf|jspdf-autotable|html2canvas)[\\/]/.test(id)) {
              return 'vendor-pdf';
            }
            if (/[\\/]node_modules[\\/](react-icons|lucide-react)[\\/]/.test(id)) {
              return 'vendor-icons';
            }
            if (/[\\/]node_modules[\\/](recharts|d3-shape|d3-scale|d3-path|d3-array|d3-interpolate|d3-color)[\\/]/.test(id)) {
              return 'vendor-charts';
            }
            if (/[\\/]node_modules[\\/](framer-motion)[\\/]/.test(id)) {
              return 'vendor-motion';
            }
            if (/[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run[\\/]router)[\\/]/.test(id)) {
              return 'vendor-router';
            }
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|loose-envify)[\\/]/.test(id)) {
              return 'vendor-react';
            }
            return 'vendor-core';
          }
        }
      }
    }
  }
})
