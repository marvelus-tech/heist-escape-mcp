import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/mcp')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
