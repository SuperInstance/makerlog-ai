import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    // Split chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // React vendor chunk
          'react-vendor': ['react', 'react-dom'],
          // Separate chunks for major components
          'voice-chat': ['./src/VoiceChat.tsx'],
          'dashboard': ['./src/Dashboard.tsx'],
        },
        // Asset naming for cache busting
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Set chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Target modern browsers for smaller bundle
    target: 'es2020',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
