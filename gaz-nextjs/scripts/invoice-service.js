const http = require('http');

const PORT = Number(process.env.PORT || 8087);
const APP_BASE_URL = (process.env.APP_BASE_URL || 'http://calculatorgaz').replace(/\/+$/, '');
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > 20 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const writeJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const proxyRaw = async (targetPath, method, body, contentType) => {
  const headers = { 'X-Internal-Api-Key': INTERNAL_API_KEY };
  if (contentType) headers['Content-Type'] = contentType;
  const response = await fetch(`${APP_BASE_URL}${targetPath}`, {
    method,
    headers,
    body
  });
  const text = await response.text();
  return {
    status: response.status,
    contentType: response.headers.get('content-type') || 'application/json; charset=utf-8',
    body: text
  };
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return writeJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && req.url === '/invoices/upload') {
      const contentType = req.headers['content-type'] || '';
      const body = await readBody(req);
      const upstream = await proxyRaw('/api/internal/invoices/upload', 'POST', body, contentType);
      res.writeHead(upstream.status, { 'Content-Type': upstream.contentType });
      return res.end(upstream.body);
    }

    return writeJson(res, 404, { error: 'Not found' });
  } catch (error) {
    return writeJson(res, 500, { error: error.message || 'Unexpected error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`invoice-service listening on ${PORT}`);
});

