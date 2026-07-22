import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
            if (/[\\/]node_modules[\\/]react-icons[\\/]/.test(id)) {
              return 'vendor-icons';
            }
            if (/[\\/]node_modules[\\/](react-router|react-router-dom|@remix-run[\\/]router)[\\/]/.test(id)) {
              return 'vendor-router';
            }
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler|loose-envify)[\\/]/.test(id)) {
              return 'vendor-react';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
