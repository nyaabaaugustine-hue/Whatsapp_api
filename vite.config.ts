import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'https://apifreellm.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/chat/, '/api/v1/chat'),
          headers: {
            'Authorization': `Bearer ${process.env.VITE_LLM_API_KEY}`
          }
        }
      }
    },
  };
});
