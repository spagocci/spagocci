import { buildSessionCookie, createSessionToken, json } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) {
    return json({ error: 'Configurazione admin incompleta su Cloudflare.' }, { status: 500 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: 'Richiesta non valida.' }, { status: 400 });
  }

  const password = String(payload?.password || '');
  if (!password) {
    return json({ error: 'Inserisci la password.' }, { status: 400 });
  }

  if (password !== env.ADMIN_PASSWORD) {
    return json({ error: 'Password non corretta.' }, { status: 401 });
  }

  const token = await createSessionToken(env.ADMIN_SESSION_SECRET);
  return json({ ok: true }, {
    headers: {
      'set-cookie': buildSessionCookie(token)
    }
  });
}
