import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Get API target from environment or default to 4200
const API_PORT = process.env.OPENFANG_API_PORT || '4200'
const API_HOST = process.env.OPENFANG_API_HOST || '127.0.0.1'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://${API_HOST}:${API_PORT}`,
        changeOrigin: true,
        // Log proxy errors for debugging
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.warn('[Vite Proxy] Error:', err.message)
          })
        }
      },
      '/ws': {
        target: `ws://${API_HOST}:${API_PORT}`,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  }
})
