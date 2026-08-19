import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom', 'recharts'] } }
    }
  },
  server: { port: 5173, host: true }
});
