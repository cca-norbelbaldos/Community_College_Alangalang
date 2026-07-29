import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base:'/community-college/',
  plugins: [react()],
  server: {
    host: true,   // expose on the LAN (0.0.0.0) so other devices can reach it
    port: 8888,   // frontend dev-server port (matches the backend CORS allow-list)
    allowedHosts: ['.ts.net', '.tail8ae000.ts.net'],  // allow access via Tailscale hostnames
    // Proxy API calls to the backend so phones/other devices don't need to know
    // the PC's IP. Requests to /api go to the SAME host the page loaded from,
    // and Vite forwards them to the backend on this machine.
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
