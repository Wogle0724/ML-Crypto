/**
 * frontend/vite.config.js — Vite dev server config. Port 3000.
 *
 * PROXY:
 *   The Vite dev server runs inside the frontend container on port 3000.
 *   Any browser request to /api/* is intercepted by Vite and forwarded to
 *   BACKEND_URL (set to http://backend:4000 by docker-compose.yml environment block).
 *
 *   Data flow:
 *     Browser → Vite proxy (/api/*) → backend container:4000 (backend/index.js)
 *
 *   This is why frontend/src/api/index.js can use baseURL '/api' without
 *   ever knowing the backend's real container hostname — Vite handles routing.
 *
 * RELATED FILES:
 *   frontend/src/api/index.js        — axios instance with baseURL '/api'
 *   frontend/src/pages/Dashboard.jsx — fires the actual GET /api/* calls on mount
 *   backend/index.js                 — Express server receiving those proxied calls
 *   docker-compose.yml               — sets BACKEND_URL=http://backend:4000
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
