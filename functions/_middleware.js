import { isAuthorized } from './_lib/auth.js';

function isProtectedPath(pathname) {
  return pathname === '/admin' ||
    pathname === '/admin.html' ||
    pathname.startsWith('/api/admin/');
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!isProtectedPath(url.pathname)) {
    return next();
  }

  if (await isAuthorized(request, env)) {
    return next();
  }

  if (url.pathname.startsWith('/api/admin/')) {
    return new Response(JSON.stringify({ error: 'Non autorizzato.' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=UTF-8' }
    });
  }

  return Response.redirect(`${url.origin}/login.html`, 302);
}
