import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handleVoiceStatus, handleVoiceTranscribe, loadEnvFile } from './voiceHandler.ts';
import { handleDbRequest } from './dbHandler.ts';

// Ensure local .env is loaded if present
loadEnvFile();

const PORT = parseInt(process.env.PORT || '10000', 10);
const HOST = '0.0.0.0';
const DIST_DIR = path.resolve(process.cwd(), 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  const pathname = url.split('?')[0];
  const method = req.method?.toUpperCase() || 'GET';

  // 1. API: Voice status & transcribe
  if (pathname === '/api/voice/status' && method === 'GET') {
    await handleVoiceStatus(req, res);
    return;
  }
  if (pathname === '/api/voice/transcribe' && method === 'POST') {
    await handleVoiceTranscribe(req, res);
    return;
  }

  // 2. API: Database routes
  if (pathname.startsWith('/api/db')) {
    const handled = await handleDbRequest(req, res);
    if (handled) return;
  }

  // 3. Static assets from dist/
  if (method === 'GET' || method === 'HEAD') {
    let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(DIST_DIR)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.statusCode = 200;
      if (method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // SPA Fallback: serve dist/index.html
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.statusCode = 200;
      if (method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`[HerDay Production Server] Listening on http://${HOST}:${PORT}`);
  console.log(`Serving static files from: ${DIST_DIR}`);
});
