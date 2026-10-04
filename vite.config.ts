import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { handleVoiceStatus, handleVoiceTranscribe } from './server/voiceHandler.ts'
import { handleDbRequest } from './server/dbHandler.ts'

function apiProxyPlugin(): Plugin {
  return {
    name: 'api-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        // 1. Voice proxy routes
        if (url === '/api/voice/status' && req.method === 'GET') {
          await handleVoiceStatus(req, res);
          return;
        }
        if (url === '/api/voice/transcribe' && req.method === 'POST') {
          await handleVoiceTranscribe(req, res);
          return;
        }

        // 2. Database API routes
        if (url?.startsWith('/api/db')) {
          const handled = await handleDbRequest(req, res);
          if (handled) return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), apiProxyPlugin()],
})

