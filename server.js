const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'site-content.json');
const SEED_FILE = path.join(ROOT, 'seed', 'seed-main.json');
const PORT = Number(process.env.PORT || 8787);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '99Daedalus991!';
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'spagocci-local-session-secret';
const SESSION_COOKIE = 'spagocci_admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const MIME_TYPES = {
  '.css': 'text/css; charset=UTF-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=UTF-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=UTF-8',
  '.webp': 'image/webp'
};

function json(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=UTF-8',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((pair) => {
        const idx = pair.indexOf('=');
        if (idx < 0) return [pair, ''];
        return [pair.slice(0, idx), decodeURIComponent(pair.slice(idx + 1))];
      })
  );
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function hmac(secret, value) {
  return base64Url(crypto.createHmac('sha256', secret).update(value).digest());
}

function createSessionToken() {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `admin:${issuedAt}`;
  return `${issuedAt}.${hmac(ADMIN_SESSION_SECRET, payload)}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [issuedAtText, signature] = token.split('.');
  const issuedAt = Number.parseInt(issuedAtText, 10);
  if (!issuedAt || !signature) return false;
  if ((Math.floor(Date.now() / 1000) - issuedAt) > SESSION_MAX_AGE) return false;
  return signature === hmac(ADMIN_SESSION_SECRET, `admin:${issuedAt}`);
}

function buildSessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function isAuthorized(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return verifySessionToken(cookies[SESSION_COOKIE]);
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch (_) {
    const seed = await fs.readFile(SEED_FILE, 'utf8');
    await fs.writeFile(DATA_FILE, seed, 'utf8');
  }
}

async function readSiteContent() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

async function saveSiteContent(data) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return data;
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return null;
  return JSON.parse(text);
}

async function fetchTwitterThumb(tweetUrl) {
  const tweetId = String(tweetUrl || '').match(/status\/(\d+)/i)?.[1];
  if (!tweetId) {
    return { ok: false, message: 'Inserisci un URL tweet valido.' };
  }

  const response = await fetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`);
  if (!response.ok) {
    return { ok: false, message: 'Impossibile recuperare i dati da X.' };
  }

  const payload = await response.json();
  const media = Array.isArray(payload?.media_extended) ? payload.media_extended : [];
  const thumbnailUrl = media.find((item) => item?.thumbnail_url)?.thumbnail_url
    || media.find((item) => item?.url)?.url
    || '';

  if (!thumbnailUrl) {
    return { ok: false, message: 'Nessuna thumbnail trovata.' };
  }

  const imageResponse = await fetch(thumbnailUrl);
  if (!imageResponse.ok) {
    return { ok: false, message: 'Download thumbnail non riuscito.' };
  }

  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  return {
    ok: true,
    thumbnail: `data:${contentType};base64,${buffer.toString('base64')}`
  };
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin') pathname = '/admin.html';

  const safePath = path.normalize(path.join(ROOT, pathname.replace(/^\//, '')));
  if (!safePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const file = await fs.readFile(safePath);
    const type = MIME_TYPES[path.extname(safePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'content-type': type,
      'cache-control': 'no-store'
    });
    res.end(file);
  } catch (_) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=UTF-8' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

  try {
    if (url.pathname === '/api/content' && req.method === 'GET') {
      const content = await readSiteContent();
      return json(res, 200, { data: content });
    }

    if (url.pathname === '/api/admin/content' && req.method === 'POST') {
      if (!isAuthorized(req)) return json(res, 401, { error: 'Non autorizzato.' });
      const payload = await readRequestBody(req);
      if (!payload || typeof payload !== 'object') {
        return json(res, 400, { error: 'Payload mancante o non valido.' });
      }
      const saved = await saveSiteContent(payload);
      return json(res, 200, { ok: true, data: saved });
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const payload = await readRequestBody(req);
      const password = String(payload?.password || '');
      if (!password) return json(res, 400, { error: 'Inserisci la password.' });
      if (password !== ADMIN_PASSWORD) return json(res, 401, { error: 'Password non corretta.' });
      const token = createSessionToken();
      return json(res, 200, { ok: true }, { 'set-cookie': buildSessionCookie(token) });
    }

    if (url.pathname === '/api/auth/session' && req.method === 'GET') {
      return json(res, 200, { authenticated: isAuthorized(req) });
    }

    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      return json(res, 200, { ok: true }, { 'set-cookie': clearSessionCookie() });
    }

    if (url.pathname === '/api/admin/twitter-thumb' && req.method === 'POST') {
      if (!isAuthorized(req)) return json(res, 401, { error: 'Non autorizzato.' });
      const payload = await readRequestBody(req);
      const result = await fetchTwitterThumb(payload?.tweetUrl || payload?.tweetId || '');
      if (!result.ok) return json(res, 400, result);
      return json(res, 200, result);
    }

    if (url.pathname.startsWith('/api/')) {
      res.writeHead(404, { 'content-type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ error: 'Endpoint non trovato.' }));
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    json(res, 500, { error: error.message || 'Errore server.' });
  }
});

server.listen(PORT, () => {
  console.log(`SPAGOCCi locale in ascolto su http://localhost:${PORT}`);
});
