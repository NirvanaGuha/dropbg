// DropBG API worker: HD Refine for Pro customers.
// POST /refine  (body = original image bytes, X-License-Key header) -> PNG with background removed by BiRefNet.
// GET  /health  -> configuration status.

const POLAR_VALIDATE = 'https://api.polar.sh/v1/customer-portal/license-keys/validate';
const REPLICATE = 'https://api.replicate.com/v1';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return json({ ok: true, refine: Boolean(env.REPLICATE_API_TOKEN), polar: Boolean(env.POLAR_ORG_ID), model: env.REPLICATE_MODEL }, 200, cors);
    }
    // Pro waitlist: POST /waitlist {email}  |  GET /waitlist/export (Bearer EXPORT_TOKEN) -> CSV
    if (url.pathname === '/waitlist' && request.method === 'POST') return waitlistAdd(request, env, cors, origin);
    if (url.pathname === '/waitlist/export' && request.method === 'GET') return waitlistExport(request, env);

    if (url.pathname !== '/refine' || request.method !== 'POST') return json({ error: 'Not found' }, 404, cors);
    if (!isAllowedOrigin(origin, env)) return json({ error: 'Origin not allowed' }, 403, cors);
    if (!env.REPLICATE_API_TOKEN || !env.POLAR_ORG_ID) return json({ error: 'HD Refine is not configured yet.' }, 503, cors);

    // 1. Licence check (server-side, so a forged client cannot skip it).
    const key = (request.headers.get('X-License-Key') || '').trim();
    if (!key) return json({ error: 'Missing licence key.' }, 401, cors);
    const lic = await fetch(POLAR_VALIDATE, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, organization_id: env.POLAR_ORG_ID, increment_usage: 1 }),
    });
    if (lic.status === 404) return json({ error: 'Licence key not found.' }, 402, cors);
    if (!lic.ok) return json({ error: `Licence check failed (${lic.status}).` }, 502, cors);
    const licData = await lic.json();
    if (licData.status !== 'granted') return json({ error: `Licence is ${licData.status}.` }, 402, cors);

    // Fair-use cap: N HD refines per key per calendar month (UTC). Bounds the only variable cost.
    const cap = Number(env.REFINE_MONTHLY_CAP || 300);
    const month = new Date().toISOString().slice(0, 7);
    const capKey = `refine:${licData.id}:${month}`;
    const used = Number((await env.WAITLIST.get(capKey)) || 0);
    if (used >= cap) return json({ error: `You've used this month's ${cap} HD Refines. The counter resets on the 1st. Standard removal stays unlimited.` }, 429, cors);
    await env.WAITLIST.put(capKey, String(used + 1), { expirationTtl: 40 * 24 * 3600 });

    // 2. Read the image.
    const max = Number(env.MAX_BYTES || 20000000);
    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > max) return json({ error: `Image too large (max ${Math.round(max / 1e6)} MB).` }, 413, cors);
    const type = request.headers.get('Content-Type') || 'application/octet-stream';
    if (!type.startsWith('image/')) return json({ error: 'Body must be an image.' }, 415, cors);
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > max) return json({ error: 'Image too large.' }, 413, cors);

    // 3. Upload to Replicate Files (data URIs are limited to small payloads), then predict.
    const auth = { Authorization: `Bearer ${env.REPLICATE_API_TOKEN}` };
    const form = new FormData();
    form.append('content', new Blob([bytes], { type }), 'input.' + (type.split('/')[1] || 'bin').replace('jpeg', 'jpg'));
    const up = await fetch(`${REPLICATE}/files`, { method: 'POST', headers: auth, body: form });
    if (!up.ok) return json({ error: `Upload failed (${up.status}).` }, 502, cors);
    const fileUrl = (await up.json()).urls?.get;

    let pred = await (await fetch(`${REPLICATE}/models/${env.REPLICATE_MODEL}/predictions`, {
      method: 'POST', headers: { ...auth, 'Content-Type': 'application/json', Prefer: 'wait=60' },
      body: JSON.stringify({ input: { image: fileUrl } }),
    })).json();

    const deadline = Date.now() + 90_000;
    while (pred.status && !['succeeded', 'failed', 'canceled'].includes(pred.status) && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 1200));
      pred = await (await fetch(pred.urls.get, { headers: auth })).json();
    }
    if (pred.status !== 'succeeded') return json({ error: pred.error || `Model ${pred.status || 'error'}.` }, 502, cors);

    const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
    const img = await fetch(out);
    if (!img.ok) return json({ error: 'Could not fetch result.' }, 502, cors);
    return new Response(img.body, { status: 200, headers: { ...cors, 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Prediction-Id': pred.id || '' } });
  },
};

async function waitlistAdd(request, env, cors, origin) {
  if (!isAllowedOrigin(origin, env)) return json({ error: 'Origin not allowed' }, 403, cors);
  if (!env.WAITLIST) return json({ error: 'Waitlist not configured.' }, 503, cors);
  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'Bad request.' }, 400, cors); }
  if (body.website) return json({ ok: true }, 200, cors); // honeypot filled by a bot: pretend success
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return json({ error: 'That email address does not look right.' }, 422, cors);
  const existing = await env.WAITLIST.get(email);
  if (!existing) {
    await env.WAITLIST.put(email, JSON.stringify({
      ts: new Date().toISOString(),
      source: String(body.source || '').slice(0, 60),
      country: request.cf?.country || '',
      ua: (request.headers.get('User-Agent') || '').slice(0, 160),
    }));
  }
  return json({ ok: true, already: Boolean(existing) }, 200, cors);
}
async function waitlistExport(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.EXPORT_TOKEN || auth !== `Bearer ${env.EXPORT_TOKEN}`) return new Response('Unauthorized', { status: 401 });
  const rows = ['email,joined_at,source,country'];
  let cursor;
  do {
    const page = await env.WAITLIST.list({ cursor, limit: 1000 });
    for (const k of page.keys) {
      const v = JSON.parse((await env.WAITLIST.get(k.name)) || '{}');
      rows.push([k.name, v.ts || '', v.source || '', v.country || ''].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return new Response(rows.join('\n') + '\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function isAllowedOrigin(origin, env) {
  return (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).includes(origin);
}
function corsHeaders(origin, env) {
  const h = { 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-License-Key', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
  if (isAllowedOrigin(origin, env)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
