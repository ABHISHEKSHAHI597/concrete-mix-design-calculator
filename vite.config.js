import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: env.BASE_PATH || './',
    plugins: [react(), tailwindcss()],
    server: {
      host: env.HOST || 'localhost',
      port: Number(env.PORT) || 5173,
      open: false,
    },
    preview: {
      host: env.HOST || 'localhost',
      port: Number(env.PREVIEW_PORT) || 4173,
    },
  };
});
