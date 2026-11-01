import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  // Use /nse-trading-intelligence/ for GitHub Pages production build,
  // or respect VITE_BASE_PATH if provided, or '/' for local development server.
  const isProd = mode === 'production' || process.env.NODE_ENV === 'production';
  const base = process.env.VITE_BASE_PATH || (isProd ? '/nse-trading-intelligence/' : '/');

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
