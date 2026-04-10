import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    minify: 'terser',
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false,
      clientPort: 5173,
      host: 'localhost',
    }
  },
  optimizeDeps: {
    // Явно исключаем phaser, если он где-то затесался
    exclude: ['phaser']
  }
});
