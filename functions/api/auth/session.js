import { isAuthorized, json } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  return json({ authenticated: await isAuthorized(request, env) });
}
