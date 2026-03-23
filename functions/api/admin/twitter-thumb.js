import { isAuthorized, json } from '../../_lib/auth.js';

const VXTWITTER_API = 'https://api.vxtwitter.com/Twitter/status/';
const USER_AGENT = 'SPAGOCCiTube/2.0';

function parseTweetId(tweetUrl) {
  const match = String(tweetUrl || '').match(/status\/(\d+)/i);
  return match ? match[1] : '';
}

function pickThumbUrl(payload) {
  if (Array.isArray(payload?.media_extended)) {
    for (const media of payload.media_extended) {
      if (media?.thumbnail_url) return media.thumbnail_url;
    }
  }

  if (Array.isArray(payload?.mediaURLs)) {
    const imageUrl = payload.mediaURLs.find((item) => /\.(jpg|jpeg|png|webp)(?:$|\?)/i.test(String(item)));
    if (imageUrl) return imageUrl;
  }

  return '';
}

async function fetchTweetThumbUrl(tweetId) {
  const response = await fetch(`${VXTWITTER_API}${tweetId}`, {
    headers: { 'User-Agent': USER_AGENT }
  });

  if (!response.ok) {
    throw new Error(`vxTwitter HTTP ${response.status}`);
  }

  const payload = await response.json();
  return pickThumbUrl(payload);
}

function extToMimeType(url, contentType) {
  if (contentType?.startsWith('image/')) return contentType;
  const normalized = String(url || '').toLowerCase();
  if (normalized.includes('.png')) return 'image/png';
  if (normalized.includes('.webp')) return 'image/webp';
  if (normalized.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function fetchImageAsDataUrl(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: { 'User-Agent': USER_AGENT }
  });

  if (!response.ok) {
    throw new Error(`thumbnail HTTP ${response.status}`);
  }

  const contentType = extToMimeType(imageUrl, response.headers.get('content-type'));
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${contentType};base64,${btoa(binary)}`;
}

export async function onRequestPost({ request, env }) {
  if (!(await isAuthorized(request, env))) {
    return json({ error: 'Non autorizzato.' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: 'JSON non valido.' }, { status: 400 });
  }

  const tweetId = payload?.tweetId || parseTweetId(payload?.tweetUrl);
  if (!tweetId) {
    return json({ error: 'tweetId non valido.' }, { status: 400 });
  }

  try {
    const imageUrl = await fetchTweetThumbUrl(tweetId);
    if (!imageUrl) {
      return json({ ok: false, thumbnail: '', source: 'none', message: 'Nessuna thumbnail trovata su X.' });
    }

    const dataUrl = await fetchImageAsDataUrl(imageUrl);
    return json({ ok: true, thumbnail: dataUrl, source: 'vxtwitter', imageUrl });
  } catch (error) {
    return json({ ok: false, thumbnail: '', source: 'error', error: error.message || 'Recupero thumbnail non riuscito.' }, { status: 502 });
  }
}
