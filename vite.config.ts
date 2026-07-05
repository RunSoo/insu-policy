import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const targetUrl = env.VITE_DIFY_API_TARGET || 'http://3.35.233.247';

  return {
    plugins: [react()],
    server: {
      proxy: {
        // 클라이언트에서 /api/dify 로 요청하면 targetUrl로 프록시 (CORS 우회)
        '/api/dify': {
          target: targetUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/dify/, '')
        }
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(process.cwd(), 'index.html'),
          admin: resolve(process.cwd(), 'admin.html'),
        },
      },
    },
  }
})
