/* ================================================================
   API COMPARATOR — server.js
   Standalone Node.js Server + CORS-Bypass Proxy
   ================================================================ */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { HttpsProxyAgent } = require('https-proxy-agent');

const PORT = 7788;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpg',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // ── CORS Headers for all responses ──────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // ── PROXY ENDPOINT (/proxy?url=...) ─────────────────────────────
  if (parsedUrl.pathname === '/proxy') {
    const targetUrl = parsedUrl.query.url;
    if (!targetUrl) {
      res.statusCode = 400;
      res.end('Missing "url" parameter');
      return;
    }

    console.log(`[PROXY] --> ${targetUrl}`);

    const targetParsed = url.parse(targetUrl);
    const lib = targetParsed.protocol === 'https:' ? https : http;

    // Remove headers that might cause the internal API to reject the proxied request
    const bodyLength = parseInt(req.headers['content-length'] || '0');
    const hasBody = bodyLength > 0 || !!req.headers['transfer-encoding'];

    const cleanHeaders = { ...req.headers };
    delete cleanHeaders['host'];
    delete cleanHeaders['origin'];
    delete cleanHeaders['referer'];
    delete cleanHeaders['connection'];
    // Only strip content-length if there is no body — preserving it avoids
    // forced chunked-transfer-encoding, which many APIs (especially DELETE) reject
    if (!hasBody) {
      delete cleanHeaders['content-length'];
    }

    // Check for corporate VPN / system proxy environment variables
    const proxyUrlEnv = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY;
    const requestOptions = {
      method: req.method,
      headers: { ...cleanHeaders, host: targetParsed.host }, 
      rejectUnauthorized: false, // ALLOW self-signed certs (Postman style)
    };
    
    if (proxyUrlEnv) {
      console.log(`[PROXY] Routing outbound request through corporate VPN proxy: ${proxyUrlEnv}`);
      requestOptions.agent = new HttpsProxyAgent(proxyUrlEnv);
    }

    const proxyReq = lib.request(targetUrl, requestOptions, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`[PROXY FAIL] Destination: ${targetUrl}`);
      console.error(`[PROXY FAIL] Reason: ${err.message}`);
      if (err.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        console.error(`[PROXY FAIL] Suggestion: Check if the API requires a specific root certificate.`);
      }
      res.statusCode = 502;
      res.end(`Proxy Error: ${err.message}`);
    });

    // Only pipe a body when one actually exists.
    // Piping a bodyless request causes Node to use chunked encoding,
    // which breaks many DELETE / GET endpoints.
    if (hasBody) {
      req.pipe(proxyReq);
    } else {
      proxyReq.end();
    }
    return;
  }

  // ── STATIC FILE SERVING ─────────────────────────────────────────
  let filePath = path.join(__dirname, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('File not found');
      } else {
        res.statusCode = 500;
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log('───────────────────────────────────────────────────');
  console.log(`🚀 API Comparator Server running at:`);
  console.log(`   http://localhost:${PORT}`);
  console.log('───────────────────────────────────────────────────');
  console.log('Postman Mode (CORS Bypass) ACTIVE via /proxy endpoint');
  console.log('Press Ctrl+C to stop the server');
});
