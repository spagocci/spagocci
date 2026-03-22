import { isAuthorized, json } from '../../_lib/auth.js';

async function saveContent(env, data) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/site_content?on_conflict=slug`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({
      slug: 'main',
      data,
      updated_at: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Salvataggio Supabase non riuscito.');
  }

  return data;
}

export async function onRequestPost({ request, env }) {
  if (!(await isAuthorized(request, env))) {
    return json({ error: 'Non autorizzato.' }, { status: 401 });
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Configura SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY su Cloudflare.' }, { status: 500 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: 'JSON non valido.' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return json({ error: 'Payload mancante.' }, { status: 400 });
  }

  try {
    const data = await saveContent(env, payload);
    return json({ ok: true, data });
  } catch (error) {
    return json({ error: error.message || 'Salvataggio non riuscito.' }, { status: 500 });
  }
}
