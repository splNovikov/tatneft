import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~app': path.resolve(__dirname, './src/app'),
      '~pages': path.resolve(__dirname, './src/pages'),
      '~widgets': path.resolve(__dirname, './src/widgets'),
      '~features': path.resolve(__dirname, './src/features'),
      '~entities': path.resolve(__dirname, './src/entities'),
      '~shared': path.resolve(__dirname, './src/shared'),
    },
  },
  // Ant Design optimizations
  optimizeDeps: {
    include: [
      'antd',
      '@ant-design/icons',
      'react',
      'react-dom',
      'react-router-dom',
    ],
  },
  // CSS configuration for better processing
  css: {
    devSourcemap: true,
  },
  // Build optimizations
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Ant Design into separate chunks for better caching
          'ant-design': ['antd'],
          'ant-icons': ['@ant-design/icons'],
          // Split vendor libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Increase chunk size warning limit for Ant Design
    chunkSizeWarningLimit: 1000,
  },
});
