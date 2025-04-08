// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  base: '/mywisewallet/',
  plugins: [
    react(),
    visualizer()
  ],
  build: {
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase-core': ['firebase/app', 'firebase/auth'],
          'firebase-db': ['firebase/firestore', 'firebase/storage'],
          'charts': ['recharts', 'chart.js'],
          'ui': ['framer-motion', 'react-icons', 'react-toastify']
        }
      }
    }
  }
})