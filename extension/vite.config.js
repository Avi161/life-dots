import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '@dateEngine': resolve(__dirname, '../frontend/src/utils/dateEngine.js'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  // Dev server: serve popup directly
  root: resolve(__dirname, 'src/popup'),
  server: {
    port: 5174,
  },
});
