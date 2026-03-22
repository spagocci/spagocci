const SESSION_COOKIE = 'spagocci_admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const encoder = new TextEncoder();

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signValue(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toBase64Url(signature);
}

export async function createSessionToken(secret) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `admin:${issuedAt}`;
  const signature = await signValue(secret, payload);
  return `${issuedAt}.${signature}`;
}

export async function verifySessionToken(secret, token) {
  if (!token || typeof token !== 'string') return false;
  const [issuedAtText, signature] = token.split('.');
  const issuedAt = Number.parseInt(issuedAtText, 10);
  if (!issuedAt || !signature) return false;
  if ((Math.floor(Date.now() / 1000) - issuedAt) > SESSION_MAX_AGE) return false;
  const expected = await signValue(secret, `admin:${issuedAt}`);
  return signature === expected;
}

export function getSessionCookie(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const match = cookies.find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : '';
}

export function buildSessionCookie(token) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function isAuthorized(request, env) {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const token = getSessionCookie(request);
  return verifySessionToken(secret, token);
}

export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=UTF-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}
