import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false, // Smaller build size
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mediapipe: ['@mediapipe/tasks-vision'],
          webgazer: ['webgazer']
        }
      }
    }
  },
  server: {
    host: true, // Allow external connections
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  }
})
