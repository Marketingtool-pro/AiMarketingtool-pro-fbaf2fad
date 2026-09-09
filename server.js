'use strict';
/**
 * Minimal, dependency-free static file server for the Expo web export.
 *
 * Why this file exists:
 *   Firebase App Hosting runs this repo on Cloud Run and requires the process
 *   to listen on 0.0.0.0:$PORT (8080). The repo's "npm start" script runs
 *   "expo start", which is the Metro DEVELOPMENT server on port 8081, so the
 *   container never became healthy and every rollout failed with:
 *     "The user-provided container failed to start and listen on the port
 *      defined provided by the PORT=8080 environment variable".
 *
 *   apphosting.yaml now builds with `npm run build` (expo export --platform web)
 *   and starts with `node server.js`, which serves the generated ./dist folder.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');

const PORT = Number.parseInt(process.env.PORT, 10) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8'
};

function headersFor(file) {
  const ext = path.extname(file).toLowerCase();
  const hashed = ext !== '.html' && /(?:_expo|assets|static)/.test(file);
  return {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': hashed
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff'
  };
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
}

function sendFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return notFound(res);
    res.writeHead(200, Object.assign({ 'Content-Length': st.size }, headersFor(file)));
    if (req.method === 'HEAD') return res.end();
    pipeline(fs.createReadStream(file), res, () => {});
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  const qs = req.url.indexOf('?');
  let pathname;
  try {
    pathname = decodeURIComponent(qs === -1 ? req.url : req.url.slice(0, qs));
  } catch (e) {
    return notFound(res);
  }

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('ok');
  }

  const target = path.resolve(ROOT, '.' + pathname);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return notFound(res);

  fs.stat(target, (err, st) => {
    if (!err && st.isDirectory()) return sendFile(req, res, path.join(target, 'index.html'));
    if (!err && st.isFile()) return sendFile(req, res, target);
    // Single-page-app fallback so client-side routes still resolve.
    sendFile(req, res, path.join(ROOT, 'index.html'));
  });
});

server.listen(PORT, HOST, () => {
  console.log('[server] listening on ' + HOST + ':' + PORT + ' serving ' + ROOT);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
