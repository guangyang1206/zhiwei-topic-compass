import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 前端源码在 web/，构建产物输出到上级的 dist/（EdgeOne outputDirectory 指向它）。
// 本地开发时把 /api 代理到本地 Hono dev-server（端口 8788）。
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8788',
    },
  },
});
