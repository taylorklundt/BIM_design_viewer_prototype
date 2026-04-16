import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'demo',
  publicDir: '../public',
  plugins: [react()],
  resolve: {
    alias: {
      '@chrome': resolve(__dirname, 'src/chrome'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'demo/index.html'),
        old: resolve(__dirname, 'demo/old.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    watch: {
      // Use polling so Vite detects file changes from IDE/tool writes
      // that don't always fire native fs events on macOS.
      usePolling: true,
      interval: 300,
    },
  },
  optimizeDeps: {
    exclude: ['web-ifc']
  },
  assetsInclude: ['**/*.wasm']
});
