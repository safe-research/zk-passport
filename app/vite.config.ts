import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
      include: ['buffer', 'process', 'util', 'stream', 'crypto'],
      // Whether to polyfill specific globals.
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  server: {
    port: 3000,
    host: true,
    headers: {
      // CORS headers for Safe App integration
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      // Allow iframe embedding for Safe Apps
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self' https://app.safe.global https://*.safe.global;",
    },
  },
  preview: {
    port: 3000,
    host: true,
    headers: {
      // Same headers for production preview
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self' https://app.safe.global https://*.safe.global;",
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          wagmi: ['wagmi', 'viem'],
          safe: ['@safe-global/protocol-kit', '@safe-global/safe-apps-sdk'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'wagmi', 'viem'],
    exclude: ['@safe-global/protocol-kit'],
  },
})
