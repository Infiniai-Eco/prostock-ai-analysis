import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 关键配置：设置基础路径，解决 GitHub Pages 子目录部署时的 404 问题
  base: '/prostock-ai-analysis/',
  define: {
    // 允许在客户端访问 process.env (Vite 默认使用 import.meta.env)
    'process.env': process.env
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});