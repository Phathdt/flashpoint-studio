import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/etherscan': {
        target: 'http://placeholder',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/etherscan/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Extract the target URL from the x-target-url header
            const targetUrl = req.headers['x-target-url'] as string
            if (targetUrl) {
              const url = new URL(targetUrl)
              proxyReq.setHeader('host', url.host)
              proxyReq.path = url.pathname + url.search
              // Override the target
              ;(options as { target?: string }).target = url.origin
            }
          })
        },
      },
    },
  },
})
