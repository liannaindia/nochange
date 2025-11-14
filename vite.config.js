import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,        // 或者使用 8080，确保端口正常
    host: '0.0.0.0',    // 监听所有网络接口
  },
  preview: {
    allowedHosts: ['bharatx.netlify.app']  // 允许指定的主机访问
  }
})
